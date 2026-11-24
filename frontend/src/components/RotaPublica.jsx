import { Navigate } from "react-router-dom";
import { getUsuarioLogado } from "../services/sessao";

function RotaPublica({ children }) {
  if (getUsuarioLogado()) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default RotaPublica;
