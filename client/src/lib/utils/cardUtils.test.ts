import { describe, expect, it } from "vitest";
import type { ReadingCardsMap } from "../../types/reading";
import {
  getDefaultTitle,
  getDisplayDeckName,
  normalizeDeckName,
  readingCardsMapToApiCards,
} from "./cardUtils";

describe("cardUtils", () => {
  describe("readingCardsMapToApiCards", () => {
    it("should transform reading cards map to API format", () => {
      const cardsMap: ReadingCardsMap = {
        0: {
          card_order: 0,
          card_name: "The Fool",
          position: "Present",
          interpretation: "New beginnings",
          position_x: 100,
          position_y: 200,
          rotation: 0,
          reversed: false,
        },
        1: {
          card_order: 1,
          card_name: "The Magician",
          position: "Challenge",
          interpretation: "Skill",
          position_x: 300,
          position_y: 200,
          rotation: 90,
          reversed: true,
        },
      };

      const result = readingCardsMapToApiCards(cardsMap);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        card_order: 0,
        position: "Present",
        card_name: "The Fool",
        interpretation: "New beginnings",
        position_x: 100,
        position_y: 200,
        rotation: 0,
        reversed: false,
      });
    });

    it("should default empty card_name and interpretation to empty string", () => {
      const cardsMap: ReadingCardsMap = {
        0: {
          card_order: 0,
          card_name: "",
          position: "",
          interpretation: "",
          position_x: null,
          position_y: null,
          rotation: 0,
          reversed: false,
        },
      };

      const result = readingCardsMapToApiCards(cardsMap);

      expect(result[0].card_name).toBe("");
      expect(result[0].interpretation).toBe("");
    });

    it("should default rotation to 0 when undefined", () => {
      const cardsMap: ReadingCardsMap = {
        0: {
          card_order: 0,
          card_name: "The Fool",
          position: "Present",
          interpretation: "",
          position_x: null,
          position_y: null,
          rotation: undefined as any,
          reversed: false,
        },
      };

      const result = readingCardsMapToApiCards(cardsMap);

      expect(result[0].rotation).toBe(0);
    });
  });

  describe("normalizeDeckName", () => {
    it('should return empty string for "No Deck Specified"', () => {
      expect(normalizeDeckName("No Deck Specified")).toBe("");
    });

    it("should return the deck name unchanged for other values", () => {
      expect(normalizeDeckName("Rider-Waite")).toBe("Rider-Waite");
      expect(normalizeDeckName("My Custom Deck")).toBe("My Custom Deck");
    });

    it("should return empty string unchanged", () => {
      expect(normalizeDeckName("")).toBe("");
    });

    it("should handle null or undefined gracefully", () => {
      expect(normalizeDeckName(null as any)).toBe(null);
      expect(normalizeDeckName(undefined as any)).toBe(undefined);
    });
  });

  describe("getDisplayDeckName", () => {
    it('should return "No Deck Specified" for empty string', () => {
      expect(getDisplayDeckName("")).toBe("No Deck Specified");
    });

    it("should return the deck name for non-empty values", () => {
      expect(getDisplayDeckName("Rider-Waite")).toBe("Rider-Waite");
    });

    it("should return 'No Deck Specified' for null or undefined", () => {
      expect(getDisplayDeckName(null as any)).toBe("No Deck Specified");
      expect(getDisplayDeckName(undefined as any)).toBe("No Deck Specified");
    });
  });

  describe("getDefaultTitle", () => {
    it("should return provided title if not empty", () => {
      expect(getDefaultTitle("My Reading", "celtic-cross")).toBe("My Reading");
    });

    it("should return template name for known templates", () => {
      expect(getDefaultTitle("", "five-card")).toBe("Five Card Spread");
    });

    it('should return "Custom Spread" for unknown templates', () => {
      expect(getDefaultTitle("", "custom")).toBe("Custom Spread");
      expect(getDefaultTitle("", "unknown-template")).toBe("Custom Spread");
      expect(getDefaultTitle("", "")).toBe("Custom Spread");
    });
  });
});
