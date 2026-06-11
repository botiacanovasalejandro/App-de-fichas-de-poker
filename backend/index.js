const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const partidas = {};

const SALDO_INICIAL = 1000;
const BLINDS = { small: 10, big: 20 };

// ─── UTILIDADES ────────────────────────────────────────────────────────────────

function obtenerJugadoresActivos(partida) {
  return partida.ordenJugadores.filter(
    (id) => partida.jugadores[id]?.estado !== "fold"
  );
}

function obtenerJugadoresPuedenActuar(partida) {
  return partida.ordenJugadores.filter(
    (id) => partida.jugadores[id]?.estado === "activo"
  );
}

function siguienteJugador(partida, desdeId) {
  const activos = obtenerJugadoresPuedenActuar(partida);
  if (activos.length === 0) return null;
  const idx = activos.indexOf(desdeId);
  return activos[(idx + 1) % activos.length];
}

function todosIgualaron(partida) {
  const activos = obtenerJugadoresPuedenActuar(partida);
  return activos.every(
    (id) => partida.jugadores[id].apuestaActual === partida.apuestaMaxima
  );
}

function calcularSidePots(partida) {
  const jugadores = Object.values(partida.jugadores).filter(
    (j) => j.estado !== "fold"
  );

  const aportaciones = jugadores
    .map((j) => ({ nombre: j.nombre, total: j.totalApostadoMano }))
    .sort((a, b) => a.total - b.total);

  const sidePots = [];
  let yaRepartido = 0;

  for (let i = 0; i < aportaciones.length; i++) {
    const nivel = aportaciones[i].total - yaRepartido;
    if (nivel <= 0) continue;

    const elegibles = aportaciones.slice(i).map((a) => a.nombre);
    const cantidad = nivel * (aportaciones.length - i);
    sidePots.push({ cantidad, elegibles });
    yaRepartido = aportaciones[i].total;
  }

  return sidePots;
}

function avanzarFase(salaId) {
  const partida = partidas[salaId];
  const fases = ["preflop", "flop", "turn", "river", "showdown"];
  const idxActual = fases.indexOf(partida.fase);

  const activos = obtenerJugadoresActivos(partida);

  // Si solo queda un jugador, gana directamente
  if (activos.length === 1) {
    resolverGanadorAutomatico(salaId, activos[0]);
    return;
  }

  // Si todos están all-in, ir directo a showdown
  const puedanActuar = obtenerJugadoresPuedenActuar(partida);
  if (puedanActuar.length <= 1 && partida.fase !== "showdown") {
    partida.fase = "showdown";
    partida.sidePots = calcularSidePots(partida);
    io.to(salaId).emit("estado-partida", partida);
    return;
  }

  if (idxActual >= fases.length - 1) return;

  partida.fase = fases[idxActual + 1];

  if (partida.fase === "showdown") {
    partida.sidePots = calcularSidePots(partida);
    io.to(salaId).emit("estado-partida", partida);
    return;
  }

  // Resetear apuestas para la nueva fase
  partida.apuestaMaxima = 0;
  partida.jugadoresActuadoEstaFase = [];
  Object.keys(partida.jugadores).forEach((id) => {
    if (partida.jugadores[id].estado === "activo") {
      partida.jugadores[id].apuestaActual = 0;
    }
  });

  // El turno empieza por el jugador a la izquierda del dealer
  const activos2 = obtenerJugadoresPuedenActuar(partida);
  const idxDealer = activos2.indexOf(partida.dealerId);
  partida.turnoActual = activos2[(idxDealer + 1) % activos2.length];

  io.to(salaId).emit("estado-partida", partida);
}

function resolverGanadorAutomatico(salaId, ganadorId) {
  const partida = partidas[salaId];
  const ganador = partida.jugadores[ganadorId];
  ganador.saldo += partida.pot;
  partida.pot = 0;
  partida.fase = "fin_mano";
  partida.ganador = ganadorId;
  io.to(salaId).emit("estado-partida", partida);
}

