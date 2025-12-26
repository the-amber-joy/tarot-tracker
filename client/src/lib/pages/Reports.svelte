<script lang="ts">
  import { onMount } from "svelte";

  type Reading = {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  };

  // Card frequency data
  type CardFrequency = {
    card_name: string;
    count: number;
    suit?: string;
  };
  let cardFrequency: CardFrequency[] = [];
  let selectedSuit: string = "All";

  // Suit distribution data
  type SuitDistribution = {
    "Major Arcana": number;
    Wands: number;
    Cups: number;
    Swords: number;
    Pentacles: number;
  };
  let suitDistribution: SuitDistribution | null = null;
  let includeMajorArcana: boolean = true;

  // Analytics data (number, element distributions)
  type Analytics = {
    numberDistribution: Array<{ number: number; count: number }>;
    elementDistribution: Array<{
      element: string;
      polarity: string;
      count: number;
    }>;
    topCards: Array<{ name: string; suit: string | null; count: number }>;
    totalReadings: number;
    totalCardsDrawn: number;
  };
  let analytics: Analytics | null = null;

  let readings: Reading[] = [];

  // Map card names to suits
  const cardSuits: Record<string, string> = {
    "Major Arcana": "Major Arcana",
  };

  // Initialize card suits mapping
  const tarotCards = ["Wands", "Cups", "Swords", "Pentacles"];

  tarotCards.forEach((suit) => {
    for (let i = 1; i <= 14; i++) {
      const names =
        i === 1
          ? ["Ace"]
          : i === 11
            ? ["Page"]
            : i === 12
              ? ["Knight"]
              : i === 13
                ? ["Queen"]
                : i === 14
                  ? ["King"]
                  : [i.toString()];
      names.forEach((name) => {
        cardSuits[`${name} of ${suit}`] = suit;
      });
    }
  });

  // Major Arcana cards
  const majorArcana = [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
  ];
  majorArcana.forEach((card) => {
    cardSuits[card] = "Major Arcana";
  });

  $: filteredCardFrequency = cardFrequency
    .map((card) => ({
      ...card,
      suit: cardSuits[card.card_name] || "Unknown",
    }))
    .filter((card) => selectedSuit === "All" || card.suit === selectedSuit)
    .sort((a, b) => b.count - a.count);

  $: totalCards = filteredCardFrequency.reduce(
    (sum, card) => sum + card.count,
    0,
  );

  // Calculate reading statistics
  $: readingStats = (() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisYearReadings = readings.filter((r) => {
      const readingDate = new Date(r.date);
      return readingDate.getFullYear() === currentYear;
    });

    const thisMonthReadings = readings.filter((r) => {
      const readingDate = new Date(r.date);
      return (
        readingDate.getFullYear() === currentYear &&
        readingDate.getMonth() === currentMonth
      );
    });

    // Find most used deck
    const deckCounts: Record<string, number> = {};
    readings.forEach((r) => {
      if (r.deck_name) {
        deckCounts[r.deck_name] = (deckCounts[r.deck_name] || 0) + 1;
      }
    });
    const mostUsedDeck = Object.keys(deckCounts).length
      ? Object.entries(deckCounts).sort((a, b) => b[1] - a[1])[0]
      : null;

    // Calculate average per month (all time)
    let avgPerMonth = 0;
    if (readings.length > 0) {
      const dates = readings.map((r) => new Date(r.date).getTime());
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      const monthsDiff =
        (latest.getFullYear() - earliest.getFullYear()) * 12 +
        (latest.getMonth() - earliest.getMonth()) +
        1;
      avgPerMonth = readings.length / monthsDiff;
    }

    return {
      total: readings.length,
      thisYear: thisYearReadings.length,
      thisMonth: thisMonthReadings.length,
      mostUsedDeck: mostUsedDeck
        ? { name: mostUsedDeck[0], count: mostUsedDeck[1] }
        : null,
      avgPerMonth: avgPerMonth,
    };
  })();

  onMount(async () => {
    await Promise.all([
      loadReadings(),
      loadCardFrequency(),
      loadSuitDistribution(),
      loadAnalytics(),
    ]);
  });

  async function loadCardFrequency() {
    try {
      const response = await fetch("/api/stats/card-frequency");
      cardFrequency = await response.json();
    } catch (error) {
      console.error("Error loading card frequency:", error);
    }
  }

  async function loadSuitDistribution() {
    try {
      const response = await fetch("/api/stats/suit-distribution");
      suitDistribution = await response.json();
    } catch (error) {
      console.error("Error loading suit distribution:", error);
    }
  }

  async function loadAnalytics() {
    try {
      const response = await fetch("/api/stats/analytics");
      analytics = await response.json();
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  }

  async function loadReadings() {
    try {
      const response = await fetch("/api/readings");
      const allReadings = await response.json();
      readings = allReadings.sort((a: Reading, b: Reading) => {
        const dateA = new Date(a.date + " " + a.time);
        const dateB = new Date(b.date + " " + b.time);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Error loading readings:", error);
    }
  }
</script>

<div class="reports-container">
  <!-- Reports Section -->
  <section class="reports-section">
    <h3>Reading Statistics</h3>

    {#if readings.length === 0}
      <p class="empty-message">
        No readings yet. Create your first reading to see statistics!
      </p>
    {:else}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{readingStats.total}</div>
          <div class="stat-label">Total Readings</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{readingStats.thisYear}</div>
          <div class="stat-label">This Year</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{readingStats.thisMonth}</div>
          <div class="stat-label">This Month</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">
            {readingStats.avgPerMonth.toFixed(1)}
          </div>
          <div class="stat-label">Avg Per Month</div>
        </div>
      </div>

      {#if readingStats.mostUsedDeck}
        <div class="most-used-deck">
          <h4>Most Used Deck</h4>
          <div class="deck-stat">
            <span class="deck-name">{readingStats.mostUsedDeck.name}</span>
            <span class="deck-count"
              >{readingStats.mostUsedDeck.count}
              {readingStats.mostUsedDeck.count === 1
                ? "reading"
                : "readings"}</span
            >
          </div>
        </div>
      {/if}

      <!-- Card Frequency Section -->
      {#if cardFrequency.length > 0}
        <div class="card-frequency-section">
          <div class="section-header">
            <h4>Card Frequency</h4>
            <div class="suit-filter">
              <select bind:value={selectedSuit}>
                <option value="All">All Cards</option>
                <option value="Major Arcana">Major Arcana</option>
                <option value="Wands">Wands</option>
                <option value="Cups">Cups</option>
                <option value="Swords">Swords</option>
                <option value="Pentacles">Pentacles</option>
              </select>
            </div>
          </div>

          <div class="card-frequency-table">
            <table>
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Count</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredCardFrequency.slice(0, 20) as card}
                  <tr>
                    <td class="card-name">{card.card_name}</td>
                    <td class="card-count">{card.count}</td>
                    <td class="card-percentage">
                      {((card.count / totalCards) * 100).toFixed(1)}%
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
            {#if filteredCardFrequency.length > 20}
              <p class="table-note">
                Showing top 20 of {filteredCardFrequency.length} cards
              </p>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Suit Distribution Section -->
      {#if suitDistribution}
        <div class="suit-distribution-section">
          <div class="section-header">
            <h4>Suit Distribution</h4>
            <label class="major-arcana-toggle">
              <input type="checkbox" bind:checked={includeMajorArcana} />
              <span>Include Major Arcana</span>
            </label>
          </div>
          <div class="suit-bars">
            {#each Object.entries(suitDistribution).filter(([suit]) => includeMajorArcana || suit !== "Major Arcana") as [suit, count]}
              {@const filteredEntries = Object.entries(suitDistribution).filter(
                ([s]) => includeMajorArcana || s !== "Major Arcana",
              )}
              {@const total = filteredEntries.reduce(
                (sum, [, val]) => sum + val,
                0,
              )}
              {@const percentage = total > 0 ? (count / total) * 100 : 0}
              <div class="suit-bar-container">
                <div class="suit-bar-label">
                  <span class="suit-name">{suit}</span>
                  <span class="suit-count">{count}</span>
                </div>
                <div class="suit-bar-track">
                  <div
                    class="suit-bar-fill"
                    class:major-arcana={suit === "Major Arcana"}
                    class:wands={suit === "Wands"}
                    class:cups={suit === "Cups"}
                    class:swords={suit === "Swords"}
                    class:pentacles={suit === "Pentacles"}
                    style="width: {percentage}%"
                  >
                    <span class="suit-percentage">{percentage.toFixed(1)}%</span
                    >
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Number Distribution Section -->
      {#if analytics && analytics.numberDistribution.length > 0}
        <div class="analytics-section">
          <h4>📊 Number Distribution</h4>
          <div class="chart-container">
            {#each analytics.numberDistribution as item}
              {@const maxCount = Math.max(
                ...analytics.numberDistribution.map((n) => n.count),
              )}
              {@const percentage = (item.count / maxCount) * 100}
              {@const numberLabel =
                item.number === 0
                  ? "Fool"
                  : item.number === 1
                    ? "Ace/Magician"
                    : item.number <= 10
                      ? `${item.number}`
                      : item.number === 11
                        ? "Page/Justice"
                        : item.number === 12
                          ? "Knight/Hanged"
                          : item.number === 13
                            ? "Queen/Death"
                            : item.number === 14
                              ? "King/Temperance"
                              : item.number === 15
                                ? "Devil"
                                : item.number === 16
                                  ? "Tower"
                                  : item.number === 17
                                    ? "Star"
                                    : item.number === 18
                                      ? "Moon"
                                      : item.number === 19
                                        ? "Sun"
                                        : item.number === 20
                                          ? "Judgement"
                                          : "World"}
              <div class="chart-bar">
                <div class="chart-label">{numberLabel}</div>
                <div class="chart-bar-container">
                  <div
                    class="chart-bar-fill"
                    style="width: {percentage}%"
                  ></div>
                </div>
                <div class="chart-value">{item.count}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Element Distribution Section -->
      {#if analytics && analytics.elementDistribution.length > 0}
        <div class="analytics-section">
          <h4>🔥 Element Distribution</h4>
          <div class="chart-container">
            {#each analytics.elementDistribution as item}
              {@const maxCount = Math.max(
                ...analytics.elementDistribution.map((e) => e.count),
              )}
              {@const percentage = (item.count / maxCount) * 100}
              <div class="chart-bar">
                <div class="chart-label">
                  {item.element}
                  <span class="element-polarity">({item.polarity})</span>
                </div>
                <div class="chart-bar-container">
                  <div
                    class="chart-bar-fill element-{item.element.toLowerCase()}"
                    style="width: {percentage}%"
                  ></div>
                </div>
                <div class="chart-value">{item.count}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </section>
</div>

<style>
  .reports-container {
    padding: 1rem 0;
  }

  .reports-section {
    background: var(--color-bg-section);
    padding: 1rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .reports-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.4rem;
    color: var(--color-text-secondary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .reports-section h4 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1.1rem;
    color: var(--color-text-secondary);
  }

  .empty-message {
    color: var(--color-text-secondary);
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    text-align: center;
    transition: var(--transition-fast);
  }

  .stat-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .most-used-deck {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .most-used-deck h4 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--color-text-secondary);
  }

  .deck-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
  }

  .deck-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .deck-count {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    background: var(--color-primary-light);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
  }

  .card-frequency-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .section-header h4 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .suit-filter select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .suit-filter select:hover {
    border-color: var(--color-primary);
  }

  .suit-filter select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .card-frequency-table {
    overflow-x: auto;
  }

  .card-frequency-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .card-frequency-table thead {
    background: var(--color-bg-section);
    border-bottom: 2px solid var(--color-border);
  }

  .card-frequency-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-frequency-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-frequency-table tbody tr:hover {
    background: var(--color-bg-section);
  }

  .card-name {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .card-count {
    font-weight: 600;
    color: var(--color-primary);
    text-align: center;
  }

  .card-percentage {
    color: var(--color-text-secondary);
    text-align: right;
  }

  .table-note {
    margin-top: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-style: italic;
  }

  .suit-distribution-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .suit-distribution-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .suit-bars {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .suit-bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suit-bar-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suit-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .suit-count {
    font-weight: 500;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .suit-bar-track {
    height: 32px;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
  }

  .suit-bar-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.75rem;
    transition: width 0.5s ease-out;
    min-width: 50px;
  }

  .suit-bar-fill.major-arcana {
    background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);
  }

  .suit-bar-fill.wands {
    background: linear-gradient(135deg, #e63946 0%, #f77f00 100%);
  }

  .suit-bar-fill.cups {
    background: linear-gradient(135deg, #2a9d8f 0%, #4ecdc4 100%);
  }

  .suit-bar-fill.swords {
    background: linear-gradient(135deg, #457b9d 0%, #5390d9 100%);
  }

  .suit-bar-fill.pentacles {
    background: linear-gradient(135deg, #e76f51 0%, #f4a261 100%);
  }

  .suit-percentage {
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .major-arcana-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .major-arcana-toggle input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }

  .major-arcana-toggle span {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  /* Analytics Styles */
  .analytics-section {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    margin-top: 2rem;
  }

  .analytics-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .chart-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .chart-bar {
    display: grid;
    grid-template-columns: 150px 1fr 60px;
    align-items: center;
    gap: 1rem;
  }

  .chart-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text-primary);
    text-align: right;
  }

  .element-polarity {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .chart-bar-container {
    background: var(--color-bg-section);
    border-radius: var(--radius-sm);
    height: 32px;
    overflow: hidden;
  }

  .chart-bar-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }

  .chart-bar-fill.element-fire {
    background: linear-gradient(90deg, #ff6b6b, #ff8e53);
  }

  .chart-bar-fill.element-water {
    background: linear-gradient(90deg, #4ecdc4, #44a8d8);
  }

  .chart-bar-fill.element-air {
    background: linear-gradient(90deg, #f7b731, #fed330);
  }

  .chart-bar-fill.element-earth {
    background: linear-gradient(90deg, #26de81, #20bf6b);
  }

  .chart-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: center;
  }

  @media (max-width: 768px) {
    .chart-bar {
      grid-template-columns: 100px 1fr 50px;
      gap: 0.5rem;
    }

    .chart-label {
      font-size: 0.8rem;
    }
  }
</style>
