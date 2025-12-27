<script lang="ts">
  import { onMount } from "svelte";

  type Card = {
    id: number;
    name: string;
    number: number | null;
    suit: string | null;
    image_filename: string | null;
    element_name: string | null;
    element_polarity: string | null;
    zodiac_sign_name: string | null;
    zodiac_quality: string | null;
    planet_name: string | null;
    keywords: string | null;
  };

  export let onToast: (
    message: string,
    type: "success" | "error" | "info",
  ) => void;

  let cards: Card[] = [];
  let loading = false;

  // Card filters
  let numberFilter = "";
  let suitFilter = "";
  let elementFilter = "";
  let polarityFilter = "";
  let signFilter = "";
  let qualityFilter = "";
  let planetFilter = "";

  // Get unique values for filters
  $: uniqueNumbers = [
    ...new Set(cards.map((c) => c.number).filter((n) => n !== null)),
  ].sort((a, b) => a! - b!);

  $: uniqueSuits = [
    ...new Set(cards.map((c) => c.suit).filter((s) => s !== null)),
  ].sort();

  $: uniqueElements = [
    ...new Set(cards.map((c) => c.element_name).filter((e) => e !== null)),
  ].sort();

  $: uniquePolarities = [
    ...new Set(cards.map((c) => c.element_polarity).filter((p) => p !== null)),
  ].sort();

  $: uniqueSigns = [
    ...new Set(cards.map((c) => c.zodiac_sign_name).filter((z) => z !== null)),
  ].sort();

  $: uniqueQualities = [
    ...new Set(cards.map((c) => c.zodiac_quality).filter((q) => q !== null)),
  ].sort();

  $: uniquePlanets = [
    ...new Set(cards.map((c) => c.planet_name).filter((p) => p !== null)),
  ].sort();

  // Filter cards based on selections
  $: filteredCards = cards.filter((card) => {
    if (numberFilter && card.number?.toString() !== numberFilter) return false;
    if (suitFilter && card.suit !== suitFilter) return false;
    if (elementFilter && card.element_name !== elementFilter) return false;
    if (polarityFilter && card.element_polarity !== polarityFilter)
      return false;
    if (signFilter && card.zodiac_sign_name !== signFilter) return false;
    if (qualityFilter && card.zodiac_quality !== qualityFilter) return false;
    if (planetFilter && card.planet_name !== planetFilter) return false;
    return true;
  });

  function clearCardFilters() {
    numberFilter = "";
    suitFilter = "";
    elementFilter = "";
    polarityFilter = "";
    signFilter = "";
    qualityFilter = "";
    planetFilter = "";
  }

  function toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];

    if (num === 0) return "0";

    let result = "";
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  function formatCardName(card: Card): string {
    if (
      (card.suit === null || card.suit === "Major Arcana") &&
      card.number !== null
    ) {
      return `${card.name} (${toRoman(card.number)})`;
    }
    return card.name;
  }

  async function loadCards() {
    loading = true;
    try {
      const response = await fetch("/api/admin/cards");
      if (!response.ok) {
        throw new Error("Failed to load cards");
      }
      cards = await response.json();
    } catch (e: any) {
      onToast("Failed to load cards: " + e.message, "error");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadCards();
  });
</script>

