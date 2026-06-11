export default function PantallaEspera({ partida, miId, salaId, socket }) {
  const jugadores = Object.entries(partida.jugadores).filter(
    ([, j]) => !j.desconectado
  );
  const puedoIniciar = jugadores.length >= 2;

  const iniciar = () => {
    socket.emit("iniciar-partida", salaId);
  };

  return (
    <div className="pantalla">
      <h1>Sala: <strong>{salaId}</strong></h1>
      <p className="subtitulo">Comparte el código con los demás jugadores</p>

      <div className="lista-jugadores">
        <h2>Jugadores ({jugadores.length})</h2>
        {jugadores.map(([id, jugador]) => (
          <div key={id} className={`jugador-fila ${id === miId ? "yo" : ""}`}>
            <span>{jugador.nombre}</span>
            <span>{jugador.saldo} €</span>
            {id === miId && <span className="badge">Tú</span>}
          </div>
        ))}
      </div>

      {!puedoIniciar && (
        <p className="aviso">Esperando más jugadores...</p>
      )}

      <button
        className="boton-iniciar"
        onClick={iniciar}
        disabled={!puedoIniciar}
      >
        Iniciar partida
      </button>
    </div>
  );
}