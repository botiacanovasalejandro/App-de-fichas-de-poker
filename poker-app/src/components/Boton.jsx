export default function Boton({imagen, onClick}){
    return (
        <button className="boton" onClick={onClick}>
            <img src={imagen} alt="boton" />
        </button>
    );
}