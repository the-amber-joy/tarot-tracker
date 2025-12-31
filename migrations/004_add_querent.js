/**
 * Add querent field to readings table
 * Querent represents the person the reading is for (default: "Myself")
 */

const { promisify } = require("util");

module.exports = {
  up: async (db) => {
    console.log("Adding querent field to readings table...");

    const dbRun = promisify(db.run.bind(db));

    // Add querent column with default value "Myself"
    await dbRun(
      "ALTER TABLE readings ADD COLUMN querent TEXT DEFAULT 'Myself'",
    );

    // Update any existing readings that have NULL querent to "Myself"
    await dbRun("UPDATE readings SET querent = 'Myself' WHERE querent IS NULL");

    console.log("✓ Querent field added to readings table");
    console.log("✓ Existing readings set to querent 'Myself'");
  },

  down: async (db) => {
    console.log("Removing querent field...");
    // SQLite doesn't support DROP COLUMN directly in older versions
    console.log(
      "⚠ Note: Column will remain but can be ignored. Manual table recreation required for full removal.",
    );
  },
};
