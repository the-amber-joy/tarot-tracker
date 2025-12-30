// Load environment variables from .env file
require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const SqliteStore = require("better-sqlite3-session-store")(session);
const Database = require("better-sqlite3");
const cookieParser = require("cookie-parser");
const db = require("./database");
const { TAROT_CARDS } = require("./cards");
const { SPREAD_TEMPLATES } = require("./spreads");
const {
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
} = require("./auth");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminVerifiedEmail,
} = require("./email");

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables in production
if (process.env.NODE_ENV === "production") {
  if (
    !process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.includes("change")
  ) {
    console.error(
      "ERROR: SESSION_SECRET must be set to a secure random value in production!",
    );
    process.exit(1);
  }
}

// Middleware
app.use(express.json());
app.use(cookieParser());

// Serve static tarot card images
app.use(
  "/tarot-images",
  express.static(path.join(__dirname, "public/tarot-images")),
);

// Trust proxy for Fly.io
app.set("trust proxy", 1);

// Setup persistent session store
const dataDir = process.env.DB_PATH || path.join(__dirname, "data");
const sessionDb = new Database(path.join(dataDir, "sessions.db"));

app.use(
  session({
    store: new SqliteStore({
      client: sessionDb,
      expired: {
        clear: true,
        intervalMs: 900000, // 15 minutes
      },
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 28,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// API Routes

// Health check endpoint for Fly.io
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Authentication routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if email already exists
    const existingEmail = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE email = ?",
        [email.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = await createUser(username, password, email.toLowerCase());

    // Generate verification token
    const token = generateToken();
    const expires = getVerificationTokenExpiry();
    const now = new Date().toISOString();

    // Save token to database
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET verification_token = ?, verification_token_expires = ?, verification_sent_at = ? WHERE id = ?",
        [token, expires, now, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    // Send verification email
    try {
      await sendVerificationEmail(email.toLowerCase(), token, username);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
      // Don't fail registration if email fails - user can resend
    }

    // Don't auto-login - user must verify email first
    res.status(201).json({
      message:
        "Account created! Please check your email to verify your account.",
      requiresVerification: true,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: info.message || "Login failed" });
    }

    // Allow login even if email is not verified - they'll see a warning in the app

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Update last_login timestamp
      db.run(
        "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        [user.id],
        (err) => {
          if (err) {
            console.error("Error updating last_login:", err.message);
          }
        },
      );

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        email_verified: !!user.email_verified,
        display_name: user.display_name,
        is_admin: user.is_admin || false,
      });
    });
  })(req, res, next);
});

app.post("/api/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });
});

