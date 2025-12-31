/**
 * Add reversed column to reading_cards table
 * Tracks whether a card is drawn reversed (upside-down)
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
  // Add reversed column to reading_cards (defaults to 0 = not reversed)
  await runAsync(
    db,
    `ALTER TABLE reading_cards ADD COLUMN reversed INTEGER DEFAULT 0`,
  );

  console.log("    ✓ Added reversed column to reading_cards table");
}

async function down(db) {
  // SQLite doesn't support DROP COLUMN directly in older versions
  // For a proper down migration, we'd need to recreate the table
  console.log("    ⚠ Cannot remove reversed column (SQLite limitation)");
}

module.exports = { up, down };
