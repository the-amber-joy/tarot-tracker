// Spread template definitions
const SPREAD_TEMPLATES = {
  "celtic-cross": {
    id: "celtic-cross",
    name: "Celtic Cross",
    cardCount: 10,
    positions: [
      {
        order: 1,
        label: "The Present",
        defaultX: 280,
        defaultY: 285,
      },
      {
        order: 2,
        label: "The Challenge",
        defaultX: 280,
        defaultY: 285,
        rotation: 90,
      }, // Crosses card 1 horizontally
      {
        order: 3,
        label: "Past",
        defaultX: 140,
        defaultY: 285,
      },
      { order: 4, label: "Future", defaultX: 420, defaultY: 285 },
      { order: 5, label: "Conscious", defaultX: 280, defaultY: 115 },
      { order: 6, label: "Subconscious", defaultX: 280, defaultY: 455 },
      { order: 7, label: "Your Influence", defaultX: 600, defaultY: 545 },
      {
        order: 8,
        label: "External Influence",
        defaultX: 600,
        defaultY: 375,
      },
      { order: 9, label: "Hopes & fears", defaultX: 600, defaultY: 205 },
      {
        order: 10,
        label: "Outcome",
        defaultX: 600,
        defaultY: 35,
      },
    ],
  },
  "five-card": {
    id: "five-card",
    name: "Five Card Spread",
    cardCount: 5,
    positions: [
      { order: 1, label: "Present Situation", defaultX: 350, defaultY: 250 },
      { order: 2, label: "Challenge/Obstacle", defaultX: 350, defaultY: 80 },
      { order: 3, label: "Past Influences", defaultX: 200, defaultY: 250 },
      { order: 4, label: "Future Influences", defaultX: 500, defaultY: 250 },
      { order: 5, label: "Outcome", defaultX: 350, defaultY: 420 },
    ],
  },
  horseshoe: {
    id: "horseshoe",
    name: "Horseshoe Spread",
    cardCount: 7,
    positions: [
      { order: 1, label: "Past", defaultX: 150, defaultY: 450 },
      { order: 2, label: "Present", defaultX: 220, defaultY: 280 },
      { order: 3, label: "Hidden Influences", defaultX: 300, defaultY: 120 },
      { order: 4, label: "Obstacles", defaultX: 400, defaultY: 50 },
      { order: 5, label: "External Influences", defaultX: 500, defaultY: 120 },
      { order: 6, label: "Advice", defaultX: 580, defaultY: 280 },
      { order: 7, label: "Outcome", defaultX: 650, defaultY: 450 },
    ],
  },
  relationship: {
    id: "relationship",
    name: "Relationship Spread",
    cardCount: 6,
    positions: [
      { order: 1, label: "You", defaultX: 200, defaultY: 250 },
      { order: 2, label: "Them", defaultX: 500, defaultY: 250 },
      { order: 3, label: "The Relationship", defaultX: 350, defaultY: 250 },
      { order: 4, label: "Strengths", defaultX: 350, defaultY: 80 },
      { order: 5, label: "Challenges", defaultX: 350, defaultY: 420 },
      { order: 6, label: "Outcome", defaultX: 350, defaultY: 540 },
    ],
  },
  "single-card": {
    id: "single-card",
    name: "Single Card",
    cardCount: 1,
    positions: [{ order: 1, label: "Guidance", defaultX: 350, defaultY: 250 }],
  },
  "three-card": {
    id: "three-card",
    name: "Three Card Spread",
    cardCount: 3,
    positions: [
      { order: 1, label: "Past", defaultX: 200, defaultY: 250 },
      { order: 2, label: "Present", defaultX: 350, defaultY: 250 },
      { order: 3, label: "Future", defaultX: 500, defaultY: 250 },
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
