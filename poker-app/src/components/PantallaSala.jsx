import { useState } from "react";

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PantallaSala({ volver, onEntrar }) {
  const [modo, setModo] = useState(null); // "crear" | "unirse"
  const [nombre, setNombre] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState(null);
  const [error, setError] = useState("");

  const handleCrear = () => {
    const codigo = generarCodigo();
    setCodigoGenerado(codigo);
    setModo("crear");
  };

  const handleEntrar = () => {
    if (!nombre.trim()) {
      setError("Introduce tu nombre");
      return;
    }

    const salaId = modo === "crear" ? codigoGenerado : codigoInput.trim().toUpperCase();

    if (modo === "unirse" && salaId.length < 4) {
      setError("Introduce un código válido");
      return;
    }

    onEntrar({ salaId, nombre: nombre.trim() });
  };

  // Pantalla de elección inicial
  if (!modo) {
    return (
      <div className="pantalla">
        <h1>Fichas</h1>
        <button className="boton-sala" onClick={handleCrear}>Crear sala</button>
        <button className="boton-sala" onClick={() => setModo("unirse")}>Unirse a sala</button>
        <button onClick={volver}>Volver</button>
      </div>
    );
  }

  return (
    <div className="pantalla">
      <h1>{modo === "crear" ? "Crear sala" : "Unirse a sala"}</h1>

      {modo === "crear" && (
        <div className="codigo-sala">
          <p>Comparte este código con los demás jugadores:</p>
          <h2 className="codigo">{codigoGenerado}</h2>
        </div>
      )}

      {modo === "unirse" && (
      <input
        className="input-sala"
        placeholder="Código de sala"
        value={codigoInput}
        onChange={(e) => setCodigoInput(e.target.value)}
        onBlur={(e) => setCodigoInput(e.target.value.toUpperCase())}
        maxLength={8}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck="false"
      />
      )}

      <input
        className="input-sala"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          setError("");
        }}
        maxLength={20}
      />

      {error && <p className="error">{error}</p>}

      <button className="boton-sala" onClick={handleEntrar}>Entrar</button>
      <button onClick={() => setModo(null)}>Atrás</button>
    </div>
  );
}