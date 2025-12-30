/**
 * Add email verification and password reset fields to users table
 */

const { promisify } = require("util");

module.exports = {
  up: async (db) => {
    console.log("Adding email verification fields to users table...");

    const dbRun = promisify(db.run.bind(db));

    // Add email field (nullable for existing users who are grandfathered)
    await dbRun("ALTER TABLE users ADD COLUMN email TEXT");

    // Add email verification fields
    await dbRun(
      "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
    );
    await dbRun("ALTER TABLE users ADD COLUMN verification_token TEXT");
    await dbRun("ALTER TABLE users ADD COLUMN verification_token_expires TEXT");
    await dbRun("ALTER TABLE users ADD COLUMN verification_sent_at TEXT");

    // Add password reset fields
    await dbRun("ALTER TABLE users ADD COLUMN reset_token TEXT");
    await dbRun("ALTER TABLE users ADD COLUMN reset_token_expires TEXT");

    // Mark all existing users as verified (grandfathered in)
    await dbRun("UPDATE users SET email_verified = 1 WHERE email IS NULL");

    console.log("✓ Email verification fields added to users table");
    console.log("✓ Existing users grandfathered as verified");
  },

  down: async (db) => {
    console.log("Removing email verification fields...");
    // SQLite doesn't support DROP COLUMN directly in older versions
    console.log(
      "⚠ Note: Columns will remain but can be ignored. Manual table recreation required for full removal.",
    );
  },
};
