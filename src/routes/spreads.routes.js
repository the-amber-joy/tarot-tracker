const express = require("express");
const router = express.Router();
const { SPREAD_TEMPLATES } = require("../../spreads");

// Get all spread templates (public)
router.get("/", (req, res) => {
  res.json(Object.values(SPREAD_TEMPLATES));
});

module.exports = router;
