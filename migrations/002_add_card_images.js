const { getImageFilename } = require("../card-image-mapping");
const { promisify } = require("util");

module.exports = {
  up: async (db) => {
    console.log("Adding image_filename column to cards table...");

    // Promisify db methods
    const dbRun = promisify(db.run.bind(db));
    const dbAll = promisify(db.all.bind(db));

    // Add the new column
    await dbRun("ALTER TABLE cards ADD COLUMN image_filename TEXT");

    // Get all cards
    const cards = await dbAll("SELECT id, name FROM cards");

    // Update each card with its image filename
    for (const card of cards) {
      const imageFilename = getImageFilename(card.name);
      await dbRun("UPDATE cards SET image_filename = ? WHERE id = ?", [
        imageFilename,
        card.id,
      ]);
    }

    console.log(`✓ Updated ${cards.length} cards with image filenames`);
  },

  down: async (db) => {
    console.log("Removing image_filename column from cards table...");
    // SQLite doesn't support DROP COLUMN directly, so we'd need to recreate the table
    // For now, just log that this migration can't be easily reversed
    console.log("⚠ Note: Column will remain but can be ignored");
  },
};
