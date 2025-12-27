# Database Migrations

This directory contains database migration files for the Tarot Stats application.

## Structure

- `migrate.js` - Migration runner that manages applying migrations
- `XXX_name.js` - Migration files (numbered sequentially)

## Migration File Format

Each migration file exports two functions:

```javascript
async function up(db) {
  // Run SQL statements to apply migration
  // Use runAsync() helper for promise-based execution
}

async function down(db) {
  // Run SQL statements to rollback migration
}

module.exports = { up, down };
```

## Creating a New Migration

1. Create a new file with the next sequential number: `002_description.js`
2. Implement the `up()` and `down()` functions
3. Migrations run automatically on server start

## Migration Tracking

The system uses a `schema_migrations` table to track which migrations have been applied:

- `version` - The migration version number (e.g., "001")
- `name` - The migration name
- `applied_at` - Timestamp when applied

## Example: Adding a New Column

```javascript
// 002_add_user_email.js
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function up(db) {
  await runAsync(
    db,
    `
    ALTER TABLE users 
    ADD COLUMN email TEXT UNIQUE
  `,
  );
  console.log("    ✓ Added email column to users table");
}

async function down(db) {
  // SQLite doesn't support DROP COLUMN, so would need to recreate table
  console.log("    ✓ Rollback: recreate users table without email");
}

module.exports = { up, down };
```

## Best Practices

- **Never modify existing migrations** - Once applied, they are part of the database history
- **Always test rollback** - Make sure `down()` properly reverses `up()`
- **Use transactions** - The runner wraps each migration in a transaction
- **Add data transformations** - Migrations can include data updates, not just schema changes
- **Keep migrations small** - One logical change per migration file