<div class="cards-section">
  <h3>Tarot Cards Database</h3>

  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
    </div>
  {:else if cards.length === 0}
    <div class="empty-state">No cards found in database</div>
  {:else}
    <div class="cards-count">
      Total Cards: {filteredCards.length}
      {#if filteredCards.length !== cards.length}
        (filtered from {cards.length})
      {/if}
    </div>

    <!-- Filters Section -->
    <div class="filters-section">
      <div class="controls">
        <select class="styled-select" bind:value={suitFilter}>
          <option value="">All Suits</option>
          {#each uniqueSuits as suit}
            <option value={suit}>{suit}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={numberFilter}>
          <option value="">All Numbers</option>
          {#each uniqueNumbers as num}
            <option value={num?.toString()}>{num}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={planetFilter}>
          <option value="">All Planets</option>
          {#each uniquePlanets as planet}
            <option value={planet}>{planet}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={elementFilter}>
          <option value="">All Elements</option>
          {#each uniqueElements as element}
            <option value={element}>{element}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={polarityFilter}>
          <option value="">All Polarities</option>
          {#each uniquePolarities as polarity}
            <option value={polarity}>{polarity}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={signFilter}>
          <option value="">All Signs</option>
          {#each uniqueSigns as sign}
            <option value={sign}>{sign}</option>
          {/each}
        </select>
        <select class="styled-select" bind:value={qualityFilter}>
          <option value="">All Qualities</option>
          {#each uniqueQualities as quality}
            <option value={quality}>{quality}</option>
          {/each}
        </select>
        {#if numberFilter || suitFilter || elementFilter || polarityFilter || signFilter || qualityFilter || planetFilter}
          <button class="clear-filters-btn" on:click={clearCardFilters}>
            Clear Filters
          </button>
        {/if}
      </div>
    </div>

    <div class="cards-table-container">
      <table class="cards-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Planet</th>
            <th>Element</th>
            <th>Polarity</th>
            <th>Sign</th>
            <th>Quality</th>
            <th>Keywords</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredCards as card}
            <tr>
              <td class="card-image-cell">
                {#if card.image_filename}
                  <img
                    src="/tarot-images/{card.image_filename}"
                    alt={card.name}
                    class="card-thumbnail"
                  />
                {:else}
                  <div class="card-placeholder">?</div>
                {/if}
              </td>
              <td class="card-name-cell">{formatCardName(card)}</td>
              <td>{card.planet_name || "-"}</td>
              <td>{card.element_name || "-"}</td>
              <td>{card.element_polarity || "-"}</td>
              <td>{card.zodiac_sign_name || "-"}</td>
              <td>{card.zodiac_quality || "-"}</td>
              <td class="keywords-cell">{card.keywords || "-"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile cards view -->
    <div class="cards-mobile">
      {#each filteredCards as card}
        <div class="card-mobile-item">
          <div class="card-mobile-header">
            {#if card.image_filename}
              <img
                src="/tarot-images/{card.image_filename}"
                alt={card.name}
                class="card-thumbnail-mobile"
              />
            {/if}
            <span>{formatCardName(card)}</span>
          </div>
          <div class="card-mobile-details">
            {#if card.planet_name}
              <div class="detail-item">
                <span class="detail-label">Planet:</span>
                <span class="detail-value">{card.planet_name}</span>
              </div>
            {/if}
            {#if card.element_name}
              <div class="detail-item">
                <span class="detail-label">Element:</span>
                <span class="detail-value">{card.element_name}</span>
              </div>
            {/if}
            {#if card.element_polarity}
              <div class="detail-item">
                <span class="detail-label">Polarity:</span>
                <span class="detail-value">{card.element_polarity}</span>
              </div>
            {/if}
            {#if card.zodiac_sign_name}
              <div class="detail-item">
                <span class="detail-label">Sign:</span>
                <span class="detail-value">{card.zodiac_sign_name}</span>
              </div>
            {/if}
            {#if card.zodiac_quality}
              <div class="detail-item">
                <span class="detail-label">Quality:</span>
                <span class="detail-value">{card.zodiac_quality}</span>
              </div>
            {/if}
            {#if card.keywords}
              <div class="detail-item">
                <span class="detail-label">Keywords:</span>
                <span class="detail-value">{card.keywords}</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cards-section {
    margin-top: 2rem;
  }

  .cards-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .cards-count {
    margin-bottom: 1rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .filters-section {
    margin-bottom: 1.5rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .clear-filters-btn {
    padding: 0.5rem 1rem;
    background: var(--color-bg-section);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .clear-filters-btn:hover {
    background: var(--color-danger);
    color: white;
    border-color: var(--color-danger);
  }

  .cards-table-container {
    overflow-x: auto;
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .cards-table {
    width: 100%;
    border-collapse: collapse;
  }

  .cards-table thead {
    background: var(--color-bg-section);
    border-bottom: 2px solid var(--color-border);
  }

  .cards-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-heading);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .cards-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .card-image-cell {
    width: 50px;
    padding: 0.5rem;
  }

  .card-thumbnail {
    width: 40px;
    height: 66px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: var(--shadow-sm);
  }

  .card-placeholder {
    width: 40px;
    height: 66px;
    background: linear-gradient(
      135deg,
      var(--color-bg-section) 0%,
      var(--color-border) 100%
    );
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-light);
    font-size: 0.75rem;
  }

  .cards-table tbody tr:hover {
    background-color: var(--color-bg-section);
  }

  .card-name-cell {
    font-weight: 600;
    color: var(--color-primary);
    white-space: nowrap;
  }

  .keywords-cell {
    max-width: 300px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .cards-mobile {
    display: none;
  }

  .card-mobile-item {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .card-mobile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-thumbnail-mobile {
    width: 35px;
    height: 58px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .card-mobile-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .detail-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .detail-value {
    color: var(--color-text-primary);
    text-align: right;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-light);
  }

  @media (max-width: 768px) {
    .cards-table-container {
      display: none;
    }

    .cards-mobile {
      display: block;
    }
  }
</style>
