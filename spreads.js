// Spread template definitions
const SPREAD_TEMPLATES = {
  "celtic-cross": {
    id: "celtic-cross",
    name: "Celtic Cross",
    cardCount: 10,
    positions: [
      {
        order: 1,
        label: "Where you are right now",
        defaultX: 280,
        defaultY: 285,
      },
      {
        order: 2,
        label: "Potential/challenges",
        defaultX: 280,
        defaultY: 285,
        rotation: 90,
      }, // Crosses card 1 horizontally
      { order: 3, label: "What to focus on", defaultX: 280, defaultY: 115 },
      { order: 4, label: "Your past", defaultX: 140, defaultY: 285 },
      { order: 5, label: "Your strengths", defaultX: 280, defaultY: 455 },
      { order: 6, label: "Near future", defaultX: 420, defaultY: 285 },
      { order: 7, label: "Suggested approach", defaultX: 600, defaultY: 545 },
      {
        order: 8,
        label: "What you need to know",
        defaultX: 600,
        defaultY: 375,
      },
      { order: 9, label: "Hopes and fears", defaultX: 600, defaultY: 205 },
      {
        order: 10,
        label: "Your potential future",
        defaultX: 600,
        defaultY: 35,
      },
    ],
  },
  custom: {
    id: "custom",
    name: "Custom Spread",
    cardCount: null, // Variable
    positions: [], // User-defined
  },
};

module.exports = { SPREAD_TEMPLATES };
