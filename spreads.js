// Spread template definitions
const SPREAD_TEMPLATES = {
  'celtic-cross': {
    id: 'celtic-cross',
    name: 'Celtic Cross',
    cardCount: 10,
    positions: [
      { order: 1, label: 'Where you are right now', defaultX: 250, defaultY: 200 },
      { order: 2, label: 'Potential/challenges', defaultX: 250, defaultY: 200 }, // Crosses card 1
      { order: 3, label: 'What to focus on', defaultX: 250, defaultY: 80 },
      { order: 4, label: 'Your past', defaultX: 150, defaultY: 200 },
      { order: 5, label: 'Your strengths', defaultX: 250, defaultY: 320 },
      { order: 6, label: 'Near future', defaultX: 350, defaultY: 200 },
      { order: 7, label: 'Suggested approach', defaultX: 500, defaultY: 320 },
      { order: 8, label: 'What you need to know', defaultX: 500, defaultY: 240 },
      { order: 9, label: 'Hopes and fears', defaultX: 500, defaultY: 160 },
      { order: 10, label: 'Your potential future', defaultX: 500, defaultY: 80 }
    ]
  },
  'custom': {
    id: 'custom',
    name: 'Custom Spread',
    cardCount: null, // Variable
    positions: [] // User-defined
  }
};

module.exports = { SPREAD_TEMPLATES };
