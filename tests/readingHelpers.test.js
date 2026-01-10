import { describe, expect, it } from "vitest";
import { SPREAD_TEMPLATES } from "../spreads.js";
import {
  addCompletionStatus,
  isReadingIncomplete,
  normalizeQuerent,
} from "../src/utils/readingHelpers.js";

describe("Reading Helpers", () => {
  describe("isReadingIncomplete", () => {
    describe("with templated spreads", () => {
      it("should return false when card count matches template and no empty positions", () => {
        const reading = {
          spread_template_id: "three-card",
          card_count: 3,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      // FIXME: This is confusing. If the template requires 10 cards, and the count is 5, how could there be 0 empty positions?
      it("should return true when card count is less than template requires", () => {
        const reading = {
          spread_template_id: "celtic-cross",
          card_count: 5,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });

      it("should return true when there are empty positions", () => {
        const reading = {
          spread_template_id: "three-card",
          card_count: 3,
          empty_positions: 1,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });

      it("should return true when both card count is low and has empty positions", () => {
        const reading = {
          spread_template_id: "celtic-cross",
          card_count: 8,
          empty_positions: 2,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });
    });

    describe("with custom spreads (no cardCount)", () => {
      it("should return false when no empty positions", () => {
        const reading = {
          spread_template_id: "custom",
          card_count: 5,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return true when there are empty positions", () => {
        const reading = {
          spread_template_id: "custom",
          card_count: 5,
          empty_positions: 2,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });
    });

    describe("with unknown template", () => {
      it("should return false when no empty positions with unknown template", () => {
        const reading = {
          spread_template_id: "unknown-template",
          card_count: 5,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return true when there are empty positions with unknown template", () => {
        const reading = {
          spread_template_id: "unknown-template",
          card_count: 5,
          empty_positions: 1,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });
    });

    describe("without spread template", () => {
      it("should return false when no spread_template_id and no empty positions", () => {
        const reading = {
          spread_template_id: null,
          card_count: 3,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return true when no spread_template_id but has empty positions", () => {
        const reading = {
          spread_template_id: null,
          card_count: 3,
          empty_positions: 1,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });

      it("should handle undefined spread_template_id", () => {
        const reading = {
          card_count: 3,
          empty_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });
    });
  });

  describe("addCompletionStatus", () => {
    it("should add is_incomplete flag to each reading", () => {
      const readings = [
        {
          id: 1,
          spread_template_id: "three-card",
          card_count: 3,
          empty_positions: 0,
        },
        {
          id: 2,
          spread_template_id: "three-card",
          card_count: 2,
          empty_positions: 1,
        },
      ];

      const withCompletionStatus = addCompletionStatus(
        readings,
        SPREAD_TEMPLATES,
      );

      expect(withCompletionStatus).toHaveLength(2);
      expect(withCompletionStatus[0].is_incomplete).toBe(false);
      expect(withCompletionStatus[1].is_incomplete).toBe(true);
    });

    it("should preserve all original properties", () => {
      const readings = [
        {
          id: 1,
          title: "My Reading",
          date: "2025-01-01",
          spread_template_id: "three-card",
          card_count: 3,
          empty_positions: 0,
        },
      ];

      const withCompletionStatus = addCompletionStatus(
        readings,
        SPREAD_TEMPLATES,
      );

      expect(withCompletionStatus[0].id).toBe(1);
      expect(withCompletionStatus[0].title).toBe("My Reading");
      expect(withCompletionStatus[0].date).toBe("2025-01-01");
      expect(withCompletionStatus[0]).toHaveProperty("is_incomplete");
    });

    it("should handle empty array", () => {
      const withCompletionStatus = addCompletionStatus([], SPREAD_TEMPLATES);
      expect(withCompletionStatus).toEqual([]);
    });
  });

  describe("normalizeQuerent", () => {
    it("should return 'Myself' for null input", () => {
      expect(normalizeQuerent(null)).toBe("Myself");
    });

    it("should return 'Myself' for undefined input", () => {
      expect(normalizeQuerent(undefined)).toBe("Myself");
    });

    it("should return 'Myself' for empty string", () => {
      expect(normalizeQuerent("")).toBe("Myself");
    });

    it("should return 'Myself' for whitespace-only string", () => {
      expect(normalizeQuerent("   ")).toBe("Myself");
    });

    it("should return trimmed value for valid input", () => {
      expect(normalizeQuerent("  John  ")).toBe("John");
    });

    it("should return value as-is when already trimmed", () => {
      expect(normalizeQuerent("Sarah")).toBe("Sarah");
    });

    it("should handle lowercase names", () => {
      expect(normalizeQuerent("alice")).toBe("Alice");
    });

    it("should capitalize multi-word names", () => {
      expect(normalizeQuerent("john doe")).toBe("John Doe");
    });

    it("should normalize all-caps names", () => {
      expect(normalizeQuerent("JOHN DOE")).toBe("John Doe");
    });

    it("should handle 'Myself' input correctly", () => {
      expect(normalizeQuerent("Myself")).toBe("Myself");
    });
  });
});
