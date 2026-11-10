import { Navigate } from "react-router-dom";
import { getUsuarioLogado, ehAdministrador } from "../utils/perfil";

// Só deixa entrar quem está logado.
// Com somenteAdmin, colaboradores são mandados de volta para o dashboard.
function RotaProtegida({ somenteAdmin = false, children }) {
  const usuario = getUsuarioLogado();

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (somenteAdmin && !ehAdministrador(usuario)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RotaProtegida;
