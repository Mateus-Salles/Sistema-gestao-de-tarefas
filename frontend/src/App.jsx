import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Clientes from "./pages/Clientes";
import Projetos from "./pages/Projetos";

function App() {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

  const tipoUsuario = usuario?.tipo_usuario?.trim().toLowerCase();

  const ehAdministrador = [
    "administrador",
    "admin",
    "dono"
  ].includes(tipoUsuario);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tarefas" element={<Tasks />} />
        <Route path="/projetos" element={<Projetos />} />

        <Route
          path="/clientes"
          element={
            ehAdministrador ? (
              <Clientes />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;