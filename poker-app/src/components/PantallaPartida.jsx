import { useState } from "react";
import Ficha1 from "../assets/Ficha1.png";
import Ficha5 from "../assets/Ficha5.png";
import Ficha10 from "../assets/Ficha10.png";
import Ficha25 from "../assets/Ficha25.png";
import Ficha100 from "../assets/Ficha100.png";

const FASES = {
  preflop: "Pre-Flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
  showdown: "Showdown",
  fin_mano: "Fin de mano",
};

const FICHAS = [
  { valor: 1,   imagen: Ficha1   },
  { valor: 5,   imagen: Ficha5   },
  { valor: 10,  imagen: Ficha10  },
  { valor: 25,  imagen: Ficha25  },
  { valor: 100, imagen: Ficha100 },
];

export default function PantallaPartida({ partida, miId, salaId, socket }) {
  const [apuestaSeleccionada, setApuestaSeleccionada] = useState(0);

  const jugadores = Object.entries(partida.jugadores);
  const yo = partida.jugadores[miId];
  const esMiTurno = partida.turnoActual === miId;
  const puedoCheck = yo?.apuestaActual === partida.apuestaMaxima;
  const diferencia = partida.apuestaMaxima - (yo?.apuestaActual ?? 0);
  const minimoRaise = partida.apuestaMaxima + 1;

  const accion = (tipo, cantidad) => {
    socket.emit("accion", { salaId, tipo, cantidad });
    setApuestaSeleccionada(0);
  };

  const añadirFicha = (valor) => {
    setApuestaSeleccionada((prev) => prev + valor);
  };

  const declararGanador = (ganadorId) => {
    socket.emit("declarar-ganador", { salaId, ganadorId });
  };

  const nuevaMano = () => {
    socket.emit("nueva-mano", salaId);
  };

  return (
    <div className="pantalla-partida">

      {/* CABECERA */}
      <div className="cabecera">
        <span className="fase-badge">{FASES[partida.fase] ?? partida.fase}</span>
        <span className="pot">🪙 Bote: {partida.pot} €</span>
      </div>

      {/* SIDE POTS */}
      {partida.sidePots?.length > 0 && (
        <div className="side-pots">
          {partida.sidePots.map((sp, i) => (
            <div key={i} className="side-pot">
              Side pot {i + 1}: {sp.cantidad} € — {sp.elegibles.join(", ")}
            </div>
          ))}
        </div>
      )}

      {/* MESA CON JUGADORES */}
      <div className="mesa">
        {jugadores.map(([id, jugador]) => (
          <div
            key={id}
            className={[
              "jugador-carta",
              id === miId ? "yo" : "",
              id === partida.turnoActual ? "turno-activo" : "",
              jugador.estado === "fold" ? "estado-fold" : "",
              jugador.estado === "all-in" ? "estado-allin" : "",
              jugador.desconectado ? "desconectado" : "",
            ].join(" ")}
          >
            <div className="jugador-nombre">
              {jugador.nombre}
              {jugador.esDealer    && <span className="badge dealer">D</span>}
              {jugador.esSmallBlind && <span className="badge sb">SB</span>}
              {jugador.esBigBlind   && <span className="badge bb">BB</span>}
            </div>
            <div className="jugador-saldo">{jugador.saldo} €</div>
            {jugador.apuestaActual > 0 && (
              <div className="jugador-apuesta">Apuesta: {jugador.apuestaActual} €</div>
            )}
            {jugador.estado === "fold"   && <div className="estado-label">FOLD</div>}
            {jugador.estado === "all-in" && <div className="estado-label allin">ALL-IN</div>}

            {partida.fase === "showdown" && jugador.estado !== "fold" && !jugador.desconectado && (
              <button className="boton-ganador" onClick={() => declararGanador(id)}>
                🏆 Ganador
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FIN DE MANO */}
      {partida.fase === "fin_mano" && (
        <div className="fin-mano">
          <h2>🏆 {partida.jugadores[partida.ganador]?.nombre} gana la mano</h2>
          <button className="boton-principal" onClick={nuevaMano}>Nueva mano</button>
        </div>
      )}

      {/* ACCIONES */}
      {esMiTurno && yo?.estado === "activo" &&
        partida.fase !== "showdown" && partida.fase !== "fin_mano" && (
        <div className="zona-acciones">

          {/* FICHAS PARA APOSTAR */}
          <div className="fichas-apuesta">
            {FICHAS.map(({ valor, imagen }) => (
              <button
                key={valor}
                className="ficha-btn"
                onClick={() => añadirFicha(valor)}
                disabled={yo.saldo < valor}
              >
                <img src={imagen} alt={`${valor}€`} />
                <span>+{valor}</span>
              </button>
            ))}
          </div>

          {/* CONTADOR DE APUESTA */}
          <div className="apuesta-contador">
            <span>Apuesta: <strong>{apuestaSeleccionada} €</strong></span>
            <button
              className="boton-secundario"
              onClick={() => setApuestaSeleccionada(0)}
            >
              Limpiar
            </button>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="botones-accion">
            <button className="boton-fold" onClick={() => accion("fold")}>
              Fold
            </button>

            {puedoCheck ? (
              <button className="boton-check" onClick={() => accion("check")}>
                Check
              </button>
            ) : (
              <button
                className="boton-call"
                onClick={() => accion("call")}
                disabled={yo.saldo === 0}
              >
                Call {diferencia} €
              </button>
            )}

            <button
              className="boton-raise"
              onClick={() => accion("raise", apuestaSeleccionada)}
              disabled={apuestaSeleccionada < minimoRaise}
            >
              Raise {apuestaSeleccionada > 0 ? `${apuestaSeleccionada} €` : ""}
            </button>

            <button
              className="boton-allin"
              onClick={() => accion("all-in")}
              disabled={yo.saldo === 0}
            >
              All-in ({yo.saldo} €)
            </button>
          </div>
        </div>
      )}

      {/* ESPERANDO TURNO */}
      {!esMiTurno && partida.fase !== "showdown" && partida.fase !== "fin_mano" && (
        <div className="esperando-turno">
          <p>Turno de <strong>{partida.jugadores[partida.turnoActual]?.nombre}</strong></p>
        </div>
      )}

    </div>
  );
}