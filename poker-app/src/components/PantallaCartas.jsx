export default function PantallaCartas({ volver }) {
  return (
    <div className="pantalla">
      <h1>Cartas</h1>
      <button onClick={volver}>Volver</button>
    </div>
  );
}