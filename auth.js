const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const db = require("./database");

// Configure password hashing
const SALT_ROUNDS = 10;

// Configure Passport Local Strategy
passport.use(
  new LocalStrategy((username, password, done) => {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, user) => {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        bcrypt.compare(password, user.password_hash, (err, result) => {
          if (err) {
            return done(err);
          }
          if (!result) {
            return done(null, false, { message: "Incorrect password." });
          }
          return done(null, user);
        });
      },
    );
  }),
);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  db.get(
    "SELECT id, username, display_name, is_admin FROM users WHERE id = ?",
    [id],
    (err, user) => {
      if (err) {
        return done(err);
      }

      // Handle deleted user - session exists but user doesn't
      if (!user) {
        console.log(`Session found for deleted user ID: ${id}`);
        return done(null, false);
      }

      // Auto-promote admin user if configured
      const adminUsername = process.env.ADMIN_USERNAME;
      if (
        adminUsername &&
        user &&
        user.username === adminUsername &&
        !user.is_admin
      ) {
        console.log(`Auto-promoting ${user.username} to admin`);
        db.run(
          "UPDATE users SET is_admin = 1 WHERE id = ?",
          [user.id],
          (updateErr) => {
            if (updateErr) {
              console.error("Failed to promote admin:", updateErr);
            }
            user.is_admin = 1;
            done(null, user);
          },
        );
      } else {
        done(null, user);
      }
    },
  );
});

// Helper function to create a new user
async function createUser(username, password) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
      if (err) {
        return reject(err);
      }

      // Check if this user should be admin
      const adminUsername = process.env.ADMIN_USERNAME;
      const isAdmin = adminUsername && username === adminUsername ? 1 : 0;

      if (isAdmin) {
        console.log(`Creating admin user: ${username}`);
      }

      db.run(
        "INSERT INTO users (username, password_hash, display_name, is_admin) VALUES (?, ?, ?, ?)",
        [username, hash, username, isAdmin],
        function (err) {
          if (err) {
            if (err.message.includes("UNIQUE")) {
              return reject(new Error("Username already exists"));
            }
            return reject(err);
          }
          resolve({
            id: this.lastID,
            username,
            display_name: username,
            is_admin: isAdmin,
          });
        },
      );
    });
  });
}

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.is_admin) {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

module.exports = {
  passport,
  createUser,
  requireAuth,
  requireAdmin,
};
