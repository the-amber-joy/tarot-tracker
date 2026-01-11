import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import sqlite3Pkg from "sqlite3";
import { fileURLToPath } from "url";
import MigrationRunner from "./migrations/migrate.js";

const sqlite3 = sqlite3Pkg.verbose();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Auto-seed card data if cards table is empty
async function seedCardData() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) as count FROM cards", async (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count === 0) {
        console.log("Cards table is empty, seeding card data...");
        try {
          const { seedReferenceTablesAndCards } = await import(
            "./seed-cards.js"
          );
          await seedReferenceTablesAndCards();
          console.log("✓ Card data seeded successfully");
          resolve();
        } catch (seedErr) {
          console.error("Error seeding card data:", seedErr);
          reject(seedErr);
        }
      } else {
        console.log(`Cards table already contains ${row.count} cards`);
        resolve();
      }
    });
  });
}

// Initialize database schema using migrations
async function initDatabase() {
  try {
    // Run all pending migrations
    const migrationRunner = new MigrationRunner(db);
    await migrationRunner.runPending();

    console.log("Database initialized successfully");

    // Auto-seed card data if needed
    await seedCardData();

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
  } catch (err) {
    console.error("Error running migrations:", err.message);
    process.exit(1);
  }
}

export default db;
