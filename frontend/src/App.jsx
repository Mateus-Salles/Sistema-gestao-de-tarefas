import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Tasks from "./pages/Tasks"

function App() {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/tarefas" element={<Tasks />} />
            </Routes>

        </BrowserRouter>
    )
}

export default App