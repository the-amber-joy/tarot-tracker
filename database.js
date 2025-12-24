const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

// Use environment variable for data directory, fallback to local ./data
const dataDir = process.env.DB_PATH || path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(path.join(dataDir, "tarot.db"), (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
    initDatabase();
  }
});

// Initialize database schema
function initDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create decks table
    db.run(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(name, user_id)
      )
    `);

    // Create readings table
    db.run(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        spread_name TEXT NOT NULL,
        spread_template_id TEXT,
        deck_name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create cards table (for cards in each reading)
    db.run(`
      CREATE TABLE IF NOT EXISTS reading_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER NOT NULL,
        card_name TEXT NOT NULL,
        position TEXT NOT NULL,
        interpretation TEXT,
        card_order INTEGER NOT NULL,
        position_x REAL,
        position_y REAL,
        rotation REAL DEFAULT 0,
        FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE
      )
    `);

    console.log("Database initialized successfully");
  });
}

module.exports = db;
