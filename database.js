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
      CREATE TABLE IF NOT EXISTS zodiac_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS elements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        polarity TEXT
      )
    `);

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

    // Create master cards table with all 78 tarot cards
    db.run(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        number INTEGER,
        suit TEXT NOT NULL,
        zodiac_sign_id INTEGER,
        element_id INTEGER,
        quality_id INTEGER,
        planet_id INTEGER,
        primary_correspondence_type TEXT,
        primary_correspondence_id INTEGER,
        secondary_correspondence_type TEXT,
        secondary_correspondence_id INTEGER,
        keywords TEXT,
        FOREIGN KEY (zodiac_sign_id) REFERENCES zodiac_signs(id),
        FOREIGN KEY (element_id) REFERENCES elements(id),
        FOREIGN KEY (quality_id) REFERENCES qualities(id),
        FOREIGN KEY (planet_id) REFERENCES planets(id)
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

    // Migration: Add polarity column to elements if it doesn't exist
    db.all("PRAGMA table_info(elements)", [], (err, columns) => {
      if (err) {
        console.error("Error checking elements schema:", err.message);
      } else {
        const hasPolarity = columns.some((col) => col.name === "polarity");
        if (!hasPolarity) {
          console.log("Adding polarity column to elements...");
          db.run("ALTER TABLE elements ADD COLUMN polarity TEXT", (err) => {
            if (err) {
              console.error("Error adding polarity column:", err.message);
            } else {
              console.log("✓ polarity column added to elements");
              // Update existing elements with polarity
              db.run(
                "UPDATE elements SET polarity = 'Active' WHERE name IN ('Fire', 'Air')",
                (err) => {
                  if (err)
                    console.error(
                      "Error updating Fire/Air polarity:",
                      err.message,
                    );
                },
              );
              db.run(
                "UPDATE elements SET polarity = 'Passive' WHERE name IN ('Earth', 'Water')",
                (err) => {
                  if (err)
                    console.error(
                      "Error updating Earth/Water polarity:",
                      err.message,
                    );
                },
              );
            }
          });
        }
      }
    });

    // Migration: Add card_id column to reading_cards if it doesn't exist
    db.all("PRAGMA table_info(reading_cards)", [], (err, columns) => {
      if (err) {
        console.error("Error checking reading_cards schema:", err.message);
        return;
      }

      const hasCardId = columns.some((col) => col.name === "card_id");

      if (!hasCardId) {
        console.log("Adding card_id column to reading_cards...");
        db.run(
          "ALTER TABLE reading_cards ADD COLUMN card_id INTEGER REFERENCES cards(id)",
          (err) => {
            if (err) {
              console.error("Error adding card_id column:", err.message);
            } else {
              console.log("✓ card_id column added to reading_cards");

              // Migrate existing data: populate card_id from card_name
              console.log("Migrating existing reading_cards data...");
              db.all(
                "SELECT id, card_name FROM reading_cards WHERE card_id IS NULL",
                [],
                (err, readingCards) => {
                  if (err) {
                    console.error("Error fetching reading_cards:", err.message);
                    return;
                  }

                  if (readingCards.length === 0) {
                    console.log("No cards to migrate");
                    return;
                  }

                  let migrated = 0;
                  let failed = 0;

                  readingCards.forEach((rc) => {
                    db.get(
                      "SELECT id FROM cards WHERE name = ?",
                      [rc.card_name],
                      (err, card) => {
                        if (err || !card) {
                          console.error(
                            `Failed to find card: ${rc.card_name}`,
                            err?.message,
                          );
                          failed++;
                          return;
                        }

                        db.run(
                          "UPDATE reading_cards SET card_id = ? WHERE id = ?",
                          [card.id, rc.id],
                          (err) => {
                            if (err) {
                              console.error(
                                `Error updating reading_card ${rc.id}:`,
                                err.message,
                              );
                              failed++;
                            } else {
                              migrated++;
                              if (migrated + failed === readingCards.length) {
                                console.log(
                                  `✓ Migration complete: ${migrated} cards migrated, ${failed} failed`,
                                );
                              }
                            }
                          },
                        );
                      },
                    );
                  });
                },
              );
            }
          },
        );
      }
    });

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
  });
}

module.exports = db;
