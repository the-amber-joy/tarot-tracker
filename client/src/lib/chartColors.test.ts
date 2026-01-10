import { describe, expect, it } from "vitest";
import { getSuitColorsArray, suitColors } from "./chartColors";

describe("suitColors", () => {
  it("should have all five suit color definitions", () => {
    expect(suitColors).toHaveProperty("majorArcana");
    expect(suitColors).toHaveProperty("wands");
    expect(suitColors).toHaveProperty("cups");
    expect(suitColors).toHaveProperty("swords");
    expect(suitColors).toHaveProperty("pentacles");
  });

  it("each suit should have background and border colors", () => {
    Object.values(suitColors).forEach((suit) => {
      expect(suit).toHaveProperty("background");
      expect(suit).toHaveProperty("border");
      expect(suit.background).toMatch(/^rgba\(/);
      expect(suit.border).toMatch(/^rgba\(/);
    });
  });
});

describe("getSuitColorsArray", () => {
  it("should return 5 colors when includeMajorArcana is true", () => {
    const result = getSuitColorsArray(true);

    expect(result.backgrounds).toHaveLength(5);
    expect(result.borders).toHaveLength(5);
  });

  it("should return 4 colors when includeMajorArcana is false", () => {
    const result = getSuitColorsArray(false);

    expect(result.backgrounds).toHaveLength(4);
    expect(result.borders).toHaveLength(4);
  });

  it("should default to including Major Arcana", () => {
    const result = getSuitColorsArray();

    expect(result.backgrounds).toHaveLength(5);
    expect(result.borders).toHaveLength(5);
  });

  it("should include Major Arcana color first when included", () => {
    const result = getSuitColorsArray(true);

    expect(result.backgrounds[0]).toBe(suitColors.majorArcana.background);
    expect(result.borders[0]).toBe(suitColors.majorArcana.border);
  });

  it("should return suits in order: Wands, Cups, Swords, Pentacles when Major Arcana excluded", () => {
    const result = getSuitColorsArray(false);

    expect(result.backgrounds[0]).toBe(suitColors.wands.background);
    expect(result.backgrounds[1]).toBe(suitColors.cups.background);
    expect(result.backgrounds[2]).toBe(suitColors.swords.background);
    expect(result.backgrounds[3]).toBe(suitColors.pentacles.background);

    expect(result.borders[0]).toBe(suitColors.wands.border);
    expect(result.borders[1]).toBe(suitColors.cups.border);
    expect(result.borders[2]).toBe(suitColors.swords.border);
    expect(result.borders[3]).toBe(suitColors.pentacles.border);
  });
});
