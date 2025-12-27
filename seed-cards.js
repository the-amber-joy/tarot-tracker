const db = require("./database");
const { TAROT_CARDS } = require("./cards");
const { promisify } = require("util");

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

async function seedReferenceTablesAndCards() {
  console.log("🌟 Seeding reference tables and cards...\n");

  // Wait for database initialization to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // 1. Seed qualities
    console.log("Seeding qualities...");
    const qualities = ["Cardinal", "Fixed", "Mutable"];
    for (const quality of qualities) {
      await dbRun("INSERT OR IGNORE INTO qualities (name) VALUES (?)", [
        quality,
      ]);
    }
    console.log("✓ Qualities seeded\n");

    // 2. Seed planets
    console.log("Seeding planets...");
    const planets = [
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
    ];
    for (const planet of planets) {
      await dbRun("INSERT OR IGNORE INTO planets (name) VALUES (?)", [planet]);
    }
    console.log("✓ Planets seeded\n");

    // 3. Seed zodiac signs with qualities and planetary rulers
    console.log("Seeding zodiac signs...");
    const zodiacSigns = [
      { name: "Aries", quality: "Cardinal", planet: "Mars" },
      { name: "Taurus", quality: "Fixed", planet: "Venus" },
      { name: "Gemini", quality: "Mutable", planet: "Mercury" },
      { name: "Cancer", quality: "Cardinal", planet: "Moon" },
      { name: "Leo", quality: "Fixed", planet: "Sun" },
      { name: "Virgo", quality: "Mutable", planet: "Mercury" },
      { name: "Libra", quality: "Cardinal", planet: "Venus" },
      { name: "Scorpio", quality: "Fixed", planet: "Pluto" },
      { name: "Sagittarius", quality: "Mutable", planet: "Jupiter" },
      { name: "Capricorn", quality: "Cardinal", planet: "Saturn" },
      { name: "Aquarius", quality: "Fixed", planet: "Uranus" },
      { name: "Pisces", quality: "Mutable", planet: "Neptune" },
    ];

    const qualityMap = {};
    const qualityRows = await dbAll("SELECT id, name FROM qualities");
    qualityRows.forEach((q) => (qualityMap[q.name] = q.id));

    const planetMap = {};
    const planetRows = await dbAll("SELECT id, name FROM planets");
    planetRows.forEach((p) => (planetMap[p.name] = p.id));

    for (const sign of zodiacSigns) {
      const qualityId = qualityMap[sign.quality];
      const planetId = planetMap[sign.planet];
      await dbRun(
        "INSERT OR IGNORE INTO zodiac_signs (name, quality_id, planet_id) VALUES (?, ?, ?)",
        [sign.name, qualityId, planetId],
      );
    }
    console.log("✓ Zodiac signs seeded\n");

    // 4. Seed elements with polarity
    console.log("Seeding elements...");
    const elements = [
      { name: "Fire", polarity: "Active" },
      { name: "Earth", polarity: "Passive" },
      { name: "Air", polarity: "Active" },
      { name: "Water", polarity: "Passive" },
    ];

    for (const element of elements) {
      await dbRun(
        "INSERT OR IGNORE INTO elements (name, polarity) VALUES (?, ?)",
        [element.name, element.polarity],
      );
    }
    console.log("✓ Elements seeded\n");

    // 5. Get element IDs for suit associations
    const elementMap = {};
    const elementRows = await dbAll("SELECT id, name FROM elements");
    elementRows.forEach((el) => (elementMap[el.name] = el.id));

    const suitElements = {
      Wands: elementMap["Fire"],
      Cups: elementMap["Water"],
      Swords: elementMap["Air"],
      Pentacles: elementMap["Earth"],
    };

    // 6. Define card keywords
    console.log("Preparing card keywords...");
    const cardKeywords = {
      // Major Arcana
      "The Fool": "innocence, new beginnings, free spirit",
      "The Magician": "willpower, desire, creation, manifestation",
      "The High Priestess": "intuitive, unconscious, inner voice",
      "The Empress": "motherhood, fertility, nature",
      "The Emperor": "authority, structure, control, fatherhood",
      "The Hierophant": "tradition, conformity, morality, ethics",
      "The Lovers": "partnerships, duality, union",
      "The Chariot": "direction, control, willpower",
      Strength: "inner strength, bravery, compassion, focus",
      "The Hermit": "contemplation, search for truth, inner guidance",
      "Wheel of Fortune": "change, cycles, inevitable fate",
      Justice: "cause and effect, clarity, truth",
      "The Hanged Man": "sacrifice, release, martyrdom",
      Death: "end of cycle, beginnings, change, metamorphosis",
      Temperance: "middle path, patience, finding meaning",
      "The Devil": "addiction, materialism, playfulness",
      "The Tower": "sudden upheaval, broken pride, disaster",
      "The Star": "hope, faith, rejuvenation",
      "The Moon": "unconscious, illusions, intuition",
      "The Sun": "joy, success, celebration, positivity",
      Judgement: "reflection, reckoning, awakening",
      "The World": "fulfillment, harmony, completion",
      // Wands
      "Ace of Wands": "creation, willpower, inspiration, desire",
      "Two of Wands": "planning, making decisions, leaving home",
      "Three of Wands": "looking ahead, expansion, rapid growth",
      "Four of Wands": "community, home, celebration",
      "Five of Wands": "competition, rivalry, conflict",
      "Six of Wands": "victory, success, public reward",
      "Seven of Wands": "perseverance, defensive, maintaining control",
      "Eight of Wands": "rapid action, movement, quick decisions",
      "Nine of Wands": "resilience, grit, last stand",
      "Ten of Wands": "accomplishment, responsibility, burden",
      "Page of Wands": "exploration, excitement, freedom",
      "Queen of Wands": "courage, determination, joy",
      "Knight of Wands": "action, adventure, fearlessness",
      "King of Wands": "big picture, leader, overcoming challenges",
      // Cups
      "Ace of Cups": "new feelings, spirituality, intuition",
      "Two of Cups": "unity, partnership, connection",
      "Three of Cups": "friendship, community, happiness",
      "Four of Cups": "apathy, contemplation, disconnectedness",
      "Five of Cups": "loss, grief, self-pity",
      "Six of Cups": "familiarity, happy memories, healing",
      "Seven of Cups": "searching for purpose, choices, daydreaming",
      "Eight of Cups": "walking away, disillusionment, leaving behind",
      "Nine of Cups": "satisfaction, emotional stability, luxury",
      "Ten of Cups": "inner happiness, fulfillment, dreams coming true",
      "Page of Cups": "happy surprise, dreamer, sensitivity",
      "Knight of Cups": "following the heart, idealist, romantic",
      "Queen of Cups": "compassion, calm, comfort",
      "King of Cups": "compassion, control, balance",
      // Swords
      "Ace of Swords": "breakthrough, clarity, sharp mind",
      "Two of Swords": "difficult choices, indecision, stalemate",
      "Three of Swords": "heartbreak, suffering, grief",
      "Four of Swords": "rest, restoration, contemplation",
      "Five of Swords": "unbridled ambition, win at all costs, sneakiness",
      "Six of Swords": "transition, leaving behind, moving on",
      "Seven of Swords": "deception, trickery, tactics and strategy",
      "Eight of Swords": "imprisonment, entrapment, self-victimization",
      "Nine of Swords": "anxiety, hopelessness, trauma",
      "Ten of Swords": "failure, collapse, defeat",
      "Page of Swords": "curiosity, restlessness, mental energy",
      "Queen of Swords": "complexity, perceptiveness, clear mindedness",
      "Knight of Swords": "action, impulsiveness, defending beliefs",
      "King of Swords": "head over heart, discipline, truth",
      // Pentacles
      "Ace of Pentacles": "opportunity, prosperity, new venture",
      "Two of Pentacles": "balancing decisions, priorities, adapting to change",
      "Three of Pentacles": "teamwork, collaboration, building",
      "Four of Pentacles": "conservation, frugality, security",
      "Five of Pentacles": "need, poverty, insecurity",
      "Six of Pentacles": "charity, generosity, sharing",
      "Seven of Pentacles": "hard work, perseverance, diligence",
      "Eight of Pentacles": "apprenticeship, passion, high standards",
      "Nine of Pentacles": "fruits of labor, rewards, luxury",
      "Ten of Pentacles": "legacy, culmination, inheritance",
      "Page of Pentacles": "ambition, desire, diligence",
      "Knight of Pentacles": "efficiency, hard work, responsibility",
      "Queen of Pentacles":
        "practicality, creature comforts, financial security",
      "King of Pentacles": "abundance, prosperity, security",
    };

    // 7. Major Arcana correspondences
    const majorArcanaCorrespondences = {
      "The Fool": { planet: "Uranus", element: "Air" },
      "The Magician": { planet: "Mercury", element: "Air" },
      "The High Priestess": { planet: "Moon", element: "Water" },
      "The Empress": { planet: "Venus", element: "Earth" },
      "The Emperor": { planet: "Mars", sign: "Aries", element: "Fire" },
      "The Hierophant": { planet: "Venus", sign: "Taurus", element: "Earth" },
      "The Lovers": { planet: "Mercury", sign: "Gemini", element: "Air" },
      "The Chariot": { planet: "Moon", sign: "Cancer", element: "Water" },
      Strength: { planet: "Sun", sign: "Leo", element: "Fire" },
      "The Hermit": { planet: "Mercury", sign: "Virgo", element: "Earth" },
      "Wheel of Fortune": { planet: "Jupiter", element: "Fire" },
      Justice: { planet: "Venus", sign: "Libra", element: "Air" },
      "The Hanged Man": { planet: "Neptune", element: "Water" },
      Death: { planet: "Pluto", sign: "Scorpio", element: "Water" },
      Temperance: { planet: "Jupiter", sign: "Sagittarius", element: "Fire" },
      "The Devil": { planet: "Saturn", sign: "Capricorn", element: "Earth" },
      "The Tower": { planet: "Mars", element: "Fire" },
      "The Star": { planet: "Uranus", sign: "Aquarius", element: "Air" },
      "The Moon": { planet: "Neptune", sign: "Pisces", element: "Water" },
      "The Sun": { planet: "Sun", element: "Fire" },
      Judgement: { planet: "Pluto", element: "Fire" },
      "The World": { planet: "Saturn", element: "Earth" },
    };

    // 8. Pip card correspondences (2-10)
    const pipCorrespondences = {
      // Wands
      "Two of Wands": { planet: "Mars", sign: "Aries" },
      "Three of Wands": { planet: "Sun", sign: "Aries" },
      "Four of Wands": { planet: "Venus", sign: "Aries" },
      "Five of Wands": { planet: "Saturn", sign: "Leo" },
      "Six of Wands": { planet: "Jupiter", sign: "Leo" },
      "Seven of Wands": { planet: "Mars", sign: "Leo" },
      "Eight of Wands": { planet: "Mercury", sign: "Sagittarius" },
      "Nine of Wands": { planet: "Moon", sign: "Sagittarius" },
      "Ten of Wands": { planet: "Saturn", sign: "Sagittarius" },
      // Cups
      "Two of Cups": { planet: "Venus", sign: "Cancer" },
      "Three of Cups": { planet: "Mercury", sign: "Cancer" },
      "Four of Cups": { planet: "Moon", sign: "Cancer" },
      "Five of Cups": { planet: "Mars", sign: "Scorpio" },
      "Six of Cups": { planet: "Sun", sign: "Scorpio" },
      "Seven of Cups": { planet: "Venus", sign: "Scorpio" },
      "Eight of Cups": { planet: "Saturn", sign: "Pisces" },
      "Nine of Cups": { planet: "Jupiter", sign: "Pisces" },
      "Ten of Cups": { planet: "Mars", sign: "Pisces" },
      // Swords
      "Two of Swords": { planet: "Moon", sign: "Libra" },
      "Three of Swords": { planet: "Saturn", sign: "Libra" },
      "Four of Swords": { planet: "Jupiter", sign: "Libra" },
      "Five of Swords": { planet: "Venus", sign: "Aquarius" },
      "Six of Swords": { planet: "Mercury", sign: "Aquarius" },
      "Seven of Swords": { planet: "Moon", sign: "Aquarius" },
      "Eight of Swords": { planet: "Jupiter", sign: "Gemini" },
      "Nine of Swords": { planet: "Mars", sign: "Gemini" },
      "Ten of Swords": { planet: "Sun", sign: "Gemini" },
      // Pentacles
      "Two of Pentacles": { planet: "Jupiter", sign: "Capricorn" },
      "Three of Pentacles": { planet: "Mars", sign: "Capricorn" },
      "Four of Pentacles": { planet: "Sun", sign: "Capricorn" },
      "Five of Pentacles": { planet: "Mercury", sign: "Taurus" },
      "Six of Pentacles": { planet: "Moon", sign: "Taurus" },
      "Seven of Pentacles": { planet: "Saturn", sign: "Taurus" },
      "Eight of Pentacles": { planet: "Sun", sign: "Virgo" },
      "Nine of Pentacles": { planet: "Venus", sign: "Virgo" },
      "Ten of Pentacles": { planet: "Mercury", sign: "Virgo" },
    };

    // Get zodiac sign IDs
    const zodiacMap = {};
    const zodiacRows = await dbAll("SELECT id, name FROM zodiac_signs");
    zodiacRows.forEach((z) => (zodiacMap[z.name] = z.id));

    // 9. Insert all cards with basic info
    console.log("Seeding cards...");
    for (const card of TAROT_CARDS) {
      let elementId = suitElements[card.suit] || null;

      // For Major Arcana, use the element from correspondences
      if (
        card.suit === "Major Arcana" &&
        majorArcanaCorrespondences[card.name]
      ) {
        const elementName = majorArcanaCorrespondences[card.name].element;
        elementId = elementMap[elementName] || null;
      }

      const keywords = cardKeywords[card.name] || null;

      // Generate image filename from card name
      const imageFilename =
        card.name.replace(/\s+/g, "").toLowerCase() + ".jpeg";

      await dbRun(
        "INSERT OR IGNORE INTO cards (name, number, suit, element_id, keywords, image_filename) VALUES (?, ?, ?, ?, ?, ?)",
        [card.name, card.number, card.suit, elementId, keywords, imageFilename],
      );
    }
    console.log("✓ Cards seeded\n");

    // 10. Update Major Arcana with planetary/zodiac correspondences
    console.log("Updating Major Arcana correspondences...");
    for (const [cardName, corr] of Object.entries(majorArcanaCorrespondences)) {
      const planetId = planetMap[corr.planet];
      const zodiacId = corr.sign ? zodiacMap[corr.sign] : null;

      if (zodiacId) {
        await dbRun(
          "UPDATE cards SET planet_id = ?, zodiac_sign_id = ? WHERE name = ?",
          [planetId, zodiacId, cardName],
        );
      } else {
        await dbRun("UPDATE cards SET planet_id = ? WHERE name = ?", [
          planetId,
          cardName,
        ]);
      }
    }
    console.log("✓ Major Arcana correspondences updated\n");

    // 11. Update pip cards with planetary/zodiac correspondences
    console.log("Updating pip card correspondences...");
    for (const [cardName, corr] of Object.entries(pipCorrespondences)) {
      const planetId = planetMap[corr.planet];
      const zodiacId = zodiacMap[corr.sign];

      await dbRun(
        "UPDATE cards SET planet_id = ?, zodiac_sign_id = ? WHERE name = ?",
        [planetId, zodiacId, cardName],
      );
    }
    console.log("✓ Pip card correspondences updated\n");

    console.log(
      "✅ Successfully seeded all reference tables and 78 tarot cards!\n",
    );
  } catch (error) {
    console.error("❌ Error seeding data:", error.message);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedReferenceTablesAndCards()
    .then(() => {
      console.log("Database connection will close automatically");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedReferenceTablesAndCards };
