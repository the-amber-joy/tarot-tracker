// Migration script to rename spread_name column to title in readings table
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Use DB_PATH environment variable if set (for production), otherwise use local path
const dbDir = process.env.DB_PATH || path.join(__dirname, "data");
const dbPath = path.join(dbDir, "tarot.db");

console.log("Database path:", dbPath);
const db = new sqlite3.Database(dbPath);

console.log("Starting migration: rename spread_name to title...");

db.serialize(() => {
  // SQLite doesn't support direct column renaming, so we need to:
  // 1. Create a new table with the new schema
  // 2. Copy data from old table
  // 3. Drop old table
  // 4. Rename new table

  db.run("BEGIN TRANSACTION");

  // Create new readings table with title column
  db.run(
    `
    CREATE TABLE readings_new (
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
  `,
    (err) => {
      if (err) {
        console.error("Error creating new table:", err);
        db.run("ROLLBACK");
        return;
      }
      console.log("✓ Created new readings table");

      // Copy data from old table to new table
      db.run(
        `
      INSERT INTO readings_new (id, user_id, date, time, title, spread_template_id, deck_name, notes, created_at)
      SELECT id, user_id, date, time, spread_name, spread_template_id, deck_name, notes, created_at
      FROM readings
    `,
        (err) => {
          if (err) {
            console.error("Error copying data:", err);
            db.run("ROLLBACK");
            return;
          }
          console.log("✓ Copied data to new table");

          // Drop old table
          db.run("DROP TABLE readings", (err) => {
            if (err) {
              console.error("Error dropping old table:", err);
              db.run("ROLLBACK");
              return;
            }
            console.log("✓ Dropped old readings table");

            // Rename new table to readings
            db.run("ALTER TABLE readings_new RENAME TO readings", (err) => {
              if (err) {
                console.error("Error renaming table:", err);
                db.run("ROLLBACK");
                return;
              }
              console.log("✓ Renamed new table to readings");

              // Commit transaction
              db.run("COMMIT", (err) => {
                if (err) {
                  console.error("Error committing transaction:", err);
                  return;
                }
                console.log("✓ Migration completed successfully!");
                db.close();
              });
            });
          });
        },
      );
    },
  );
});
