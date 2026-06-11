import { useState } from "react";
import Boton from "./components/Boton.jsx";
import PantallaCartas from "./components/PantallaCartas.jsx";
import PantallaFichas from "./components/PantallaFichas.jsx";
import PantallaTodo from "./components/PantallaTodo.jsx";
import PantallaSala from "./components/PantallaSala.jsx";

export default function App() {
  const [pantalla, setPantalla] = useState("menu");
  const [datosSala, setDatosSala] = useState(null);

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
      <div className="menu-header">
        <div className="menu-logo">♠ ♥ ♣ ♦</div>
        <h1 className="menu-titulo">PanchiPoker</h1>
        <p className="menu-subtitulo">Gestiona tu partida desde el móvil</p>
      </div>

      <div className="menu-botones">
        <Boton
          icono="🃏"
          titulo="Cartas"
          descripcion="Gestiona el mazo y el reparto"
          onClick={() => setPantalla("cartas")}
        />
        <Boton
          icono="🪙"
          titulo="Fichas"
          descripcion="Apuestas y bote en tiempo real"
          onClick={() => setPantalla("sala")}
        />
        <Boton
          icono="♠"
          titulo="Partida completa"
          descripcion="Cartas y fichas juntas"
          onClick={() => setPantalla("todo")}
        />
      </div>
    </div>
  );
}