import express from "express";
import { SPREAD_TEMPLATES } from "../../spreads.js";

const router = express.Router();

// Get all spread templates (public)
router.get("/", (req, res) => {
  res.json(Object.values(SPREAD_TEMPLATES));
});

export default router;
