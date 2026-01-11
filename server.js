// Load environment variables from .env file
import "dotenv/config";

import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { passport, requireAdmin, requireAuth } from "./auth.js";
import { generalLimiter } from "./src/middleware/rate-limiters.js";
import { setupSession } from "./src/middleware/session.js";

// Import route handlers
import adminRoutes from "./src/routes/admin.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import cardsRoutes from "./src/routes/cards.routes.js";
import decksRoutes from "./src/routes/decks.routes.js";
import readingsRoutes from "./src/routes/readings.routes.js";
import spreadsRoutes from "./src/routes/spreads.routes.js";
import statsRoutes from "./src/routes/stats.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts (can be configured later)
    crossOriginEmbedderPolicy: false, // Allow loading external resources
  }),
);

// Validate required environment variables in production
if (process.env.NODE_ENV === "production") {
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.includes("change")
  ) {
    console.error(
      "ERROR: SESSION_SECRET must be set to a secure random value in production!",
    );
    process.exit(1);
  }
}

// Middleware
app.use(express.json({ limit: "10mb" })); // Limit JSON payload size
app.use(cookieParser());

// Serve static tarot card images
app.use(
  "/tarot-images",
  express.static(path.join(__dirname, "public/tarot-images")),
);

// Trust proxy for Fly.io
app.set("trust proxy", 1);

// Setup session
app.use(setupSession());
app.use(passport.initialize());
app.use(passport.session());

// Apply general rate limiting to all API routes
app.use("/api", generalLimiter);

// API Routes

// Health check endpoint for Fly.io
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Mount route handlers
app.use("/api/auth", authRoutes);
app.use("/api/admin", requireAdmin, adminRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/decks", requireAuth, decksRoutes);
app.use("/api/stats", requireAuth, statsRoutes);
app.use("/api/readings", requireAuth, readingsRoutes);
app.use("/api/spreads", spreadsRoutes);

// Serve deployment info
app.get("/deploy.txt", (req, res) => {
  res.sendFile(path.join(__dirname, "deploy.txt"));
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, "client/dist")));

// Serve frontend for all other routes (SPA routing)
app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tarot Stats server running on http://0.0.0.0:${PORT}`);
});
