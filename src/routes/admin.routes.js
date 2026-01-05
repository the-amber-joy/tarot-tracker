const express = require("express");
const router = express.Router();
const db = require("../../database");
const { requireAdmin } = require("../../auth");
const { SPREAD_TEMPLATES } = require("../../spreads");
const { sendAdminVerifiedEmail } = require("../../email");

// Get all users with statistics (admin only)
router.get("/users", (req, res) => {
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
router.get("/unverified-count", (req, res) => {
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
router.put("/users/:id/reset-password", async (req, res) => {
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
});

// Manually verify user email (admin only)
router.put("/users/:id/verify", async (req, res) => {
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
router.put("/users/:id/email", async (req, res) => {
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
router.delete("/users/:id", (req, res) => {
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
router.post("/nuke", (req, res) => {
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

// Seed test readings for a user (admin only)
router.post("/seed-readings", async (req, res) => {
  const {
    username,
    numReadings = 25,
    numDecks = 4,
    newestYearsAgo = 0,
    oldestYearsAgo = 5,
  } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Sample deck names
  const deckNames = [
    "Rider-Waite",
    "Wild Unknown",
    "Modern Witch",
    "Mystic Mondays",
    "Light Seer's",
    "Arcana Iris",
    "Fountain Tarot",
    "Ethereal Visions",
    "Golden Thread",
    "Dreaming Way",
    "Shadowscapes",
    "Legacy of the Divine",
    "Tarot of the New Vision",
    "Steampunk Tarot",
    "Crystal Visions",
    "Druidcraft Tarot",
    "Gilded Tarot",
    "Cosmic Tarot",
    "Alchemy 1977",
    "Bohemian Gothic",
  ];

  // Sample topics and interpretations
  const topics = [
    "Career guidance",
    "Relationship advice",
    "Personal growth",
    "Financial outlook",
    "Health and wellness",
    "Creative endeavors",
    "Life purpose",
    "Decision making",
    "Spiritual development",
    "Daily guidance",
    "Love life",
    "New opportunities",
    "Overcoming obstacles",
    "Inner wisdom",
    "Future planning",
    "Daily Pull",
  ];

  const interpretations = [
    "This card suggests new beginnings and fresh energy.",
    "A time of reflection and inner wisdom is needed.",
    "Challenges ahead, but with courage you will prevail.",
    "Success and abundance are on the horizon.",
    "Balance and harmony are key to moving forward.",
    "Trust your intuition in this situation.",
    "Change is coming, embrace it with open arms.",
    "Past influences are still affecting the present.",
    "Take action now, the time is right.",
    "Patience and perseverance will pay off.",
    "Hidden factors are at play—look deeper.",
    "Your strengths will guide you through this.",
    "Release what no longer serves you.",
    "A breakthrough is near, stay focused.",
    "Stay grounded and practical in your approach.",
    "Embrace the unknown with an open heart.",
    "Creative energy is flowing—channel it wisely.",
    "Conflicts may arise, but resolution is possible.",
    "A period of rest and recuperation is needed.",
    "Joy and celebration are on the way.",
    "Be mindful of your boundaries.",
    "An unexpected opportunity may present itself.",
    "Look to the past for lessons that apply now.",
    "Emotional clarity is emerging.",
    "This is a time for bold action.",
  ];

  // Helper functions
  const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffleArray = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const randomDate = () => {
    const now = new Date();
    const newestDate = new Date(now.getFullYear() - newestYearsAgo, 0, 1);
    const oldestDate = new Date(now.getFullYear() - oldestYearsAgo, 0, 1);
    const endDate =
      newestYearsAgo === 0
        ? now
        : new Date(now.getFullYear() - newestYearsAgo, 11, 31);
    const date = new Date(
      oldestDate.getTime() +
        Math.random() * (endDate.getTime() - oldestDate.getTime()),
    );
    return date.toISOString().split("T")[0];
  };

  const randomTime = () => {
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  // Get spread templates (exclude custom)
  const spreadTemplates = Object.values(SPREAD_TEMPLATES).filter(
    (s) => s.id !== "custom",
  );

  try {
    // Get user ID
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!user) {
      return res.status(404).json({ error: `User '${username}' not found` });
    }

    const userId = user.id;

    // Create decks
    const selectedDecks = shuffleArray(deckNames).slice(0, numDecks);
    for (const deckName of selectedDecks) {
      await new Promise((resolve, reject) => {
        db.run(
          "INSERT OR IGNORE INTO decks (name, user_id) VALUES (?, ?)",
          [deckName, userId],
          (err) => (err ? reject(err) : resolve()),
        );
      });
    }

    // Get all card IDs from database
    const cards = await new Promise((resolve, reject) => {
      db.all("SELECT id, name FROM cards", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const cardMap = new Map(cards.map((c) => [c.name, c.id]));

    // Create readings
    let createdReadings = 0;
    for (let i = 0; i < numReadings; i++) {
      const spread = randomElement(spreadTemplates);
      const deckName = randomElement(selectedDecks);
      const date = randomDate();
      const time = randomTime();
      const notes = `Reading about: ${randomElement(topics)}`;
      const title = randomElement(topics);

      // Insert reading
      const readingId = await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO readings (user_id, date, time, title, spread_template_id, deck_name, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [userId, date, time, title, spread.id, deckName, notes],
          function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
          },
        );
      });

      // Create cards for this reading
      const shuffledCards = shuffleArray(cards);
      for (let j = 0; j < spread.cardCount; j++) {
        const card = shuffledCards[j];
        const position = spread.positions[j];
        const interpretation = randomElement(interpretations);

        await new Promise((resolve, reject) => {
          db.run(
            "INSERT INTO reading_cards (reading_id, card_id, card_name, position, interpretation, card_order, position_x, position_y, rotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              readingId,
              card.id,
              card.name,
              position.label,
              interpretation,
              position.order,
              position.defaultX,
              position.defaultY,
              position.rotation || 0,
            ],
            (err) => (err ? reject(err) : resolve()),
          );
        });
      }

      createdReadings++;
    }

    res.json({
      message: `Successfully created ${createdReadings} readings with ${numDecks} decks for ${username}`,
      details: {
        username,
        readingsCreated: createdReadings,
        decksCreated: selectedDecks.length,
        deckNames: selectedDecks,
      },
    });
  } catch (err) {
    console.error("Error seeding readings:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get analytics data (admin only)
router.get("/analytics", (req, res) => {
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

// Get all tarot cards from database with full details (admin only)
router.get("/cards", (req, res) => {
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

// Get deployment info (admin only)
router.get("/deploy-info", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const deployPath = path.join(__dirname, "../../deploy.txt");

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
router.get("/is-production", (req, res) => {
  res.json({ isProduction: process.env.NODE_ENV === "production" });
});

module.exports = router;
