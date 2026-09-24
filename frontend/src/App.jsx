import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import CreateRoom from "./pages/CreateRoom.jsx";
import JoinRoom from "./pages/JoinRoom.jsx";
import RoomDashboard from "./pages/RoomDashboard.jsx";
import TVBoard from "./pages/TVBoard.jsx";
import SessionSummary from "./pages/SessionSummary.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/room/:code" element={<RoomDashboard />} />
      <Route path="/room/:code/tv" element={<TVBoard />} />
      <Route path="/room/:code/summary" element={<SessionSummary />} />
    </Routes>
  );
}
