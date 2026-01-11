/**
 * Determines if a reading is incomplete based on its spread template and card data
 *
 * @param {Object} reading - The reading object with card_count, empty_positions, and spread_template_id
 * @param {Object} spreadTemplates - The spread templates lookup object
 * @returns {boolean} - Whether the reading is incomplete
 */
function isReadingIncomplete(reading, spreadTemplates) {
  // Check if spread has a template
  if (reading.spread_template_id) {
    const template = spreadTemplates[reading.spread_template_id];
    if (template && template.cardCount) {
      // For templated spreads, check if card count matches expected count
      // and if there are any empty positions
      return (
        reading.card_count < template.cardCount || reading.empty_positions > 0
      );
    } else {
      // For custom spreads, just check for empty positions
      return reading.empty_positions > 0;
    }
  } else {
    // For spreads without a template, check for empty positions
    return reading.empty_positions > 0;
  }
}

/**
 * Adds is_incomplete flag to a list of readings
 *
 * @param {Array} readings - Array of reading objects
 * @param {Object} spreadTemplates - The spread templates lookup object
 * @returns {Array} - Readings with is_incomplete flag added
 */
function addCompletionStatus(readings, spreadTemplates) {
  return readings.map((reading) => ({
    ...reading,
    is_incomplete: isReadingIncomplete(reading, spreadTemplates),
  }));
}

/**
 * Normalizes querent value - defaults to "Myself" if empty/null, capitalizes each word
 *
 * @param {string|null|undefined} querent - The querent value
 * @returns {string} - Normalized querent value
 */
function normalizeQuerent(querent) {
  const trimmed = (querent || "").trim();
  if (!trimmed) return "Myself";

  // Capitalize first letter of each word
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export { addCompletionStatus, isReadingIncomplete, normalizeQuerent };
