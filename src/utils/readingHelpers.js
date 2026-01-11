/** @typedef {import('../types.js').Reading} Reading */
/** @typedef {import('../../spreads.js').SpreadTemplate} SpreadTemplate */

/**
 * Reading with filled_positions from the list query
 * @typedef {Reading & { filled_positions: number }} ReadingFromQuery
 */

/**
 * Determines if a reading is incomplete based on its spread template and filled positions
 *
 * @param {ReadingFromQuery} reading - The reading object with filled_positions
 * @param {Record<string, SpreadTemplate>} spreadTemplates - The spread templates lookup object
 * @returns {boolean} - Whether the reading is incomplete
 */
function isReadingIncomplete(reading, spreadTemplates) {
  const template = spreadTemplates[reading.spread_template_id];
  const expectedCount = template?.cardCount ?? 0;

  // A reading is incomplete if it has fewer filled positions than expected
  return reading.filled_positions < expectedCount;
}

/**
 * Adds is_incomplete flag to a list of readings
 *
 * @param {ReadingFromQuery[]} readings - Array of reading objects
 * @param {Record<string, SpreadTemplate>} spreadTemplates - The spread templates lookup object
 * @returns {(ReadingFromQuery & { is_incomplete: boolean })[]} - Readings with is_incomplete flag added
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
