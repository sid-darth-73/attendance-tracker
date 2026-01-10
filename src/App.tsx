import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Status from "./Status";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<Status />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