function iniciarMano(salaId) {
  const partida = partidas[salaId];
  const ids = Object.keys(partida.jugadores);

  if (ids.length < 2) return;

  // Rotar dealer
  const idxDealer = ids.indexOf(partida.dealerId);
  partida.dealerId = ids[(idxDealer + 1) % ids.length];

  const idxDealerNuevo = ids.indexOf(partida.dealerId);
  const sbId = ids[(idxDealerNuevo + 1) % ids.length];
  const bbId = ids[(idxDealerNuevo + 2) % ids.length];

  // Resetear jugadores
  ids.forEach((id) => {
    partida.jugadores[id].estado = "activo";
    partida.jugadores[id].apuestaActual = 0;
    partida.jugadores[id].totalApostadoMano = 0;
    partida.jugadores[id].esDealer = id === partida.dealerId;
    partida.jugadores[id].esSmallBlind = id === sbId;
    partida.jugadores[id].esBigBlind = id === bbId;
  });

  // Orden de juego desde SB
  const idxSb = ids.indexOf(sbId);
  partida.ordenJugadores = [
    ...ids.slice(idxSb),
    ...ids.slice(0, idxSb),
  ];

  // Cobrar blinds
  const cobrarBlind = (id, cantidad) => {
    const jugador = partida.jugadores[id];
    const real = Math.min(cantidad, jugador.saldo);
    jugador.saldo -= real;
    jugador.apuestaActual = real;
    jugador.totalApostadoMano = real;
    partida.pot += real;
    if (jugador.saldo === 0) jugador.estado = "all-in";
  };

  cobrarBlind(sbId, BLINDS.small);
  cobrarBlind(bbId, BLINDS.big);

  partida.apuestaMaxima = BLINDS.big;
  partida.fase = "preflop";
  partida.ganador = null;
  partida.sidePots = [];
  partida.jugadoresActuadoEstaFase = [];

  // Primer turno: jugador después del BB
  const activos = obtenerJugadoresPuedenActuar(partida);
  const idxBb = activos.indexOf(bbId);
  partida.turnoActual = activos[(idxBb + 1) % activos.length];

  io.to(salaId).emit("estado-partida", partida);
}

