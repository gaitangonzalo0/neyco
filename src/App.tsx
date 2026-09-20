import { BrowserRouter, Routes, Route } from "react-router-dom";
import Tienda from "./pages/Tienda";
import TiendaPPL from "./pages/TiendaPPL";
import AdminApp from "./pages/AdminApp";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Tienda />} />
        <Route path="/reclusos" element={<TiendaPPL />} />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
