import type { ReadingCard, ReadingCardsMap } from "../../types/reading";

/**
 * Transforms reading cards map back into API format for submission
 */
export function readingCardsMapToApiCards(
  cardsMap: ReadingCardsMap,
): ReadingCard[] {
  return Object.entries(cardsMap).map(([indexStr, card]) => ({
    card_order: parseInt(indexStr),
    position: card.position || "",
    card_name: card.card_name || "",
    interpretation: card.interpretation || "",
    position_x: card.position_x,
    position_y: card.position_y,
    rotation: card.rotation || 0,
    reversed: card.reversed || false,
  }));
}

/**
 * Normalizes deck name - returns empty string for "No Deck Specified"
 */
export function normalizeDeckName(deckName: string): string {
  return deckName === "No Deck Specified" ? "" : deckName;
}

/**
 * Returns display deck name - defaults to "No Deck Specified" if empty
 */
export function getDisplayDeckName(deckName: string): string {
  return deckName || "No Deck Specified";
}

/**
 * Generates a default title based on spread template
 */
export function getDefaultTitle(
  title: string,
  spreadTemplateName: string,
): string {
  if (title) return title;

  const templateTitles: Record<string, string> = {
    "celtic-cross": "Celtic Cross",
    "three-card": "Three Card Spread",
    "five-card": "Five Card Spread",
    horseshoe: "Horseshoe Spread",
    relationship: "Relationship Spread",
    "single-card": "Single Card",
  };

  return templateTitles[spreadTemplateName] || "Custom Spread";
}