// ─── SOCKET.IO ─────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("Conectado:", socket.id);

  // UNIRSE A SALA
  socket.on("unirse-sala", ({ salaId, nombre }) => {
    salaId = String(salaId);
    socket.join(salaId);

    if (!partidas[salaId]) {
      partidas[salaId] = {
        jugadores: {},
        ordenJugadores: [],
        fase: "esperando",
        pot: 0,
        sidePots: [],
        apuestaMaxima: 0,
        turnoActual: null,
        dealerId: null,
        ganador: null,
        jugadoresActuadoEstaFase: [],
        blinds: BLINDS,
      };
    }

    partidas[salaId].jugadores[socket.id] = {
      nombre,
      saldo: SALDO_INICIAL,
      estado: "activo",
      apuestaActual: 0,
      totalApostadoMano: 0,
      esDealer: false,
      esSmallBlind: false,
      esBigBlind: false,
    };

    io.to(salaId).emit("estado-partida", partidas[salaId]);
  });

  // INICIAR PARTIDA
  socket.on("iniciar-partida", (salaId) => {
    salaId = String(salaId);
    const partida = partidas[salaId];
    if (!partida) return;
    if (Object.keys(partida.jugadores).length < 2) return;

    // El primer dealer es el primero que entró
    partida.dealerId = Object.keys(partida.jugadores)[0];
    // Ajustamos para que iniciarMano lo rote al siguiente
    const ids = Object.keys(partida.jugadores);
    partida.dealerId = ids[ids.length - 1];

    iniciarMano(salaId);
  });

  // ACCIÓN DEL JUGADOR
  socket.on("accion", ({ salaId, tipo, cantidad }) => {
    salaId = String(salaId);
    const partida = partidas[salaId];
    if (!partida) return;
    if (partida.turnoActual !== socket.id) return;

    const jugador = partida.jugadores[socket.id];
    if (!jugador || jugador.estado !== "activo") return;

    switch (tipo) {

      case "fold":
        jugador.estado = "fold";
        break;

      case "check":
        if (jugador.apuestaActual !== partida.apuestaMaxima) return;
        break;

      case "call": {
        const diferencia = partida.apuestaMaxima - jugador.apuestaActual;
        const real = Math.min(diferencia, jugador.saldo);
        jugador.saldo -= real;
        jugador.apuestaActual += real;
        jugador.totalApostadoMano += real;
        partida.pot += real;
        if (jugador.saldo === 0) jugador.estado = "all-in";
        break;
      }

      case "raise": {
        cantidad = Number(cantidad);
        if (cantidad <= partida.apuestaMaxima) return;
        const diff = cantidad - jugador.apuestaActual;
        if (diff > jugador.saldo) return;
        jugador.saldo -= diff;
        jugador.apuestaActual = cantidad;
        jugador.totalApostadoMano += diff;
        partida.pot += diff;
        partida.apuestaMaxima = cantidad;
        // Resetear jugadoresActuadoEstaFase para que todos vuelvan a actuar
        partida.jugadoresActuadoEstaFase = [socket.id];
        if (jugador.saldo === 0) jugador.estado = "all-in";
        break;
      }

      case "all-in": {
        const resto = jugador.saldo;
        jugador.apuestaActual += resto;
        jugador.totalApostadoMano += resto;
        partida.pot += resto;
        jugador.saldo = 0;
        jugador.estado = "all-in";
        if (jugador.apuestaActual > partida.apuestaMaxima) {
          partida.apuestaMaxima = jugador.apuestaActual;
          partida.jugadoresActuadoEstaFase = [socket.id];
        }
        break;
      }

      default:
        return;
    }

    // Registrar que este jugador actuó
    if (!partida.jugadoresActuadoEstaFase.includes(socket.id)) {
      partida.jugadoresActuadoEstaFase.push(socket.id);
    }

    // Comprobar si avanzar de fase
    const puedanActuar = obtenerJugadoresPuedenActuar(partida);
    const todosActuaron = puedanActuar.every((id) =>
      partida.jugadoresActuadoEstaFase.includes(id)
    );

    if (todosActuaron && todosIgualaron(partida)) {
      avanzarFase(salaId);
      return;
    }

    // Siguiente turno
    partida.turnoActual = siguienteJugador(partida, socket.id);
    io.to(salaId).emit("estado-partida", partida);
  });

  // DECLARAR GANADOR (showdown)
  socket.on("declarar-ganador", ({ salaId, ganadorId }) => {
    salaId = String(salaId);
    const partida = partidas[salaId];
    if (!partida || partida.fase !== "showdown") return;

    const ganador = partida.jugadores[ganadorId];
    if (!ganador) return;

    // Si hay side pots, repartir el que le corresponde
    if (partida.sidePots.length > 0) {
      partida.sidePots.forEach((pot) => {
        if (pot.elegibles.includes(ganador.nombre)) {
          ganador.saldo += pot.cantidad;
        }
      });
    } else {
      ganador.saldo += partida.pot;
    }

    partida.pot = 0;
    partida.sidePots = [];
    partida.fase = "fin_mano";
    partida.ganador = ganadorId;

    io.to(salaId).emit("estado-partida", partida);
  });

  // NUEVA MANO
    socket.on("nueva-mano", (salaId) => {
        salaId = String(salaId);
        const partida = partidas[salaId];
        if (!partida || partida.fase !== "fin_mano") return;

        // Marcar jugadores sin saldo como eliminados pero mantenerlos
        // para que sigan viendo la sala
        const idsActivos = Object.keys(partida.jugadores).filter(
        (id) => partida.jugadores[id].saldo > 0
        );

        if (idsActivos.length < 2) {
        partida.fase = "esperando";
        io.to(salaId).emit("estado-partida", partida);
        return;
        }

        iniciarMano(salaId);
    });
  // DESCONEXIÓN
    socket.on("disconnect", () => {
        for (const salaId in partidas) {
        const partida = partidas[salaId];
        if (partida.jugadores[socket.id]) {
            partida.jugadores[socket.id].desconectado = true;

            if (partida.turnoActual === socket.id) {
            partida.jugadores[socket.id].estado = "fold";
            partida.turnoActual = siguienteJugador(partida, socket.id);
            }

            io.to(salaId).emit("estado-partida", partida);
            break;
        }
        }
    });

}); 

server.listen(3001, () => console.log("Servidor en puerto 3001"));