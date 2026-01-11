import Database from "better-sqlite3";
import SqliteStoreFactory from "better-sqlite3-session-store";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const SqliteStore = SqliteStoreFactory(session);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setupSession() {
  // Setup persistent session store
  const dataDir = process.env.DB_PATH || path.join(__dirname, "../../data");
  const sessionDb = new Database(path.join(dataDir, "sessions.db"));

  return session({
    store: new SqliteStore({
      client: sessionDb,
      expired: {
        clear: true,
        intervalMs: 900000, // 15 minutes
      },
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 28,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  });
}

export { setupSession };
