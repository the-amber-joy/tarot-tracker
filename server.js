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
const { passport, createUser, requireAuth, requireAdmin } = require("./auth");

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

// Authentication routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    const user = await createUser(username, password);
    // Auto login after registration
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin || false,
      });
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

app.get("/api/auth/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      id: req.user.id,
      username: req.user.username,
      display_name: req.user.display_name,
      is_admin: req.user.is_admin || false,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// Update user profile
app.put("/api/auth/profile", requireAuth, async (req, res) => {
  const { display_name } = req.body;

  try {
    db.run(
      "UPDATE users SET display_name = ? WHERE id = ?",
      [display_name, req.user.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Return updated user data
        db.get(
          "SELECT id, username, display_name, is_admin FROM users WHERE id = ?",
          [req.user.id],
          (err, user) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json(user);
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

// Admin endpoints

// Get all users with statistics (admin only)
app.get("/api/admin/users", requireAdmin, (req, res) => {
  db.all(
    `
    SELECT 
      u.id,
      u.username,
      u.display_name,
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

// Nuclear option: Delete all data except current admin
app.post("/api/admin/nuke", requireAdmin, (req, res) => {
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

// Get all tarot cards (public)
app.get("/api/cards", (req, res) => {
  res.json(TAROT_CARDS);
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
  db.all(
    `
    SELECT 
      c.name as card_name,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ?
    GROUP BY c.id, c.name
    ORDER BY count DESC
  `,
    [req.user.id],
    (err, cardFrequency) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(cardFrequency);
    },
  );
});

// Get suit distribution statistics
app.get("/api/stats/suit-distribution", requireAuth, (req, res) => {
  db.all(
    `
    SELECT 
      c.suit,
      COUNT(*) as count
    FROM reading_cards rc
    INNER JOIN readings r ON rc.reading_id = r.id
    INNER JOIN cards c ON rc.card_id = c.id
    WHERE r.user_id = ?
    GROUP BY c.suit
  `,
    [req.user.id],
    (err, suitCounts) => {
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
    },
  );
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