// Verify email with token
app.get("/api/auth/verify/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, username, verification_token_expires FROM users WHERE verification_token = ?",
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid verification link" });
    }

    if (isTokenExpired(user.verification_token_expires)) {
      return res.status(400).json({
        error: "Verification link has expired. Please request a new one.",
      });
    }

    // Mark user as verified and clear token
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
        [user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Resend verification email
app.post("/api/auth/resend-verification", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, username, email, email_verified, verification_sent_at FROM users WHERE email = ?",
        [email.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        message:
          "If that email is registered, a verification link has been sent.",
      });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    // Check rate limit
    if (!canResendVerification(user.verification_sent_at)) {
      const waitMinutes = getResendWaitMinutes(user.verification_sent_at);
      return res.status(429).json({
        error: `Please wait ${waitMinutes} minutes before requesting another verification email`,
        waitMinutes,
      });
    }

    // Generate new token
    const token = generateToken();
    const expires = getVerificationTokenExpiry();
    const now = new Date().toISOString();

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET verification_token = ?, verification_token_expires = ?, verification_sent_at = ? WHERE id = ?",
        [token, expires, now, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    await sendVerificationEmail(user.email, token, user.username);

    res.json({ message: "Verification email sent! Please check your inbox." });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

// Request password reset
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, username, email, email_verified, reset_token_expires FROM users WHERE email = ?",
        [email.toLowerCase()],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    // Always return success message to prevent email enumeration
    const successMessage =
      "If that email is registered, a password reset link has been sent.";

    if (!user) {
      return res.json({ message: successMessage });
    }

    // Only allow password reset for verified emails
    if (!user.email_verified) {
      return res.json({ message: successMessage });
    }

    // Check rate limit - prevent abuse
    if (!canResendReset(user.reset_token_expires)) {
      const waitMinutes = getResetWaitMinutes(user.reset_token_expires);
      return res.status(429).json({
        error: `Please wait ${waitMinutes} minute${
          waitMinutes !== 1 ? "s" : ""
        } before requesting another reset email.`,
      });
    }

    // Generate reset token
    const token = generateToken();
    const expires = getResetTokenExpiry();

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
        [token, expires, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    await sendPasswordResetEmail(user.email, token, user.username);

    res.json({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Reset password with token
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, username, reset_token_expires FROM users WHERE reset_token = ?",
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    if (isTokenExpired(user.reset_token_expires)) {
      return res
        .status(400)
        .json({ error: "Reset link has expired. Please request a new one." });
    }

    // Hash new password
    const bcrypt = require("bcrypt");
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [newHash, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.json({
      message:
        "Password reset successfully! You can now log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Validate reset token (for frontend to check before showing form)
app.get("/api/auth/validate-reset-token/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, reset_token_expires FROM users WHERE reset_token = ?",
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res
        .status(400)
        .json({ valid: false, error: "Invalid reset link" });
    }

    if (isTokenExpired(user.reset_token_expires)) {
      return res
        .status(400)
        .json({ valid: false, error: "Reset link has expired" });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Validate reset token error:", error);
    res.status(500).json({ valid: false, error: "Failed to validate token" });
  }
});

app.get("/api/auth/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      email_verified: !!req.user.email_verified,
      display_name: req.user.display_name,
      is_admin: req.user.is_admin || false,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Update user profile
app.put("/api/auth/profile", requireAuth, async (req, res) => {
  const { display_name, username } = req.body;

  try {
    // If username is being changed, check if it's already taken
    if (username && username !== req.user.username) {
      const existingUser = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id FROM users WHERE username = ? AND id != ?",
          [username, req.user.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          },
        );
      });

      if (existingUser) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    db.run(
      "UPDATE users SET display_name = ?, username = COALESCE(?, username) WHERE id = ?",
      [display_name, username || null, req.user.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Return updated user data
        db.get(
          "SELECT id, username, email, email_verified, display_name, is_admin FROM users WHERE id = ?",
          [req.user.id],
          (err, user) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({
              ...user,
              email_verified: !!user.email_verified,
            });
          },
        );
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user password
app.put("/api/auth/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "Current and new passwords are required" });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "New password must be at least 6 characters" });
  }

  try {
    const bcrypt = require("bcrypt");

    // Get user's current password hash
    db.get(
      "SELECT password_hash FROM users WHERE id = ?",
      [req.user.id],
      async (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Verify current password
        const isValid = await bcrypt.compare(
          currentPassword,
          user.password_hash,
        );
        if (!isValid) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);

        // Update password
        db.run(
          "UPDATE users SET password_hash = ? WHERE id = ?",
          [newHash, req.user.id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Password updated successfully" });
          },
        );
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user email (requires re-verification)
app.put("/api/auth/email", requireAuth, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Check if email is same as current
  if (normalizedEmail === req.user.email) {
    return res
      .status(400)
      .json({ error: "This is already your email address" });
  }

  try {
    // Check if email is already taken
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [normalizedEmail, req.user.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email is already used by another account" });
    }

    // Generate verification token
    const token = generateToken();
    const expires = getVerificationTokenExpiry();
    const now = new Date().toISOString();

    // Update email, mark unverified, and set verification token
    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET email = ?, email_verified = 0, verification_token = ?, verification_token_expires = ?, verification_sent_at = ? WHERE id = ?",
        [normalizedEmail, token, expires, now, req.user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    // Send verification email
    try {
      await sendVerificationEmail(normalizedEmail, token, req.user.username);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
      // Don't fail - user can resend
    }

    db.get(
      "SELECT id, username, email, email_verified, display_name, is_admin FROM users WHERE id = ?",
      [req.user.id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          ...user,
          email_verified: !!user.email_verified,
          message:
            "Email updated. Please check your inbox to verify your new email address.",
        });
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints

// Get all users with statistics (admin only)
app.get("/api/admin/users", requireAdmin, (req, res) => {
  db.all(
    `
    SELECT 
      u.id,
      u.username,
      u.display_name,
      u.email,
      u.email_verified,
      u.created_at,
      u.last_login,
      (SELECT COUNT(*) FROM decks WHERE user_id = u.id) as deck_count,
      (SELECT COUNT(*) FROM readings WHERE user_id = u.id) as reading_count,
      (
        LENGTH(COALESCE(u.username, '')) +
        LENGTH(COALESCE(u.display_name, '')) +
        LENGTH(COALESCE(u.password_hash, '')) +
        COALESCE((SELECT SUM(LENGTH(COALESCE(name, '')) + LENGTH(COALESCE(notes, ''))) FROM decks WHERE user_id = u.id), 0) +
        COALESCE((SELECT SUM(LENGTH(COALESCE(title, '')) + LENGTH(COALESCE(deck_name, '')) + LENGTH(COALESCE(notes, '')) + LENGTH(COALESCE(spread_template_id, ''))) FROM readings WHERE user_id = u.id), 0) +
        COALESCE((SELECT SUM(LENGTH(COALESCE(rc.card_name, '')) + LENGTH(COALESCE(rc.position, '')) + LENGTH(COALESCE(rc.interpretation, ''))) FROM reading_cards rc JOIN readings r ON rc.reading_id = r.id WHERE r.user_id = u.id), 0)
      ) as storage_bytes
    FROM users u
    ORDER BY u.username
  `,
    [],
    (err, users) => {
      if (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(users);
    },
  );
});

// Get count of unverified users (admin only)
app.get("/api/admin/unverified-count", requireAdmin, (req, res) => {
  db.get(
    "SELECT COUNT(*) as count FROM users WHERE email_verified = 0",
    [],
    (err, row) => {
      if (err) {
        console.error("Error fetching unverified count:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ count: row.count });
    },
  );
});

// Reset user password (admin only)
app.put(
  "/api/admin/users/:id/reset-password",
  requireAdmin,
  async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Prevent admin from resetting their own password this way
    if (parseInt(userId) === req.user.id) {
      return res
        .status(400)
        .json({ error: "Use the profile page to change your own password" });
    }

    try {
      const bcrypt = require("bcrypt");
      const newHash = await bcrypt.hash(newPassword, 10);

      db.run(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newHash, userId],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: "User not found" });
          }
          res.json({ message: "Password reset successfully" });
        },
      );
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Manually verify user email (admin only)
app.put("/api/admin/users/:id/verify", requireAdmin, async (req, res) => {
  const userId = req.params.id;

  // First get the user's email and username for the notification
  db.get(
    "SELECT username, email FROM users WHERE id = ?",
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update verification status
      db.run(
        "UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
        [userId],
        async function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Send notification email if user has an email address
          if (user.email) {
            try {
              await sendAdminVerifiedEmail(user.email, user.username);
            } catch (emailErr) {
              console.error(
                "Failed to send verification notification:",
                emailErr.message,
              );
              // Don't fail the request if email fails - user is still verified
              // TODO: consider changing this behavior
            }
          }

          res.json({ message: "User verified successfully" });
        },
      );
    },
  );
});

// Update user email (admin only)
app.put("/api/admin/users/:id/email", requireAdmin, async (req, res) => {
  const userId = req.params.id;
  const { email } = req.body;

  // Prevent admin from changing their own email this way
  if (parseInt(userId) === req.user.id) {
    return res
      .status(400)
      .json({ error: "Use the profile page to change your own email" });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if email is already used by another user
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [normalizedEmail, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email is already used by another user" });
    }

    // Update email and mark as unverified (admin changed it)
    db.run(
      "UPDATE users SET email = ?, email_verified = 0, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
      [normalizedEmail, userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: "User not found" });
        }
        res.json({
          message: "Email updated successfully",
          email: normalizedEmail,
          email_verified: false,
        });
      },
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user and all their data (admin only)
app.delete("/api/admin/users/:id", requireAdmin, (req, res) => {
  const userId = req.params.id;

  // Prevent admin from deleting themselves
  if (parseInt(userId) === req.user.id) {
    return res
      .status(400)
      .json({ error: "You cannot delete your own account" });
  }

  // The foreign key constraints with ON DELETE CASCADE will automatically
  // delete all associated decks, readings, and reading_cards
  db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User and all associated data deleted successfully" });
  });
});

// Nuclear option: Delete all data except current admin (DISABLED IN PRODUCTION)
app.post("/api/admin/nuke", requireAdmin, (req, res) => {
  // Block this endpoint in production
  if (process.env.NODE_ENV === "production") {
    return res
      .status(403)
      .json({ error: "This action is disabled in production" });
  }

  const adminId = req.user.id;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // Delete all users except the current admin
    db.run("DELETE FROM users WHERE id != ?", [adminId], function (err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: err.message });
      }

      // Delete all data for the admin user too (but keep the user account)
      db.run(
        "DELETE FROM reading_cards WHERE reading_id IN (SELECT id FROM readings WHERE user_id = ?)",
        [adminId],
        function (err) {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ error: err.message });
          }

          db.run(
            "DELETE FROM readings WHERE user_id = ?",
            [adminId],
            function (err) {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: err.message });
              }

              db.run(
                "DELETE FROM decks WHERE user_id = ?",
                [adminId],
                function (err) {
                  if (err) {
                    db.run("ROLLBACK");
                    return res.status(500).json({ error: err.message });
                  }

                  db.run("COMMIT", function (err) {
                    if (err) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: err.message });
                    }
                    res.json({
                      message:
                        "All data cleared. Only your admin account remains.",
                      adminId: adminId,
                    });
                  });
                },
              );
            },
          );
        },
      );
    });
  });
});

