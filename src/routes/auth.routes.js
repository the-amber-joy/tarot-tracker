import bcrypt from "bcrypt";
import express from "express";
import {
  canResendReset,
  canResendVerification,
  createUser,
  generateToken,
  getResendWaitMinutes,
  getResetTokenExpiry,
  getResetWaitMinutes,
  getVerificationTokenExpiry,
  isTokenExpired,
  passport,
  requireAuth,
} from "../../auth.js";
import db from "../../database.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../../email.js";
import { authLimiter, emailLimiter } from "../middleware/rate-limiters.js";

const router = express.Router();

// Authentication routes
router.post("/register", authLimiter, async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  // Validate email format if provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if email already exists (only if email provided)
    if (email) {
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
        // Generic message to prevent email enumeration
        return res.status(400).json({
          error:
            "Unable to complete registration. Please try a different email or username.",
        });
      }
    }

    const user = await createUser(
      username,
      password,
      email ? email.toLowerCase() : null,
    );

    // Only do email verification if email was provided
    if (email) {
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
    } else {
      // No email - auto-login the user
      req.login(user, (err) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Login failed after registration" });
        }
        res.status(201).json({
          message: "Account created successfully!",
          requiresVerification: false,
          user: { id: user.id, username: user.username },
        });
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", authLimiter, (req, res, next) => {
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

router.post("/logout", (req, res) => {
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
router.get("/verify/:token", async (req, res) => {
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
router.post("/resend-verification", emailLimiter, async (req, res) => {
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
router.post("/forgot-password", emailLimiter, async (req, res) => {
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
router.post("/reset-password", async (req, res) => {
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
router.get("/validate-reset-token/:token", async (req, res) => {
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

router.get("/me", (req, res) => {
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
router.put("/profile", requireAuth, async (req, res) => {
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
router.put("/password", requireAuth, async (req, res) => {
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
router.put("/email", requireAuth, async (req, res) => {
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

export default router;
