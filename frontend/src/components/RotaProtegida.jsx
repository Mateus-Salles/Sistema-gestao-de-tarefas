import { Navigate } from "react-router-dom";
import { getUsuarioLogado, ehAdministrador } from "../services/sessao";

function RotaProtegida({ somenteAdmin, children }) {
  const usuario = getUsuarioLogado();

  if (!usuario) {
    return <Navigate to="/" />;
  }

  if (somenteAdmin && !ehAdministrador(usuario)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default RotaProtegida;