// Get analytics data (admin only)
app.get("/api/admin/analytics", requireAdmin, (req, res) => {
  db.serialize(() => {
    // Number distribution (Ace through 10, including courts and major arcana)
    db.all(
      `
      SELECT 
        c.number,
        COUNT(*) as count
      FROM reading_cards rc
      JOIN cards c ON rc.card_id = c.id
      GROUP BY c.number
      ORDER BY c.number
    `,
      [],
      (err, numberDist) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Suit distribution
        db.all(
          `
          SELECT 
            COALESCE(c.suit, 'Major Arcana') as suit,
            COUNT(*) as count
          FROM reading_cards rc
          JOIN cards c ON rc.card_id = c.id
          GROUP BY c.suit
          ORDER BY count DESC
        `,
          [],
          (err, suitDist) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Element distribution
            db.all(
              `
              SELECT 
                e.name as element,
                e.polarity,
                COUNT(*) as count
              FROM reading_cards rc
              JOIN cards c ON rc.card_id = c.id
              JOIN elements e ON c.element_id = e.id
              GROUP BY e.name, e.polarity
              ORDER BY count DESC
            `,
              [],
              (err, elementDist) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                // Top 10 most drawn cards
                db.all(
                  `
                  SELECT 
                    c.name,
                    c.suit,
                    COUNT(*) as count
                  FROM reading_cards rc
                  JOIN cards c ON rc.card_id = c.id
                  GROUP BY c.id
                  ORDER BY count DESC
                  LIMIT 10
                `,
                  [],
                  (err, topCards) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    // Total readings and cards
                    db.get(
                      `
                      SELECT 
                        COUNT(DISTINCT r.id) as total_readings,
                        COUNT(*) as total_cards_drawn
                      FROM readings r
                      LEFT JOIN reading_cards rc ON r.id = rc.reading_id
                    `,
                      [],
                      (err, totals) => {
                        if (err) {
                          return res.status(500).json({ error: err.message });
                        }

                        res.json({
                          numberDistribution: numberDist,
                          suitDistribution: suitDist,
                          elementDistribution: elementDist,
                          topCards: topCards,
                          totalReadings: totals.total_readings,
                          totalCardsDrawn: totals.total_cards_drawn,
                        });
                      },
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  });
});

// Get all tarot cards (public)
app.get("/api/cards", (req, res) => {
  res.json(TAROT_CARDS);
});

// Get a single card by name with full details (public)
app.get("/api/cards/:name", (req, res) => {
  const cardName = decodeURIComponent(req.params.name);
  db.get(
    `SELECT 
      c.id, 
      c.name, 
      c.number, 
      c.suit,
      c.image_filename,
      e.name as element_name,
      e.polarity as element_polarity,
      z.name as zodiac_sign_name,
      q.name as zodiac_quality,
      p.name as planet_name,
      c.keywords
    FROM cards c
    LEFT JOIN elements e ON c.element_id = e.id
    LEFT JOIN zodiac_signs z ON c.zodiac_sign_id = z.id
    LEFT JOIN qualities q ON z.quality_id = q.id
    LEFT JOIN planets p ON c.planet_id = p.id
    WHERE c.name = ?`,
    [cardName],
    (err, card) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }
      res.json(card);
    },
  );
});

// Get all tarot cards from database with full details (admin only)
app.get("/api/admin/cards", requireAdmin, (req, res) => {
  db.all(
    `SELECT 
      c.id, 
      c.name, 
      c.number, 
      c.suit,
      c.image_filename,
      e.name as element_name,
      e.polarity as element_polarity,
      z.name as zodiac_sign_name,
      q.name as zodiac_quality,
      p.name as planet_name,
      c.keywords
    FROM cards c
    LEFT JOIN elements e ON c.element_id = e.id
    LEFT JOIN zodiac_signs z ON c.zodiac_sign_id = z.id
    LEFT JOIN qualities q ON z.quality_id = q.id
    LEFT JOIN planets p ON c.planet_id = p.id
    ORDER BY c.id`,
    [],
    (err, cards) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(cards);
    },
  );
});

// Get all spread templates (public)
app.get("/api/spreads", (req, res) => {
  res.json(Object.values(SPREAD_TEMPLATES));
});

// Get deployment info (admin only)
app.get("/api/deploy-info", requireAdmin, (req, res) => {
  const fs = require("fs");
  const deployPath = path.join(__dirname, "deploy.txt");

  if (fs.existsSync(deployPath)) {
    fs.readFile(deployPath, "utf8", (err, data) => {
      if (err) {
        return res.status(500).json({ error: "Failed to read deploy info" });
      }
      res.json({ content: data });
    });
  } else {
    res.json({ content: "Deployment info not available (dev mode)" });
  }
});

// Check if running in production (admin only)
app.get("/api/admin/is-production", requireAdmin, (req, res) => {
  res.json({ isProduction: process.env.NODE_ENV === "production" });
});

// Deck management endpoints

// Get all decks (user's own decks only)
app.get("/api/decks", requireAuth, (req, res) => {
  db.all(
    "SELECT * FROM decks WHERE user_id = ? ORDER BY name",
    [req.user.id],
    (err, decks) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(decks);
    },
  );
});

// Add a new deck
app.post("/api/decks", requireAuth, (req, res) => {
  const { name, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name is required" });
  }

  db.run(
    "INSERT INTO decks (name, notes, user_id) VALUES (?, ?, ?)",
    [name.trim(), notes || null, req.user.id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Deck name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: this.lastID,
        name: name.trim(),
        notes: notes || null,
        message: "Deck added successfully",
      });
    },
  );
});

