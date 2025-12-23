const express = require("express");
const path = require("path");
const db = require("./database");
const { TAROT_CARDS } = require("./cards");
const { SPREAD_TEMPLATES } = require("./spreads");

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static("public"));

// API Routes

// Get all tarot cards
app.get("/api/cards", (req, res) => {
  res.json(TAROT_CARDS);
});

// Get all spread templates
app.get("/api/spreads", (req, res) => {
  res.json(Object.values(SPREAD_TEMPLATES));
});

// Deck management endpoints

// Get all decks
app.get("/api/decks", (req, res) => {
  db.all("SELECT * FROM decks ORDER BY name", [], (err, decks) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(decks);
  });
});

// Add a new deck
app.post("/api/decks", (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Deck name is required" });
  }

  db.run("INSERT INTO decks (name) VALUES (?)", [name.trim()], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Deck name already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({
      id: this.lastID,
      name: name.trim(),
      message: "Deck added successfully",
    });
  });
});

// Delete a deck
app.delete("/api/decks/:id", (req, res) => {
  db.run("DELETE FROM decks WHERE id = ?", [req.params.id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Deck not found" });
    }
    res.json({ message: "Deck deleted successfully" });
  });
});

// Get all readings (for summary table)
app.get("/api/readings", (req, res) => {
  db.all(
    `
    SELECT 
      r.id,
      r.date,
      r.time,
      r.spread_name,
      r.deck_name,
      r.notes,
      COUNT(rc.id) as card_count
    FROM readings r
    LEFT JOIN reading_cards rc ON r.id = rc.reading_id
    GROUP BY r.id
    ORDER BY r.date DESC, r.time DESC
  `,
    [],
    (err, readings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(readings);
    },
  );
});

// Get a single reading with all its cards
app.get("/api/readings/:id", (req, res) => {
  db.get(
    "SELECT * FROM readings WHERE id = ?",
    [req.params.id],
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
app.post("/api/readings", (req, res) => {
  const {
    date,
    time,
    spread_name,
    spread_template_id,
    deck_name,
    notes,
    cards,
  } = req.body;

  db.run(
    "INSERT INTO readings (date, time, spread_name, spread_template_id, deck_name, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [date, time, spread_name, spread_template_id, deck_name, notes],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const readingId = this.lastID;

      // Insert cards
      const stmt = db.prepare(
        "INSERT INTO reading_cards (reading_id, card_name, position, interpretation, card_order, position_x, position_y, rotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      );

      cards.forEach((card, index) => {
        stmt.run(
          readingId,
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
app.put("/api/readings/:id", (req, res) => {
  const {
    date,
    time,
    spread_name,
    spread_template_id,
    deck_name,
    notes,
    cards,
  } = req.body;

  db.run(
    "UPDATE readings SET date = ?, time = ?, spread_name = ?, spread_template_id = ?, deck_name = ?, notes = ? WHERE id = ?",
    [
      date,
      time,
      spread_name,
      spread_template_id,
      deck_name,
      notes,
      req.params.id,
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

          // Insert updated cards
          const stmt = db.prepare(
            "INSERT INTO reading_cards (reading_id, card_name, position, interpretation, card_order, position_x, position_y, rotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          );

          cards.forEach((card, index) => {
            stmt.run(
              req.params.id,
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
app.delete("/api/readings/:id", (req, res) => {
  db.run(
    "DELETE FROM reading_cards WHERE reading_id = ?",
    [req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run("DELETE FROM readings WHERE id = ?", [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Reading deleted successfully" });
      });
    },
  );
});

app.listen(PORT, () => {
  console.log(`Tarot Stats server running on http://localhost:${PORT}`);
});
