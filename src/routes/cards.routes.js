const express = require("express");
const router = express.Router();
const db = require("../../database");
const { TAROT_CARDS } = require("../../cards");

// Get all tarot cards (public)
router.get("/", (req, res) => {
  res.json(TAROT_CARDS);
});

// Get a single card by name with full details (public)
router.get("/:name", (req, res) => {
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

module.exports = router;
