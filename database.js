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
    // Enable foreign key constraints
    db.run("PRAGMA foreign_keys = ON", (err) => {
      if (err) {
        console.error("Error enabling foreign keys:", err.message);
      } else {
        console.log("Foreign key constraints enabled.");
      }
    });
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
        display_name TEXT,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Create decks table
    db.run(`
      CREATE TABLE IF NOT EXISTS decks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        notes TEXT,
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
        title TEXT NOT NULL,
        spread_template_id TEXT,
        deck_name TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create reference tables for card metadata
    db.run(`
      CREATE TABLE IF NOT EXISTS qualities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS planets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS zodiac_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        quality_id INTEGER,
        planet_id INTEGER,
        FOREIGN KEY (quality_id) REFERENCES qualities(id),
        FOREIGN KEY (planet_id) REFERENCES planets(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS elements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        polarity TEXT
      )
    `);

    // Create master cards table with all 78 tarot cards
    db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        number INTEGER,
        suit TEXT NOT NULL,
        zodiac_sign_id INTEGER,
        element_id INTEGER,
        planet_id INTEGER,
        keywords TEXT,
        FOREIGN KEY (zodiac_sign_id) REFERENCES zodiac_signs(id),
        FOREIGN KEY (element_id) REFERENCES elements(id),
        FOREIGN KEY (planet_id) REFERENCES planets(id)
      )
    `);

    // Create reading_cards table (cards in each reading)
    db.run(`
      CREATE TABLE IF NOT EXISTS reading_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER NOT NULL,
        card_id INTEGER,
        card_name TEXT NOT NULL,
        position TEXT NOT NULL,
        interpretation TEXT,
        card_order INTEGER NOT NULL,
        position_x REAL,
        position_y REAL,
        rotation REAL DEFAULT 0,
        FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE,
        FOREIGN KEY (card_id) REFERENCES cards(id)
      )
    `);

    console.log("Database initialized successfully");

    // Seed admin user if configured
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminUsername && adminPassword) {
      db.get(
        "SELECT id FROM users WHERE username = ?",
        [adminUsername],
        (err, existing) => {
          if (err) {
            console.error("Error checking for admin user:", err.message);
            return;
          }
          if (!existing) {
            const bcrypt = require("bcrypt");
            bcrypt.hash(adminPassword, 10, (err, hash) => {
              if (err) {
                console.error("Error hashing admin password:", err.message);
                return;
              }
              db.run(
                "INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, 1)",
                [adminUsername, hash, adminUsername],
                function (err) {
                  if (err) {
                    console.error("Error creating admin user:", err.message);
                  } else {
                    console.log(`✓ Admin user '${adminUsername}' created`);
                  }
                },
              );
            });
          } else {
            console.log(`Admin user '${adminUsername}' already exists`);
          }
        },
      );
    }

    // Seed card data automatically on first run
    seedCardData();
  });
}

// Seed card reference data (qualities, planets, zodiac, elements, cards)
async function seedCardData() {
  // Check if cards table is already populated
  db.get("SELECT COUNT(*) as count FROM cards", async (err, row) => {
    if (err) {
      console.error("Error checking cards table:", err.message);
      return;
    }

    if (row.count > 0) {
      console.log("✓ Card data already seeded");
      return;
    }

    console.log("Seeding card reference data...");
    
    try {
      // Run the seed-cards script
      const { seedReferenceTablesAndCards } = require("./seed-cards");
      await seedReferenceTablesAndCards();
      console.log("✓ Card data seeded successfully");
    } catch (error) {
      console.error("Error seeding card data:", error.message);
    }
  });
}

module.exports = db;
