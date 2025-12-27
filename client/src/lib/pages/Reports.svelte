<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import BarChart from "../components/BarChart.svelte";
  import GroupedBarChart from "../components/GroupedBarChart.svelte";
  import PieChart from "../components/PieChart.svelte";

  type Reading = {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  };

  // Timespan filter
  type TimespanOption =
    | "7days"
    | "30days"
    | "3months"
    | "6months"
    | "12months"
    | "yearToDate"
    | "selectedYear"
    | "allTime";

  let selectedTimespan: TimespanOption = "allTime";
  let selectedYear: number = new Date().getFullYear();

  // Track screen orientation for chart layout
  let isLandscape: boolean = false;

  function updateOrientation() {
    isLandscape = window.innerWidth > window.innerHeight;
  }

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

  // Suit frequency over time data (for grouped bar chart)
  type SuitFrequencyOverTime = {
    period: string;
    "Major Arcana": number;
    Wands: number;
    Cups: number;
    Swords: number;
    Pentacles: number;
  };
  let suitFrequencyOverTime: SuitFrequencyOverTime[] = [];
  let includeMajorArcanaOverTime: boolean = true;

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

  // Get available years from readings
  $: availableYears = (() => {
    const years = new Set<number>();
    readings.forEach((r) => {
      const year = new Date(r.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  })();

  // Check if Selected Year option should be available (multiple years with readings)
  $: showSelectedYearOption = availableYears.length > 1;

  // Reset to allTime if selectedYear is chosen but not available
  $: if (selectedTimespan === "selectedYear" && !showSelectedYearOption) {
    selectedTimespan = "allTime";
  }

  // Reset selectedYear to current year when switching to selectedYear timespan
  $: if (selectedTimespan === "selectedYear") {
    selectedYear = new Date().getFullYear();
  }

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

  // Calculate date range based on selected timespan
  function getDateRange(): {
    startDate: string | null;
    endDate: string | null;
  } {
    const now = new Date();
    let startDate: Date | null = null;

    switch (selectedTimespan) {
      case "7days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        break;
      case "3months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "12months":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 12);
        break;
      case "yearToDate":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case "selectedYear":
        startDate = new Date(selectedYear, 0, 1);
        const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
        return {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endOfYear.toISOString().split("T")[0],
        };
      case "allTime":
        return { startDate: null, endDate: null };
    }

    return {
      startDate: startDate ? startDate.toISOString().split("T")[0] : null,
      endDate: now.toISOString().split("T")[0],
    };
  }

  // Reload data when timespan changes
  $: if (selectedTimespan || selectedYear) {
    loadData();
  }

  async function loadData() {
    await Promise.all([
      loadReadings(),
      loadCardFrequency(),
      loadSuitDistribution(),
      loadSuitFrequencyOverTime(),
      loadAnalytics(),
    ]);
  }

  onMount(async () => {
    await loadData();
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
  });

  onDestroy(() => {
    window.removeEventListener("resize", updateOrientation);
  });

  async function loadCardFrequency() {
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stats/card-frequency?${params}`);
      cardFrequency = await response.json();
    } catch (error) {
      console.error("Error loading card frequency:", error);
    }
  }

  async function loadSuitDistribution() {
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stats/suit-distribution?${params}`);
      suitDistribution = await response.json();
    } catch (error) {
      console.error("Error loading suit distribution:", error);
    }
  }

  async function loadSuitFrequencyOverTime() {
    try {
      const { startDate, endDate } = getDateRange();

      // Determine grouping: day for 7days/30days, month for others
      const groupBy =
        selectedTimespan === "7days" || selectedTimespan === "30days"
          ? "day"
          : "month";

      const params = new URLSearchParams();
      params.append("groupBy", groupBy);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(
        `/api/stats/suit-frequency-over-time?${params}`,
      );
      suitFrequencyOverTime = await response.json();
    } catch (error) {
      console.error("Error loading suit frequency over time:", error);
    }
  }

  async function loadAnalytics() {
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stats/analytics?${params}`);
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

    <!-- Timespan Selector -->
    <div class="timespan-selector">
      <label for="timespan">Time Period:</label>
      <select id="timespan" bind:value={selectedTimespan}>
        <option value="7days">Last 7 Days</option>
        <option value="30days">Last 30 Days</option>
        <option value="3months">Last 3 Months</option>
        <option value="6months">Last 6 Months</option>
        <option value="12months">Last 12 Months</option>
        <option value="yearToDate">This Year to Date</option>
        {#if showSelectedYearOption}
          <option value="selectedYear">Selected Year</option>
        {/if}
        <option value="allTime">All Time</option>
      </select>

      {#if selectedTimespan === "selectedYear"}
        <select bind:value={selectedYear}>
          {#each availableYears as year}
            <option value={year}>{year}</option>
          {/each}
        </select>
      {/if}
    </div>

    {#if readings.length === 0}
      <p class="empty-message">
        No readings yet. Create your first reading to see statistics!
      </p>
    {:else}
      <!-- Top 3 Cards -->
      {#if analytics?.topCards && analytics.topCards.length > 0}
        <div class="top-cards-section">
          <h4>Top 3 Most Drawn Cards</h4>
          <div class="top-cards-grid">
            {#each analytics.topCards.slice(0, 3) as card, index}
              <div class="top-card-item">
                <div class="card-rank">#{index + 1}</div>
                <div class="card-image-container">
                  {#if card.image_filename}
                    <img
                      src="/tarot-images/{card.image_filename}"
                      alt={card.name}
                      class="card-image"
                    />
                  {:else}
                    <div class="card-placeholder">
                      <div class="card-placeholder-text">No Image</div>
                    </div>
                  {/if}
                </div>
                <div class="card-info">
                  <div class="card-name-top">{card.name}</div>
                  {#if card.suit}
                    <div class="card-suit">{card.suit}</div>
                  {/if}
                  <div class="card-count-badge">{card.count} times</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Top 15 Cards Chart -->
      {#if cardFrequency.length > 0}
        <div class="chart-section">
          <h4>Top 15 Most Drawn Cards</h4>
          <div class="chart-container-bar">
            <BarChart
              labels={cardFrequency.slice(0, 15).map((c) => c.card_name)}
              data={cardFrequency.slice(0, 15).map((c) => c.count)}
              title="Card Frequency"
              horizontal={!isLandscape}
              backgroundColor={[
                "rgba(255, 99, 132, 0.7)",
                "rgba(54, 162, 235, 0.7)",
                "rgba(255, 206, 86, 0.7)",
                "rgba(75, 192, 192, 0.7)",
                "rgba(153, 102, 255, 0.7)",
                "rgba(255, 159, 64, 0.7)",
                "rgba(199, 199, 199, 0.7)",
                "rgba(83, 102, 255, 0.7)",
                "rgba(255, 99, 255, 0.7)",
                "rgba(99, 255, 132, 0.7)",
                "rgba(255, 206, 132, 0.7)",
                "rgba(132, 162, 235, 0.7)",
                "rgba(235, 132, 192, 0.7)",
                "rgba(192, 235, 132, 0.7)",
                "rgba(132, 192, 235, 0.7)",
              ]}
              borderColor={[
                "rgba(255, 99, 132, 1)",
                "rgba(54, 162, 235, 1)",
                "rgba(255, 206, 86, 1)",
                "rgba(75, 192, 192, 1)",
                "rgba(153, 102, 255, 1)",
                "rgba(255, 159, 64, 1)",
                "rgba(199, 199, 199, 1)",
                "rgba(83, 102, 255, 1)",
                "rgba(255, 99, 255, 1)",
                "rgba(99, 255, 132, 1)",
                "rgba(255, 206, 132, 1)",
                "rgba(132, 162, 235, 1)",
                "rgba(235, 132, 192, 1)",
                "rgba(192, 235, 132, 1)",
                "rgba(132, 192, 235, 1)",
              ]}
            />
          </div>
        </div>
      {/if}

      <!-- Suit Distribution Chart -->
      {#if suitDistribution}
        <div class="chart-section">
          <div class="section-header-with-toggle">
            <h4>Suit Distribution</h4>
            <label class="major-arcana-toggle">
              <input type="checkbox" bind:checked={includeMajorArcana} />
              <span>Include Major Arcana</span>
            </label>
          </div>
          <div class="chart-container-pie">
            <PieChart
              labels={includeMajorArcana
                ? ["Major Arcana", "Wands", "Cups", "Swords", "Pentacles"]
                : ["Wands", "Cups", "Swords", "Pentacles"]}
              data={includeMajorArcana
                ? [
                    suitDistribution["Major Arcana"],
                    suitDistribution.Wands,
                    suitDistribution.Cups,
                    suitDistribution.Swords,
                    suitDistribution.Pentacles,
                  ]
                : [
                    suitDistribution.Wands,
                    suitDistribution.Cups,
                    suitDistribution.Swords,
                    suitDistribution.Pentacles,
                  ]}
              title="Suit Distribution"
              backgroundColors={includeMajorArcana
                ? [
                    "rgba(153, 102, 255, 0.7)",
                    "rgba(255, 99, 132, 0.7)",
                    "rgba(54, 162, 235, 0.7)",
                    "rgba(255, 206, 86, 0.7)",
                    "rgba(75, 192, 192, 0.7)",
                  ]
                : [
                    "rgba(255, 99, 132, 0.7)",
                    "rgba(54, 162, 235, 0.7)",
                    "rgba(255, 206, 86, 0.7)",
                    "rgba(75, 192, 192, 0.7)",
                  ]}
            />
          </div>
        </div>
      {/if}

      <!-- Suit Frequency Over Time (Grouped Bar Chart) -->
      {#if suitFrequencyOverTime.length > 0}
        <div class="chart-section">
          <div class="section-header-with-toggle">
            <h4>Suit Frequency Over Time</h4>
            <label class="major-arcana-toggle">
              <input
                type="checkbox"
                bind:checked={includeMajorArcanaOverTime}
              />
              <span>Include Major Arcana</span>
            </label>
          </div>
          <div class="chart-container-bar">
            <GroupedBarChart
              labels={suitFrequencyOverTime.map((item) => {
                // Format period label based on grouping
                if (item.period.length === 10) {
                  // Day format: YYYY-MM-DD -> Mon, Jan 1
                  const date = new Date(item.period);
                  return date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
                } else {
                  // Month format: YYYY-MM -> Jan 2024
                  const [year, month] = item.period.split("-");
                  const date = new Date(parseInt(year), parseInt(month) - 1);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  });
                }
              })}
              datasets={includeMajorArcanaOverTime
                ? [
                    {
                      label: "Major Arcana",
                      data: suitFrequencyOverTime.map(
                        (item) => item["Major Arcana"],
                      ),
                      backgroundColor: "rgba(153, 102, 255, 0.7)",
                      borderColor: "rgba(153, 102, 255, 1)",
                    },
                    {
                      label: "Wands",
                      data: suitFrequencyOverTime.map((item) => item.Wands),
                      backgroundColor: "rgba(255, 99, 132, 0.7)",
                      borderColor: "rgba(255, 99, 132, 1)",
                    },
                    {
                      label: "Cups",
                      data: suitFrequencyOverTime.map((item) => item.Cups),
                      backgroundColor: "rgba(54, 162, 235, 0.7)",
                      borderColor: "rgba(54, 162, 235, 1)",
                    },
                    {
                      label: "Swords",
                      data: suitFrequencyOverTime.map((item) => item.Swords),
                      backgroundColor: "rgba(255, 206, 86, 0.7)",
                      borderColor: "rgba(255, 206, 86, 1)",
                    },
                    {
                      label: "Pentacles",
                      data: suitFrequencyOverTime.map((item) => item.Pentacles),
                      backgroundColor: "rgba(75, 192, 192, 0.7)",
                      borderColor: "rgba(75, 192, 192, 1)",
                    },
                  ]
                : [
                    {
                      label: "Wands",
                      data: suitFrequencyOverTime.map((item) => item.Wands),
                      backgroundColor: "rgba(255, 99, 132, 0.7)",
                      borderColor: "rgba(255, 99, 132, 1)",
                    },
                    {
                      label: "Cups",
                      data: suitFrequencyOverTime.map((item) => item.Cups),
                      backgroundColor: "rgba(54, 162, 235, 0.7)",
                      borderColor: "rgba(54, 162, 235, 1)",
                    },
                    {
                      label: "Swords",
                      data: suitFrequencyOverTime.map((item) => item.Swords),
                      backgroundColor: "rgba(255, 206, 86, 0.7)",
                      borderColor: "rgba(255, 206, 86, 1)",
                    },
                    {
                      label: "Pentacles",
                      data: suitFrequencyOverTime.map((item) => item.Pentacles),
                      backgroundColor: "rgba(75, 192, 192, 0.7)",
                      borderColor: "rgba(75, 192, 192, 1)",
                    },
                  ]}
              horizontal={!isLandscape}
            />
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

  /* Timespan Selector Styles */
  .timespan-selector {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    flex-wrap: wrap;
  }

  .timespan-selector label {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.95rem;
  }

  .timespan-selector select {
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 1rem;
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: var(--transition-fast);
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
  }

  .timespan-selector select:hover {
    border-color: var(--color-primary);
  }

  .timespan-selector select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
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

  /* Top Cards Section */
  .top-cards-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .top-cards-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .top-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1.5rem;
  }

  .top-card-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
    transition: var(--transition-fast);
  }

  .top-card-item:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .card-rank {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
  }

  .card-image-container {
    width: 120px;
    height: 200px;
    margin-bottom: 1rem;
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .card-placeholder {
    width: 120px;
    height: 200px;
    background: linear-gradient(
      135deg,
      var(--color-bg-section) 0%,
      var(--color-border) 100%
    );
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
  }

  .card-placeholder-text {
    color: var(--color-text-light);
    font-size: 0.85rem;
    text-align: center;
  }

  .card-info {
    text-align: center;
    width: 100%;
  }

  .card-name-top {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 0.25rem;
  }

  .card-suit {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .card-count-badge {
    display: inline-block;
    background: var(--color-primary);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
    font-weight: 600;
  }

  /* Chart Sections */
  .chart-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .chart-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .section-header-with-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header-with-toggle h4 {
    margin: 0;
  }

  .chart-container-bar {
    height: 600px;
    width: 100%;
  }

  .chart-container-pie {
    height: 400px;
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
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

    .top-cards-grid {
      grid-template-columns: 1fr;
    }

    .chart-container-bar {
      height: 500px;
    }

    .chart-container-pie {
      height: 350px;
    }

    .section-header-with-toggle {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }
  }
</style>
