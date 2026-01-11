import express from "express";
import db from "../../database.js";

const router = express.Router();

// Get all decks (user's own decks only)
router.get("/", (req, res) => {
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
router.post("/", (req, res) => {
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
router.put("/:id", (req, res) => {
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
router.delete("/:id", (req, res) => {
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

export default router;
