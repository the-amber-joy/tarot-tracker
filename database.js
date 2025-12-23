const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "tarot.db"), (err) => {
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
    // Create decks table
    db.run(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create readings table
    db.run(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        spread_name TEXT NOT NULL,
        deck_name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE
      )
    `);

    console.log("Database initialized successfully");
  });
}

module.exports = db;
