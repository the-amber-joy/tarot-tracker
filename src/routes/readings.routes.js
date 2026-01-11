import express from "express";
import db from "../../database.js";
import { SPREAD_TEMPLATES } from "../../spreads.js";
import {
  addCompletionStatus,
  normalizeQuerent,
} from "../utils/readingHelpers.js";

const router = express.Router();

// Get all readings (for summary table, user's own readings only)
router.get("/", (req, res) => {
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
      r.querent,
      SUM(CASE WHEN rc.card_name IS NOT NULL AND rc.card_name != '' THEN 1 ELSE 0 END) as filled_positions
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
      const enrichedReadings = addCompletionStatus(readings, SPREAD_TEMPLATES);

      res.json(enrichedReadings);
    },
  );
});

// Get distinct querents for the current user (MUST come before /:id route)
router.get("/querents", (req, res) => {
  db.all(
    `SELECT DISTINCT querent FROM readings WHERE user_id = ? AND querent IS NOT NULL ORDER BY querent COLLATE NOCASE`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const querents = rows.map((r) => r.querent);
      res.json(querents);
    },
  );
});

// Get a single reading with all its cards
router.get("/:id", (req, res) => {
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
          // Convert SQLite integer (0/1) to boolean for reversed
          const normalizedCards = cards.map((card) => ({
            ...card,
            reversed: Boolean(card.reversed),
          }));
          res.json({ ...reading, cards: normalizedCards });
        },
      );
    },
  );
});

// Create a new reading
router.post("/", (req, res) => {
  const {
    date,
    time,
    title,
    spread_template_id,
    deck_name,
    notes,
    cards,
    querent,
  } = req.body;

  db.run(
    "INSERT INTO readings (user_id, date, time, title, spread_template_id, deck_name, notes, querent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      req.user.id,
      date,
      time,
      title,
      spread_template_id,
      deck_name,
      notes,
      normalizeQuerent(querent),
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const readingId = this.lastID;

      // Insert cards with card_id lookup
      const stmt = db.prepare(
        "INSERT INTO reading_cards (reading_id, card_id, card_name, position, interpretation, card_order, position_x, position_y, rotation, reversed) VALUES (?, (SELECT id FROM cards WHERE name = ?), ?, ?, ?, ?, ?, ?, ?, ?)",
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
          card.reversed ? 1 : 0,
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
router.put("/:id", (req, res) => {
  const {
    date,
    time,
    title,
    spread_template_id,
    deck_name,
    notes,
    cards,
    querent,
  } = req.body;

  db.run(
    "UPDATE readings SET date = ?, time = ?, title = ?, spread_template_id = ?, deck_name = ?, notes = ?, querent = ? WHERE id = ? AND user_id = ?",
    [
      date,
      time,
      title,
      spread_template_id,
      deck_name,
      notes,
      normalizeQuerent(querent),
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
            "INSERT INTO reading_cards (reading_id, card_id, card_name, position, interpretation, card_order, position_x, position_y, rotation, reversed) VALUES (?, (SELECT id FROM cards WHERE name = ?), ?, ?, ?, ?, ?, ?, ?, ?)",
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
              card.reversed ? 1 : 0,
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
router.delete("/:id", (req, res) => {
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

export default router;
