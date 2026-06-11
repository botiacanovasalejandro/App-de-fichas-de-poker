export default function Boton({ icono, titulo, descripcion, onClick }) {
  return (
    <button className="boton-menu" onClick={onClick}>
      <span className="boton-icono">{icono}</span>
      <span className="boton-titulo">{titulo}</span>
      <span className="boton-descripcion">{descripcion}</span>
    </button>
  );
}