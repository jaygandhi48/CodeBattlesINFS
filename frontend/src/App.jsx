import { Navigate, Route, Routes } from "react-router-dom";
import { Lobby } from "./pages/Lobby";
import { Battle } from "./pages/Battle";
import { CreateBattle } from "./pages/CreateBattle";
import { CreateProblem } from "./pages/CreateProblem";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/create" element={<CreateBattle />} />
      <Route path="/admin/problems/new" element={<CreateProblem />} />
      <Route path="/battles/:roomCode" element={<Battle />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
