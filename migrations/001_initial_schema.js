/**
 * Initial database schema
 * Creates all base tables with proper structure
 */

function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function up(db) {
  // Enable foreign key constraints
  await runAsync(db, "PRAGMA foreign_keys = ON");

  // Create users table
  await runAsync(
    db,
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `,
  );

  // Create decks table
  await runAsync(
    db,
    `
    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      notes TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(name, user_id)
    )
  `,
  );

  // Create readings table
  await runAsync(
    db,
    `
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
  `,
  );

  // Create reading_cards table
  await runAsync(
    db,
    `
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
  `,
  );

  console.log("    ✓ Created users table");
  console.log("    ✓ Created decks table with notes column");
  console.log("    ✓ Created readings table");
  console.log("    ✓ Created reading_cards table");
}

async function down(db) {
  await runAsync(db, "DROP TABLE IF EXISTS reading_cards");
  await runAsync(db, "DROP TABLE IF EXISTS readings");
  await runAsync(db, "DROP TABLE IF EXISTS decks");
  await runAsync(db, "DROP TABLE IF EXISTS users");
}

module.exports = { up, down };
