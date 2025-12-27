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
    background: "rgba(34, 139, 34, 0.7)", // Earth - green
    border: "rgba(34, 139, 34, 1)",
  },
};

// Helper function to get suit colors as arrays for grouped bar chart
export function getSuitColorsArray(includeMajorArcana: boolean = true) {
  const suits = includeMajorArcana
    ? [
        suitColors.wands,
        suitColors.cups,
        suitColors.swords,
        suitColors.pentacles,
        suitColors.majorArcana,
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
