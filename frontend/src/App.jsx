import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Clientes from './pages/Clientes';
import Projetos from './pages/Projetos';
import Usuarios from './pages/Usuarios';
import Modelos from './pages/Modelos';
import AlterarSenha from './pages/AlterarSenha';
import RotaProtegida from './components/RotaProtegida';
import RotaPublica from './components/RotaPublica';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RotaPublica>
              <Login />
            </RotaPublica>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RotaProtegida>
              <Dashboard />
            </RotaProtegida>
          }
        />
        <Route
          path="/tarefas"
          element={
            <RotaProtegida>
              <Tasks />
            </RotaProtegida>
          }
        />
        <Route
          path="/projetos"
          element={
            <RotaProtegida>
              <Projetos />
            </RotaProtegida>
          }
        />
        <Route
          path="/senha"
          element={
            <RotaProtegida>
              <AlterarSenha />
            </RotaProtegida>
          }
        />

        <Route
          path="/clientes"
          element={
            <RotaProtegida somenteAdmin>
              <Clientes />
            </RotaProtegida>
          }
        />
        <Route
          path="/modelos"
          element={
            <RotaProtegida somenteAdmin>
              <Modelos />
            </RotaProtegida>
          }
        />
        <Route
          path="/usuarios"
          element={
            <RotaProtegida somenteAdmin>
              <Usuarios />
            </RotaProtegida>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
