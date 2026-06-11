import { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import PantallaEspera from "./PantallaEspera";
import PantallaPartida from "./PantallaPartida";

export default function PantallaFichas({ volver, salaId, nombre }) {
  const socketRef = useRef(null);
  const [partida, setPartida] = useState(null);
  const [miId, setMiId] = useState(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!salaId || !nombre) return;

    const socket = io(import.meta.env.VITE_SERVER_URL || "http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Conectado:", socket.id);
      setMiId(socket.id);
      setConectado(true);
      socket.emit("unirse-sala", { salaId, nombre });
    });

    socket.on("estado-partida", (estado) => {
      console.log("Estado recibido:", estado);
      setPartida(estado);
    });

    socket.on("disconnect", () => {
      setConectado(false);
    });

    return () => socket.disconnect();
  }, [salaId, nombre]);

  if (!conectado || !partida) {
    return (
      <div className="pantalla">
        <p>Conectando...</p>
      </div>
    );
  }

  const idEfectivo = miId ?? socketRef.current?.id;

  if (!idEfectivo) {
    return (
      <div className="pantalla">
        <p>Conectando...</p>
      </div>
    );
  }

  if (partida.fase === "esperando") {
    return (
      <PantallaEspera
        partida={partida}
        miId={idEfectivo}
        salaId={salaId}
        socket={socketRef.current}
      />
    );
  }

  return (
    <PantallaPartida
      partida={partida}
      miId={idEfectivo}
      salaId={salaId}
      socket={socketRef.current}
    />
  );
}