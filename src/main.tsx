import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { armAudioUnlock } from "@/lib/audioUnlock";

armAudioUnlock();

createRoot(document.getElementById("root")!).render(<App />);
