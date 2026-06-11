import { useState } from "react";
import Boton from "./components/Boton.jsx";
import PantallaCartas from "./components/PantallaCartas.jsx";
import PantallaFichas from "./components/PantallaFichas.jsx";
import PantallaTodo from "./components/PantallaTodo.jsx";
import PantallaSala from "./components/PantallaSala.jsx";

export default function App() {
  const [pantalla, setPantalla] = useState("menu");
  const [datosSala, setDatosSala] = useState(null); // { salaId, nombre }

  if (pantalla === "cartas") {
    return <PantallaCartas volver={() => setPantalla("menu")} />;
  }

  if (pantalla === "sala") {
    return (
      <PantallaSala
        volver={() => setPantalla("menu")}
        onEntrar={(datos) => {
          setDatosSala(datos);
          setPantalla("fichas");
        }}
      />
    );
  }

  if (pantalla === "fichas") {
    return (
      <PantallaFichas
        volver={() => setPantalla("menu")}
        salaId={datosSala?.salaId}
        nombre={datosSala?.nombre}
      />
    );
  }

  if (pantalla === "todo") {
    return <PantallaTodo volver={() => setPantalla("menu")} />;
  }

  return (
    <div className="menu">
      <Boton imagen="/botonCartas.jpg" onClick={() => setPantalla("cartas")} />
      <Boton imagen="/botonFichas.jpg" onClick={() => setPantalla("sala")} />
      <Boton imagen="/botonTodo.jpg" onClick={() => setPantalla("todo")} />
    </div>
  );
}