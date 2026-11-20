import { Navigate } from "react-router-dom";
import { getUsuarioLogado } from "../utils/perfil";

// Login e cadastro: quem já está logado vai direto para o dashboard.
function RotaPublica({ children }) {
  if (getUsuarioLogado()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default RotaPublica;
