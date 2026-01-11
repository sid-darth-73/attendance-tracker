import { Routes, Route, HashRouter } from "react-router-dom";
import Home from "./Home";
import Status from "./Status";
import "./App.css";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/status" element={<Status />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
