const db = require("./database");
const { TAROT_CARDS } = require("./cards");

function seedReferenceTablesAndCards() {
  console.log("Seeding reference tables and cards...");

  db.serialize(() => {
    // Seed zodiac signs
    const zodiacSigns = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];

    zodiacSigns.forEach((sign) => {
      db.run(
        "INSERT OR IGNORE INTO zodiac_signs (name) VALUES (?)",
        [sign],
        (err) => {
          if (err)
            console.error(`Error inserting zodiac sign ${sign}:`, err.message);
        },
      );
    });

    // Seed elements with polarity
    const elements = [
      { name: "Fire", polarity: "Active" },
      { name: "Earth", polarity: "Passive" },
      { name: "Air", polarity: "Active" },
      { name: "Water", polarity: "Passive" },
    ];

    elements.forEach((element) => {
      db.run(
        "INSERT OR IGNORE INTO elements (name, polarity) VALUES (?, ?)",
        [element.name, element.polarity],
        (err) => {
          if (err)
            console.error(
              `Error inserting element ${element.name}:`,
              err.message,
            );
        },
      );
    });

    // Seed qualities
    const qualities = ["Cardinal", "Fixed", "Mutable"];

    qualities.forEach((quality) => {
      db.run(
        "INSERT OR IGNORE INTO qualities (name) VALUES (?)",
        [quality],
        (err) => {
          if (err)
            console.error(`Error inserting quality ${quality}:`, err.message);
        },
      );
    });

    // Seed planets
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

    planets.forEach((planet) => {
      db.run(
        "INSERT OR IGNORE INTO planets (name) VALUES (?)",
        [planet],
        (err) => {
          if (err)
            console.error(`Error inserting planet ${planet}:`, err.message);
        },
      );
    });

    // Seed all 78 tarot cards from cards.js
    // Wait for reference tables to be populated before inserting cards
    setTimeout(() => {
      // Get element IDs for suit associations
      db.all("SELECT id, name FROM elements", [], (err, elements) => {
        if (err) {
          console.error("Error fetching elements:", err.message);
          return;
        }

        const elementMap = {};
        elements.forEach((el) => {
          elementMap[el.name] = el.id;
        });

        const suitKeywords = {
          Wands: "Action, inspiration, drive, willpower, passion, ambition",
          Cups: "Emotion, feelings, intuition, relationships",
          Swords: "Logic, ideas, intellect, communication",
          Pentacles: "Nature, body, material world, stability",
        };

        const suitElements = {
          Wands: elementMap["Fire"],
          Cups: elementMap["Water"],
          Swords: elementMap["Air"],
          Pentacles: elementMap["Earth"],
        };

        // Individual card keywords (upright)
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
          "Knight of Wands": "action, adventure, fearlessness",
          "Queen of Wands": "courage, determination, joy",
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
          "Two of Pentacles":
            "balancing decisions, priorities, adapting to change",
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

        TAROT_CARDS.forEach((card) => {
          const elementId = suitElements[card.suit] || null;
          const keywords = cardKeywords[card.name] || null;

          db.run(
            "INSERT OR IGNORE INTO cards (name, number, suit, element_id, keywords) VALUES (?, ?, ?, ?, ?)",
            [card.name, card.number, card.suit, elementId, keywords],
            function (err) {
              if (err) {
                console.error(
                  `Error inserting card ${card.name}:`,
                  err.message,
                );
              }
            },
          );
        });

        console.log("✓ Reference tables and cards seeded successfully");
        console.log(
          `✓ ${TAROT_CARDS.length} cards inserted with element associations`,
        );
      });
    }, 500);
  });
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedReferenceTablesAndCards();

  // Close database after a delay to allow all operations to complete
  setTimeout(() => {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed");
      }
      process.exit(0);
    });
  }, 2000);
}

module.exports = { seedReferenceTablesAndCards };
