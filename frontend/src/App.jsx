import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Tasks from "./pages/Tasks"
import Clientes from "./pages/Clientes"
import Projetos from "./pages/Projetos"

function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tarefas" element={<Tasks />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/projetos" element={<Projetos />} />
            </Routes>

        </BrowserRouter>
    )
}

export default App