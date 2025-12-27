/**
 * Centralized color palette for all charts in the application
 * Change colors here to update the entire theme
 */

// Suit colors (used in pie chart and grouped bar chart)
export const suitColors = {
  majorArcana: {
    background: "rgba(123, 68, 191, 0.7)",
    border: "rgba(123, 68, 191, 1)",
  },
  wands: {
    background: "rgba(255, 99, 71, 0.7)", // Fire - red/orange
    border: "rgba(255, 99, 71, 1)",
  },
  cups: {
    background: "rgba(65, 105, 225, 0.7)", // Water - blue
    border: "rgba(65, 105, 225, 1)",
  },
  swords: {
    background: "rgba(135, 206, 235, 0.7)", // Air - light blue
    border: "rgba(135, 206, 235, 1)",
  },
  pentacles: {
    background: "rgba(139, 69, 19, 0.7)", // Earth - brown
    border: "rgba(139, 69, 19, 1)",
  },
};

// Element colors (Fire, Earth, Air, Water)
export const elementColors = {
  backgrounds: [
    "rgba(255, 99, 71, 0.7)", // Fire - red/orange
    "rgba(139, 69, 19, 0.7)", // Earth - brown
    "rgba(135, 206, 235, 0.7)", // Air - light blue
    "rgba(65, 105, 225, 0.7)", // Water - blue
  ],
  borders: [
    "rgba(255, 99, 71, 1)",
    "rgba(139, 69, 19, 1)",
    "rgba(135, 206, 235, 1)",
    "rgba(65, 105, 225, 1)",
  ],
};

// Top 15 cards colors (vibrant multi-color palette)
export const cardFrequencyColors = {
  backgrounds: [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(199, 199, 199, 0.7)",
    "rgba(83, 102, 255, 0.7)",
    "rgba(255, 99, 255, 0.7)",
    "rgba(99, 255, 132, 0.7)",
    "rgba(255, 206, 132, 0.7)",
    "rgba(132, 162, 235, 0.7)",
    "rgba(235, 132, 192, 0.7)",
    "rgba(192, 235, 132, 0.7)",
    "rgba(132, 192, 235, 0.7)",
  ],
  borders: [
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
    "rgba(255, 159, 64, 1)",
    "rgba(199, 199, 199, 1)",
    "rgba(83, 102, 255, 1)",
    "rgba(255, 99, 255, 1)",
    "rgba(99, 255, 132, 1)",
    "rgba(255, 206, 132, 1)",
    "rgba(132, 162, 235, 1)",
    "rgba(235, 132, 192, 1)",
    "rgba(192, 235, 132, 1)",
    "rgba(132, 192, 235, 1)",
  ],
};

// Helper function to get suit colors as arrays for grouped bar chart
export function getSuitColorsArray(includeMajorArcana: boolean = true) {
  const suits = includeMajorArcana
    ? [
        suitColors.majorArcana,
        suitColors.wands,
        suitColors.cups,
        suitColors.swords,
        suitColors.pentacles,
      ]
    : [
        suitColors.wands,
        suitColors.cups,
        suitColors.swords,
        suitColors.pentacles,
      ];

  return {
    backgrounds: suits.map((s) => s.background),
    borders: suits.map((s) => s.border),
  };
}
