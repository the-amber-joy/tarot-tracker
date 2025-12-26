<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { readingsStore } from "../../stores/readingsStore";

  type Reading = {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  };

  // Map spread template IDs to display names
  const spreadTemplates: Record<string, string> = {
    "celtic-cross": "Celtic Cross",
    "five-card": "Five Card Spread",
    horseshoe: "Horseshoe Spread",
    relationship: "Relationship Spread",
    "single-card": "Single Card",
    "three-card": "Three Card Spread",
    custom: "Custom Spread",
  };

  function getSpreadLayout(templateId?: string): string {
    if (!templateId) return "-";
    return spreadTemplates[templateId] || "-";
  }

  let sortAscending: boolean = false;
  let deckFilter: string = "";
  let statusFilter: string = ""; // '', 'complete', or 'incomplete'
  let spreadFilter: string = "";

  $: readings = $readingsStore;

  // Get unique deck names for filter dropdown
  $: uniqueDecks = [
    ...new Set(readings.map((r) => r.deck_name || "No Deck Specified")),
  ].sort();

  // Get unique spread layouts
  $: uniqueSpreads = [
    ...new Set(
      readings
        .map((r) => getSpreadLayout(r.spread_template_id))
        .filter((s) => s !== "-"),
    ),
  ].sort();

  // Filter and sort readings
  $: filteredReadings = readings.filter((r) => {
    // Filter by deck
    if (deckFilter && (r.deck_name || "No Deck Specified") !== deckFilter) {
      return false;
    }
    // Filter by completion status
    if (statusFilter === "complete" && r.is_incomplete) {
      return false;
    }
    if (statusFilter === "incomplete" && !r.is_incomplete) {
      return false;
    }
    // Filter by spread layout
    if (
      spreadFilter &&
      getSpreadLayout(r.spread_template_id) !== spreadFilter
    ) {
      return false;
    }
    return true;
  });

  $: sortedReadings = [...filteredReadings].sort((a, b) => {
    const dateA = new Date(a.date + " " + a.time);
    const dateB = new Date(b.date + " " + b.time);
    return sortAscending
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime();
  });

  onMount(async () => {
    await readingsStore.load();
  });

  function toggleDateSort() {
    sortAscending = !sortAscending;
  }

  function formatDateTime(date: string, time: string): string {
    const dateObj = new Date(date + " " + time);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dayOfWeek}, ${formattedDate} at ${formattedTime}`;
  }

  function handleReadingClick(reading: Reading) {
    // If reading is incomplete, open directly in edit mode
    if (reading.is_incomplete) {
      navigate(`/reading/${reading.id}/edit`);
    } else {
      navigate(`/reading/${reading.id}`);
    }
  }

  function handleSortKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleDateSort();
    }
  }

  function handleRowKeydown(event: KeyboardEvent, reading: Reading) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleReadingClick(reading);
    }
  }

  function clearFilters() {
    deckFilter = "";
    statusFilter = "";
    spreadFilter = "";
  }
</script>

<div class="view summary-view">
  <div class="view-header">
    <h2>My Readings</h2>
  </div>

  <div class="filters-section">
    <div class="controls">
      <select class="deck-filter" bind:value={deckFilter}>
        <option value="">All Decks</option>
        {#each uniqueDecks as deck}
          <option value={deck}>{deck}</option>
        {/each}
      </select>
      <select class="spread-filter" bind:value={spreadFilter}>
        <option value="">All Spreads</option>
        {#each uniqueSpreads as spread}
          <option value={spread}>{spread}</option>
        {/each}
      </select>
      <select class="status-filter" bind:value={statusFilter}>
        <option value="">All Readings</option>
        <option value="complete">Complete</option>
        <option value="incomplete">Incomplete</option>
      </select>
      {#if deckFilter || statusFilter || spreadFilter}
        <button class="clear-filters-btn" on:click={clearFilters}>
          Clear Filters
        </button>
      {/if}
    </div>
    <button class="mobile-sort-btn" on:click={toggleDateSort}>
      Sort by Date {sortAscending ? "↑" : "↓"}
    </button>
  </div>

  <!-- Table layout for larger screens -->
  <table class="readings-table">
    <thead>
      <tr>
        <th
          class="sortable"
          on:click={toggleDateSort}
          on:keydown={handleSortKeydown}
          tabindex="0"
        >
          Date {sortAscending ? "↑" : "↓"}
        </th>
        <th>Name</th>
        <th>Spread</th>
        <th>Deck</th>
      </tr>
    </thead>
    <tbody aria-live="polite">
      {#if readings.length === 0}
        <tr>
          <td colspan="4" class="empty-message">
            No readings yet. Tap the + button to get started!
          </td>
        </tr>
      {:else}
        {#each sortedReadings as reading}
          <tr
            on:click={() => handleReadingClick(reading)}
            on:keydown={(e) => handleRowKeydown(e, reading)}
            tabindex="0"
            style="cursor: pointer;"
          >
            <td>{formatDateTime(reading.date, reading.time)}</td>
            <td>
              {#if reading.is_incomplete}
                <span class="incomplete-icon" title="Incomplete">⚠️</span>
              {/if}
              {reading.title}
            </td>
            <td
              ><span class="spread-badge"
                >{getSpreadLayout(reading.spread_template_id)}</span
              ></td
            >
            <td>{reading.deck_name || "No Deck Specified"}</td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>

  <!-- Card layout for mobile -->
  <div class="readings-cards" aria-live="polite">
    {#if sortedReadings.length === 0}
      <p class="empty-message">
        No readings yet. Tap the + button below to get started!
      </p>
    {:else}
      {#each sortedReadings as reading}
        <button
          class="reading-card"
          on:click={() => handleReadingClick(reading)}
          on:keydown={(e) => handleRowKeydown(e, reading)}
        >
          <div class="reading-card-header">
            <span class="reading-spread">
              {#if reading.is_incomplete}
                <span class="incomplete-icon" title="Incomplete">⚠️</span>
              {/if}
              {reading.title}
            </span>
            <span class="spread-badge"
              >{getSpreadLayout(reading.spread_template_id)}</span
            >
          </div>
          <div class="reading-card-footer">
            <div class="reading-date">
              {formatDateTime(reading.date, reading.time)}
            </div>
            <div class="reading-deck">
              {reading.deck_name || "No Deck Specified"}
            </div>
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .summary-view {
    container-type: inline-size;
  }

  .filters-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    margin-top: 15px;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .deck-filter,
  .status-filter,
  .spread-filter {
    padding: 0.5rem 1rem;
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.9rem;
    transition: var(--transition-fast);
    min-width: 150px;
    max-width: 100%;
  }

  .deck-filter:hover,
  .status-filter:hover,
  .spread-filter:hover {
    border-color: var(--color-primary);
  }

  .deck-filter:focus,
  .status-filter:focus,
  .spread-filter:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-color: var(--color-primary);
  }

  .clear-filters-btn {
    padding: 0.5rem 1rem;
    background: var(--color-bg-section);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 0.9rem;
    transition: var(--transition-fast);
    white-space: nowrap;
  }

  .clear-filters-btn:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-text-secondary);
  }

  .clear-filters-btn:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .clear-filters-btn:active {
    background: #d0d0d0;
    transform: scale(0.98);
  }

  th.sortable {
    cursor: pointer;
    user-select: none;
  }

  th.sortable:hover {
    background: rgba(0, 0, 0, 0.05);
  }

  .spread-badge {
    display: inline-block;
    background: rgba(123, 44, 191, 0.1);
    color: var(--color-gradient-end);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
    font-weight: 600;
  }

  /* Hide mobile sort button on desktop */
  .mobile-sort-btn {
    display: none;
  }

  /* Default: hide cards, show table */
  .readings-cards {
    display: none;
  }

  .readings-table {
    display: table;
  }

  /* Container query: show cards on narrow screens, hide table */
  @container (max-width: 700px) {
    .mobile-sort-btn {
      display: block;
      padding: 0.5rem 1rem;
      background: transparent;
      color: var(--color-text-secondary);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: 0.9rem;
      transition: var(--transition-fast);
    }

    .mobile-sort-btn:hover {
      background: var(--color-bg-hover);
      color: var(--color-text-primary);
    }

    .mobile-sort-btn:focus {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    .mobile-sort-btn:active {
      background: rgba(0, 0, 0, 0.1);
      transform: scale(0.98);
    }

    .readings-table {
      display: none;
    }

    .readings-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .reading-card {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
      background: var(--color-bg-white);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      text-align: left;
      cursor: pointer;
      transition: var(--transition-fast);
      color: var(--color-text-primary);
    }

    .reading-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-md);
    }

    .reading-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .reading-spread {
      font-weight: 600;
      font-size: 1.1rem;
      flex: 1;
      color: var(--color-text-primary);
    }

    .reading-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .reading-date {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
    }

    .reading-deck {
      color: var(--color-text-light);
      font-size: 0.85rem;
      text-align: right;
    }
  }
</style>
