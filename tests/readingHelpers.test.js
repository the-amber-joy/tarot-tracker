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
      it("should return false when filled positions matches template cardCount", () => {
        const reading = {
          spread_template_id: "three-card",
          filled_positions: 3,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return true when filled positions is less than template requires", () => {
        const reading = {
          spread_template_id: "celtic-cross",
          filled_positions: 5,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });

      it("should return false when filled positions exceeds template cardCount", () => {
        const reading = {
          spread_template_id: "three-card",
          filled_positions: 5,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return true when no cards are filled", () => {
        const reading = {
          spread_template_id: "celtic-cross",
          filled_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(true);
      });
    });

    describe("with custom spreads (no cardCount)", () => {
      it("should return false for custom spread with any filled positions", () => {
        const reading = {
          spread_template_id: "custom",
          filled_positions: 5,
        };
        // custom template has no cardCount, so expectedCount is 0
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return false for custom spread with zero filled positions", () => {
        const reading = {
          spread_template_id: "custom",
          filled_positions: 0,
        };
        // 0 >= 0 (expectedCount) means complete
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });
    });

    describe("with unknown template", () => {
      it("should return false with unknown template (defaults to 0 expected)", () => {
        const reading = {
          spread_template_id: "unknown-template",
          filled_positions: 5,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should return false with unknown template and zero filled", () => {
        const reading = {
          spread_template_id: "unknown-template",
          filled_positions: 0,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });
    });

    describe("without spread template", () => {
      it("should return false when no spread_template_id", () => {
        const reading = {
          spread_template_id: null,
          filled_positions: 3,
        };
        expect(isReadingIncomplete(reading, SPREAD_TEMPLATES)).toBe(false);
      });

      it("should handle undefined spread_template_id", () => {
        const reading = {
          filled_positions: 3,
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
          filled_positions: 3,
        },
        {
          id: 2,
          spread_template_id: "three-card",
          filled_positions: 2,
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
          filled_positions: 3,
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
