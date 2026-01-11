import express from "express";
import db from "../../database.js";

const router = express.Router();

// Get card frequency statistics
router.get("/card-frequency", (req, res) => {
  const { startDate, endDate, querent } = req.query;

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

  if (querent) {
    query += ` AND LOWER(r.querent) = LOWER(?)`;
    params.push(querent);
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
router.get("/suit-distribution", (req, res) => {
  const { startDate, endDate, querent } = req.query;

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

  if (querent) {
    query += ` AND LOWER(r.querent) = LOWER(?)`;
    params.push(querent);
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
router.get("/suit-frequency-over-time", (req, res) => {
  const { startDate, endDate, groupBy, querent } = req.query;

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

  if (querent) {
    query += ` AND LOWER(r.querent) = LOWER(?)`;
    params.push(querent);
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
router.get("/number-distribution", (req, res) => {
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
router.get("/analytics", (req, res) => {
  const { startDate, endDate, querent } = req.query;

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

  if (querent) {
    dateFilter += " AND LOWER(r.querent) = LOWER(?)";
    dateParams.push(querent);
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

export default router;