// Update a deck
app.put("/api/decks/:id", requireAuth, (req, res) => {
  const { name, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name is required" });
  }

  db.run(
    "UPDATE decks SET name = ?, notes = ? WHERE id = ? AND user_id = ?",
    [name.trim(), notes || null, req.params.id, req.user.id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Deck name already exists" });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.json({
        id: parseInt(req.params.id),
        name: name.trim(),
        notes: notes || null,
        message: "Deck updated successfully",
      });
    },
  );
});

// Delete a deck
app.delete("/api/decks/:id", requireAuth, (req, res) => {
  db.run(
    "DELETE FROM decks WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Deck not found" });
      }
      res.json({ message: "Deck deleted successfully" });
    },
  );
});

// Get card frequency statistics
app.get("/api/stats/card-frequency", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT 
      c.name as card_name,
      c.image_filename,
      c.suit,
      c.number,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ?
  `;

  const params = [req.user.id];

  if (startDate) {
    query += ` AND r.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND r.date <= ?`;
    params.push(endDate);
  }

  query += `
    GROUP BY c.id, c.name
    ORDER BY count DESC
  `;

  db.all(query, params, (err, cardFrequency) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(cardFrequency);
  });
});

// Get suit distribution statistics
app.get("/api/stats/suit-distribution", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;

  let query = `
    SELECT 
      c.suit,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ?
  `;

  const params = [req.user.id];

  if (startDate) {
    query += ` AND r.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND r.date <= ?`;
    params.push(endDate);
  }

  query += ` GROUP BY c.suit`;

  db.all(query, params, (err, suitCounts) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Convert to expected format
    const distribution = {
      "Major Arcana": 0,
      Wands: 0,
      Cups: 0,
      Swords: 0,
      Pentacles: 0,
    };

    suitCounts.forEach(({ suit, count }) => {
      if (distribution.hasOwnProperty(suit)) {
        distribution[suit] = count;
      }
    });

    res.json(distribution);
  });
});

// Get suit frequency over time (for grouped bar chart)
app.get("/api/stats/suit-frequency-over-time", requireAuth, (req, res) => {
  const { startDate, endDate, groupBy } = req.query;

  if (!groupBy || !["day", "month", "year"].includes(groupBy)) {
    return res
      .status(400)
      .json({ error: "groupBy parameter required (day, month, or year)" });
  }

  // Determine date format based on grouping
  let dateFormat;
  if (groupBy === "day") {
    dateFormat = "%Y-%m-%d";
  } else if (groupBy === "month") {
    dateFormat = "%Y-%m";
  } else {
    dateFormat = "%Y";
  }

  let query = `
    SELECT 
      strftime('${dateFormat}', r.date) as period,
      c.suit,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ?
  `;

  const params = [req.user.id];

  if (startDate) {
    query += ` AND r.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND r.date <= ?`;
    params.push(endDate);
  }

  query += ` GROUP BY period, c.suit ORDER BY period`;

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Transform results into grouped format
    const grouped = {};
    results.forEach(({ period, suit, count }) => {
      if (!grouped[period]) {
        grouped[period] = {
          period,
          "Major Arcana": 0,
          Wands: 0,
          Cups: 0,
          Swords: 0,
          Pentacles: 0,
        };
      }
      if (grouped[period].hasOwnProperty(suit)) {
        grouped[period][suit] = count;
      }
    });

    // Convert to array and sort by period
    const data = Object.values(grouped).sort((a, b) =>
      a.period.localeCompare(b.period),
    );

    res.json(data);
  });
});

// Get number distribution statistics
app.get("/api/stats/number-distribution", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      c.number,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ? AND c.suit != 'Major Arcana'
    GROUP BY c.number
    ORDER BY c.number
  `,
    [req.user.id],
    (err, numberCounts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(numberCounts);
    },
  );
});

