/**
 * Add login attempt tracking fields to users table
 */

const { promisify } = require("util");

module.exports = {
  up: async (db) => {
    console.log("Adding login attempt tracking fields to users table...");

    const dbRun = promisify(db.run.bind(db));

    // Add login attempt tracking fields
    await dbRun(
      "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0",
    );
    await dbRun("ALTER TABLE users ADD COLUMN last_failed_login TEXT");
    await dbRun("ALTER TABLE users ADD COLUMN account_locked_until TEXT");

    console.log("✓ Login attempt tracking fields added to users table");
  },

  down: async (db) => {
    console.log("Removing login attempt tracking fields...");
    console.log(
      "⚠ Note: Columns will remain but can be ignored. Manual table recreation required for full removal.",
    );
  },
};
