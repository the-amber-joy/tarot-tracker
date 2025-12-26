const fs = require("fs");
const path = require("path");

/**
 * Migration runner for SQLite database
 * Migrations are JavaScript files that export up() and down() functions
 */
class MigrationRunner {
  constructor(db) {
    this.db = db;
    this.migrationsDir = path.join(__dirname);
  }

  /**
   * Initialize schema_migrations table to track applied migrations
   */
  async initMigrationsTable() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          version TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `,
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT version FROM schema_migrations ORDER BY version",
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map((r) => r.version));
        },
      );
    });
  }

  /**
   * Get list of available migration files
   */
  getAvailableMigrations() {
    const files = fs.readdirSync(this.migrationsDir);
    return files
      .filter(
        (f) =>
          f.match(/^\d{3}_.*\.js$/) && f !== "migrate.js" && f !== "index.js",
      )
      .sort();
  }

  /**
   * Run all pending migrations
   */
  async runPending() {
    await this.initMigrationsTable();
    const applied = await this.getAppliedMigrations();
    const available = this.getAvailableMigrations();

    const pending = available.filter((filename) => {
      const version = filename.split("_")[0];
      return !applied.includes(version);
    });

    if (pending.length === 0) {
      console.log("✓ No pending migrations");
      return;
    }

    console.log(`Running ${pending.length} migration(s)...`);

    for (const filename of pending) {
      await this.runMigration(filename);
    }

    console.log("✓ All migrations completed");
  }

  /**
   * Run a single migration
   */
  async runMigration(filename) {
    const version = filename.split("_")[0];
    const name = filename.replace(/^\d{3}_/, "").replace(/\.js$/, "");
    const migrationPath = path.join(this.migrationsDir, filename);

    console.log(`  Running ${filename}...`);

    const migration = require(migrationPath);

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("BEGIN TRANSACTION", (err) => {
          if (err) return reject(err);

          migration
            .up(this.db)
            .then(() => {
              this.db.run(
                "INSERT INTO schema_migrations (version, name) VALUES (?, ?)",
                [version, name],
                (err) => {
                  if (err) {
                    this.db.run("ROLLBACK");
                    return reject(err);
                  }

                  this.db.run("COMMIT", (err) => {
                    if (err) {
                      this.db.run("ROLLBACK");
                      return reject(err);
                    }
                    console.log(`  ✓ ${filename} completed`);
                    resolve();
                  });
                },
              );
            })
            .catch((err) => {
              this.db.run("ROLLBACK");
              reject(err);
            });
        });
      });
    });
  }
}

module.exports = MigrationRunner;
