import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import CreateRoom from "./pages/CreateRoom.jsx";
import JoinRoom from "./pages/JoinRoom.jsx";
import RoomDashboard from "./pages/RoomDashboard.jsx";
import TVBoard from "./pages/TVBoard.jsx";
import SessionSummary from "./pages/SessionSummary.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/forgot" element={<ForgotPassword />} />
      <Route path="/room/:code" element={<RoomDashboard />} />
      <Route path="/room/:code/tv" element={<TVBoard />} />
      <Route path="/room/:code/summary" element={<SessionSummary />} />
    </Routes>
  );
}
