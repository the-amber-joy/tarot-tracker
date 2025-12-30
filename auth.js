const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("./database");

// Configure password hashing
const SALT_ROUNDS = 10;

// Token expiration times
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const RESEND_RATE_LIMIT_MINUTES = 5;
const RESET_RATE_LIMIT_MINUTES = 5;

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

      done(null, user);
    },
  );
});

// Helper function to create a new user
async function createUser(username, password, email = null) {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
      if (err) {
        return reject(err);
      }

      // New users with email start unverified; users without email (legacy) are verified
      const emailVerified = email ? 0 : 1;

      db.run(
        "INSERT INTO users (username, password_hash, display_name, email, email_verified, is_admin) VALUES (?, ?, ?, ?, ?, 0)",
        [username, hash, username, email, emailVerified],
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
            email,
            email_verified: emailVerified,
            is_admin: 0,
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

// Generate a secure random token
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Calculate token expiry date
function getVerificationTokenExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);
  return expiry.toISOString();
}

function getResetTokenExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + RESET_TOKEN_EXPIRY_HOURS);
  return expiry.toISOString();
}

// Check if enough time has passed since last verification email (rate limiting)
function canResendVerification(verificationSentAt) {
  if (!verificationSentAt) return true;

  const sentAt = new Date(verificationSentAt);
  const now = new Date();
  const diffMinutes = (now - sentAt) / (1000 * 60);

  return diffMinutes >= RESEND_RATE_LIMIT_MINUTES;
}

// Get minutes remaining before resend is allowed
function getResendWaitMinutes(verificationSentAt) {
  if (!verificationSentAt) return 0;

  const sentAt = new Date(verificationSentAt);
  const now = new Date();
  const diffMinutes = (now - sentAt) / (1000 * 60);

  return Math.ceil(RESEND_RATE_LIMIT_MINUTES - diffMinutes);
}

// Check if enough time has passed since last reset email (rate limiting)
// We infer sent time from reset_token_expires (expires = sent + RESET_TOKEN_EXPIRY_HOURS)
function canResendReset(resetTokenExpires) {
  if (!resetTokenExpires) return true;

  const expires = new Date(resetTokenExpires);
  const sentAt = new Date(
    expires.getTime() - RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const now = new Date();
  const diffMinutes = (now - sentAt) / (1000 * 60);

  return diffMinutes >= RESET_RATE_LIMIT_MINUTES;
}

// Get minutes remaining before reset resend is allowed
function getResetWaitMinutes(resetTokenExpires) {
  if (!resetTokenExpires) return 0;

  const expires = new Date(resetTokenExpires);
  const sentAt = new Date(
    expires.getTime() - RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  const now = new Date();
  const diffMinutes = (now - sentAt) / (1000 * 60);

  return Math.ceil(RESET_RATE_LIMIT_MINUTES - diffMinutes);
}

// Check if a token has expired
function isTokenExpired(expiryDate) {
  if (!expiryDate) return true;
  return new Date() > new Date(expiryDate);
}

module.exports = {
  passport,
  createUser,
  requireAuth,
  requireAdmin,
  generateToken,
  getVerificationTokenExpiry,
  getResetTokenExpiry,
  canResendVerification,
  getResendWaitMinutes,
  canResendReset,
  getResetWaitMinutes,
  isTokenExpired,
  RESEND_RATE_LIMIT_MINUTES,
  RESET_RATE_LIMIT_MINUTES,
};