// Get consolidated analytics (user-scoped)
app.get("/api/stats/analytics", requireAuth, (req, res) => {
  const { startDate, endDate } = req.query;

  // Build WHERE clause for date filtering
  let dateFilter = "";
  const dateParams = [];

  if (startDate) {
    dateFilter += " AND r.date >= ?";
    dateParams.push(startDate);
  }

  if (endDate) {
    dateFilter += " AND r.date <= ?";
    dateParams.push(endDate);
  }

  db.serialize(() => {
    // Number distribution (Ace through King, all suits)
    db.all(
      `
      SELECT 
        c.number,
        COUNT(*) as count
      FROM reading_cards rc
      JOIN readings r ON rc.reading_id = r.id
      JOIN cards c ON rc.card_id = c.id
      WHERE r.user_id = ?${dateFilter}
      GROUP BY c.number
      ORDER BY c.number
    `,
      [req.user.id, ...dateParams],
      (err, numberDist) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Element distribution
        db.all(
          `
          SELECT 
            e.name as element,
            e.polarity,
            COUNT(*) as count
          FROM reading_cards rc
          JOIN readings r ON rc.reading_id = r.id
          JOIN cards c ON rc.card_id = c.id
          JOIN elements e ON c.element_id = e.id
          WHERE r.user_id = ?${dateFilter}
          GROUP BY e.name, e.polarity
          ORDER BY count DESC
        `,
          [req.user.id, ...dateParams],
          (err, elementDist) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Top 10 most drawn cards
            db.all(
              `
              SELECT 
                c.name,
                c.suit,
                c.image_filename,
                COUNT(*) as count
              FROM reading_cards rc
              JOIN readings r ON rc.reading_id = r.id
              JOIN cards c ON rc.card_id = c.id
              WHERE r.user_id = ?${dateFilter}
              GROUP BY c.id
              ORDER BY count DESC
              LIMIT 10
            `,
              [req.user.id, ...dateParams],
              (err, topCards) => {
                if (err) {
                  return res.status(500).json({ error: err.message });
                }

                // Total readings and cards
                db.get(
                  `
                  SELECT 
                    COUNT(DISTINCT r.id) as total_readings,
                    COUNT(*) as total_cards_drawn
                  FROM readings r
                  LEFT JOIN reading_cards rc ON r.id = rc.reading_id
                  WHERE r.user_id = ?${dateFilter}
                `,
                  [req.user.id, ...dateParams],
                  (err, totals) => {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    res.json({
                      numberDistribution: numberDist,
                      elementDistribution: elementDist,
                      topCards: topCards,
                      totalReadings: totals.total_readings,
                      totalCardsDrawn: totals.total_cards_drawn,
                    });
                  },
                );
              },
            );
          },
        );
      },
    );
  });
});

