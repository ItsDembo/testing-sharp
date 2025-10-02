import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize monitoring (no-ops if env not configured)
import "./monitoring/sentry";
import "./monitoring/analytics";

createRoot(document.getElementById("root")!).render(<App />);
