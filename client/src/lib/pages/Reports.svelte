<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    cardFrequencyColors,
    elementColors,
    getSuitColorsArray,
    suitColors,
  } from "../chartColors";
  import BarChart from "../components/BarChart.svelte";
  import CardHeatmap from "../components/CardHeatmap.svelte";
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

  // Analytics data (element distribution and top cards)
  type Analytics = {
    elementDistribution: Array<{
      element: string;
      polarity: string;
      count: number;
    }>;
    topCards: Array<{
      name: string;
      suit: string | null;
      count: number;
      image_filename?: string;
    }>;
    totalReadings: number;
    totalCardsDrawn: number;
  };
  let analytics: Analytics | null = null;

  // All card frequency data for heatmap
  type CardFrequency = {
    card_name: string;
    suit: string | null;
    number: number;
    count: number;
  };
  let allCardFrequency: CardFrequency[] = [];

  let readings: Reading[] = [];

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
      loadSuitDistribution(),
      loadSuitFrequencyOverTime(),
      loadAnalytics(),
      loadAllCardFrequency(),
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

  async function loadAllCardFrequency() {
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stats/card-frequency?${params}`);
      allCardFrequency = await response.json();
    } catch (error) {
      console.error("Error loading card frequency:", error);
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
      {#if analytics?.topCards && analytics.topCards.length > 0}
        <div class="chart-section">
          <h4>Top 15 Most Drawn Cards</h4>
          <div class="chart-container-bar">
            <BarChart
              labels={analytics.topCards.map((c) => c.name)}
              data={analytics.topCards.map((c) => c.count)}
              title="Card Frequency"
              horizontal={true}
              backgroundColor={cardFrequencyColors.backgrounds}
              borderColor={cardFrequencyColors.borders}
            />
          </div>
        </div>
      {/if}

      <!-- All Cards Heatmap -->
      {#if allCardFrequency.length > 0}
        <div class="chart-section">
          <h4>All Cards Frequency</h4>
          <CardHeatmap data={allCardFrequency} />
        </div>
      {/if}

      <!-- Suit and Element Distribution Charts -->
      {#if suitDistribution && analytics && analytics.elementDistribution.length > 0}
        <div class="chart-section">
          <div class="section-header-with-toggle">
            <h4>Suit & Element Distribution</h4>
            <label class="major-arcana-toggle">
              <input type="checkbox" bind:checked={includeMajorArcana} />
              <span>Include Major Arcana (Suits)</span>
            </label>
          </div>
          <div class="distribution-charts-container">
            <div class="distribution-chart">
              <h5>By Suit</h5>
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
                  backgroundColors={includeMajorArcana
                    ? getSuitColorsArray(true).backgrounds
                    : getSuitColorsArray(false).backgrounds}
                />
              </div>
            </div>
            <div class="distribution-chart">
              <h5>By Element</h5>
              <div class="chart-container-pie">
                <PieChart
                  labels={analytics.elementDistribution.map(
                    (e) => `${e.element} (${e.polarity})`,
                  )}
                  data={analytics.elementDistribution.map((e) => e.count)}
                  backgroundColors={elementColors.backgrounds}
                />
              </div>
            </div>
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
                      backgroundColor: suitColors.majorArcana.background,
                      borderColor: suitColors.majorArcana.border,
                    },
                    {
                      label: "Wands",
                      data: suitFrequencyOverTime.map((item) => item.Wands),
                      backgroundColor: suitColors.wands.background,
                      borderColor: suitColors.wands.border,
                    },
                    {
                      label: "Cups",
                      data: suitFrequencyOverTime.map((item) => item.Cups),
                      backgroundColor: suitColors.cups.background,
                      borderColor: suitColors.cups.border,
                    },
                    {
                      label: "Swords",
                      data: suitFrequencyOverTime.map((item) => item.Swords),
                      backgroundColor: suitColors.swords.background,
                      borderColor: suitColors.swords.border,
                    },
                    {
                      label: "Pentacles",
                      data: suitFrequencyOverTime.map((item) => item.Pentacles),
                      backgroundColor: suitColors.pentacles.background,
                      borderColor: suitColors.pentacles.border,
                    },
                  ]
                : [
                    {
                      label: "Wands",
                      data: suitFrequencyOverTime.map((item) => item.Wands),
                      backgroundColor: suitColors.wands.background,
                      borderColor: suitColors.wands.border,
                    },
                    {
                      label: "Cups",
                      data: suitFrequencyOverTime.map((item) => item.Cups),
                      backgroundColor: suitColors.cups.background,
                      borderColor: suitColors.cups.border,
                    },
                    {
                      label: "Swords",
                      data: suitFrequencyOverTime.map((item) => item.Swords),
                      backgroundColor: suitColors.swords.background,
                      borderColor: suitColors.swords.border,
                    },
                    {
                      label: "Pentacles",
                      data: suitFrequencyOverTime.map((item) => item.Pentacles),
                      backgroundColor: suitColors.pentacles.background,
                      borderColor: suitColors.pentacles.border,
                    },
                  ]}
              horizontal={!isLandscape}
            />
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
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  .chart-section h5 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: var(--color-text-secondary);
    font-weight: 600;
    text-align: center;
  }

  .distribution-charts-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .distribution-chart {
    display: flex;
    flex-direction: column;
    min-height: 400px;
  }

  .distribution-chart .chart-container-pie {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .distribution-charts-container {
      grid-template-columns: 1fr;
    }
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

  @media (max-width: 768px) {
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