// Get all readings (for summary table, user's own readings only)
app.get("/api/readings", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      r.id,
      r.date,
      r.time,
      r.title,
      r.spread_template_id,
      r.deck_name,
      r.notes,
      COUNT(rc.id) as card_count,
      SUM(CASE WHEN rc.card_name IS NULL OR rc.card_name = '' THEN 1 ELSE 0 END) as empty_positions
    FROM readings r
    LEFT JOIN reading_cards rc ON r.id = rc.reading_id
    WHERE r.user_id = ?
    GROUP BY r.id
    ORDER BY r.date DESC, r.time DESC
  `,
    [req.user.id],
    (err, readings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Add is_incomplete flag based on spread template or empty positions
      const enrichedReadings = readings.map((reading) => {
        let isIncomplete = false;

        // Check if spread has a template
        if (reading.spread_template_id) {
          const template = SPREAD_TEMPLATES[reading.spread_template_id];
          if (template && template.cardCount) {
            // For templated spreads, check if card count matches expected count
            // and if there are any empty positions
            isIncomplete =
              reading.card_count < template.cardCount ||
              reading.empty_positions > 0;
          } else {
            // For custom spreads, just check for empty positions
            isIncomplete = reading.empty_positions > 0;
          }
        } else {
          // For spreads without a template, check for empty positions
          isIncomplete = reading.empty_positions > 0;
        }

        return {
          ...reading,
          is_incomplete: isIncomplete,
        };
      });

      res.json(enrichedReadings);
    },
  );
});

// Get a single reading with all its cards
app.get("/api/readings/:id", requireAuth, (req, res) => {
  db.get(
    "SELECT * FROM readings WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err, reading) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!reading) {
        return res.status(404).json({ error: "Reading not found" });
      }

      db.all(
        "SELECT * FROM reading_cards WHERE reading_id = ? ORDER BY card_order",
        [req.params.id],
        (err, cards) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ ...reading, cards });
        },
      );
    },
  );
});

// Create a new reading
app.post("/api/readings", requireAuth, (req, res) => {
  const { date, time, title, spread_template_id, deck_name, notes, cards } =
    req.body;

  db.run(
    "INSERT INTO readings (user_id, date, time, title, spread_template_id, deck_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, date, time, title, spread_template_id, deck_name, notes],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const readingId = this.lastID;

      // Insert cards with card_id lookup
      const stmt = db.prepare(
        "INSERT INTO reading_cards (reading_id, card_id, card_name, position, interpretation, card_order, position_x, position_y, rotation) VALUES (?, (SELECT id FROM cards WHERE name = ?), ?, ?, ?, ?, ?, ?, ?)",
      );

      cards.forEach((card, index) => {
        stmt.run(
          readingId,
          card.card_name,
          card.card_name,
          card.position,
          card.interpretation,
          index,
          card.position_x || null,
          card.position_y || null,
          card.rotation || 0,
        );
      });

      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: readingId, message: "Reading created successfully" });
      });
    },
  );
});

// Update a reading
app.put("/api/readings/:id", requireAuth, (req, res) => {
  const { date, time, title, spread_template_id, deck_name, notes, cards } =
    req.body;

  db.run(
    "UPDATE readings SET date = ?, time = ?, title = ?, spread_template_id = ?, deck_name = ?, notes = ? WHERE id = ? AND user_id = ?",
    [
      date,
      time,
      title,
      spread_template_id,
      deck_name,
      notes,
      req.params.id,
      req.user.id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Delete existing cards
      db.run(
        "DELETE FROM reading_cards WHERE reading_id = ?",
        [req.params.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Insert updated cards with card_id lookup
          const stmt = db.prepare(
            "INSERT INTO reading_cards (reading_id, card_id, card_name, position, interpretation, card_order, position_x, position_y, rotation) VALUES (?, (SELECT id FROM cards WHERE name = ?), ?, ?, ?, ?, ?, ?, ?)",
          );

          cards.forEach((card, index) => {
            stmt.run(
              req.params.id,
              card.card_name,
              card.card_name,
              card.position,
              card.interpretation,
              index,
              card.position_x || null,
              card.position_y || null,
              card.rotation || 0,
            );
          });

          stmt.finalize((err) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json({ message: "Reading updated successfully" });
          });
        },
      );
    },
  );
});

// Delete a reading
app.delete("/api/readings/:id", requireAuth, (req, res) => {
  // First verify ownership
  db.get(
    "SELECT id FROM readings WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err, reading) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!reading) {
        return res.status(404).json({ error: "Reading not found" });
      }

      db.run(
        "DELETE FROM reading_cards WHERE reading_id = ?",
        [req.params.id],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.run(
            "DELETE FROM readings WHERE id = ?",
            [req.params.id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ message: "Reading deleted successfully" });
            },
          );
        },
      );
    },
  );
});

// Serve deployment info
app.get("/deploy.txt", (req, res) => {
  res.sendFile(path.join(__dirname, "deploy.txt"));
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, "client/dist")));

// Serve frontend for all other routes (SPA routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Tarot Stats server running on http://0.0.0.0:${PORT}`);
});
