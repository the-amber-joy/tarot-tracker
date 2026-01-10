// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { passport, requireAuth, requireAdmin } = require("./auth");
const { setupSession } = require("./src/middleware/session");
const { generalLimiter } = require("./src/middleware/rate-limiters");

// Import route handlers
const authRoutes = require("./src/routes/auth.routes");
const adminRoutes = require("./src/routes/admin.routes");
const cardsRoutes = require("./src/routes/cards.routes");
const decksRoutes = require("./src/routes/decks.routes");
const statsRoutes = require("./src/routes/stats.routes");
const readingsRoutes = require("./src/routes/readings.routes");
const spreadsRoutes = require("./src/routes/spreads.routes");

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
