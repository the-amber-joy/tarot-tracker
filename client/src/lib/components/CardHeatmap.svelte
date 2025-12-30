<script lang="ts">
  import { suitColors } from "../chartColors";

  type CardData = {
    card_name: string;
    suit: string | null;
    number: number;
    count: number;
  };

  export let data: CardData[] = [];
  export let onCardClick: ((cardName: string) => void) | undefined = undefined;

  // Tooltip state
  let activeCard: string | null = null;
  let tooltipX = 0;
  let tooltipY = 0;
  let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleCellClick(event: MouseEvent, cardName: string, count: number) {
    // If this card is already active, trigger the onCardClick
    if (activeCard === cardName) {
      onCardClick?.(cardName);
      closeTooltip();
      return;
    }

    // Otherwise, show the tooltip
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    tooltipX = rect.left + rect.width / 2;
    tooltipY = rect.top;
    activeCard = cardName;

    // Clear any existing timeout
    if (tooltipTimeout) clearTimeout(tooltipTimeout);

    // Auto-dismiss after 3 seconds
    tooltipTimeout = setTimeout(() => {
      closeTooltip();
    }, 3000);
  }

  function closeTooltip() {
    activeCard = null;
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
      tooltipTimeout = null;
    }
  }

  function handleOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (
      !target.closest(".heatmap-cell") &&
      !target.closest(".mobile-tooltip")
    ) {
      closeTooltip();
    }
  }

  // Define the structure of the deck
  const majorArcanaOrder = [
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

  const minorNumbers = [
    "Ace",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Page",
    "Knight",
    "Queen",
    "King",
  ];

  const suits = ["Wands", "Cups", "Swords", "Pentacles"];

  // Create a map for quick lookup
  $: cardCountMap = new Map(data.map((card) => [card.card_name, card.count]));

  // Find max count for color scaling
  $: maxCount = Math.max(...data.map((c) => c.count), 1);

  // Reactive function that includes dependencies explicitly
  $: getCount = (cardName: string): number => {
    return cardCountMap.get(cardName) || 0;
  };

  $: getOpacity = (count: number): number => {
    if (count === 0) return 0.03;
    // Scale from 0.08 to 1.0 based on count for maximum contrast
    return 0.08 + (count / maxCount) * 0.92;
  };

  function getSuitColor(suit: string): string {
    switch (suit) {
      case "Major Arcana":
        return suitColors.majorArcana.border;
      case "Wands":
        return suitColors.wands.border;
      case "Cups":
        return suitColors.cups.border;
      case "Swords":
        return suitColors.swords.border;
      case "Pentacles":
        return suitColors.pentacles.border;
      default:
        return "#888";
    }
  }

  function getMinorCardName(number: string, suit: string): string {
    return `${number} of ${suit}`;
  }

  // Short labels for minor arcana
  function getShortLabel(number: string): string {
    const shortMap: Record<string, string> = {
      Ace: "A",
      Two: "2",
      Three: "3",
      Four: "4",
      Five: "5",
      Six: "6",
      Seven: "7",
      Eight: "8",
      Nine: "9",
      Ten: "10",
      Page: "Pg",
      Knight: "Kn",
      Queen: "Q",
      King: "K",
    };
    return shortMap[number] || number;
  }

  // Short labels for major arcana
  function getMajorShortLabel(name: string): string {
    const shortMap: Record<string, string> = {
      "The Fool": "0",
      "The Magician": "I",
      "The High Priestess": "II",
      "The Empress": "III",
      "The Emperor": "IV",
      "The Hierophant": "V",
      "The Lovers": "VI",
      "The Chariot": "VII",
      Strength: "VIII",
      "The Hermit": "IX",
      "Wheel of Fortune": "X",
      Justice: "XI",
      "The Hanged Man": "XII",
      Death: "XIII",
      Temperance: "XIV",
      "The Devil": "XV",
      "The Tower": "XVI",
      "The Star": "XVII",
      "The Moon": "XVIII",
      "The Sun": "XIX",
      Judgement: "XX",
      "The World": "XXI",
    };
    return shortMap[name] || name;
  }
</script>

<svelte:window on:click={handleOutsideClick} />

<div class="heatmap-container">
  <!-- Mobile Tooltip -->
  {#if activeCard}
    {@const currentCard = activeCard}
    {@const count = getCount(currentCard)}
    <div class="mobile-tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
      <div class="tooltip-content">
        <span class="tooltip-card-name">{currentCard}</span>
        <span class="tooltip-count">Count: {count}</span>
        {#if onCardClick}
          <button
            class="tooltip-action"
            on:click={() => {
              onCardClick?.(currentCard);
              closeTooltip();
            }}
          >
            Tap for card details
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Major Arcana Row -->
  <div class="heatmap-row">
    <div class="row-label" style="color: {getSuitColor('Major Arcana')}">
      Major Arcana
    </div>
    <div class="heatmap-cells major-cells">
      {#each majorArcanaOrder as cardName (cardName)}
        {@const count = getCount(cardName)}
        <button
          class="heatmap-cell"
          class:active={activeCard === cardName}
          style="background-color: {getSuitColor(
            'Major Arcana',
          )}; opacity: {getOpacity(count)}"
          title="{cardName}: {count}"
          on:click={(e) => handleCellClick(e, cardName, count)}
        >
          <span class="cell-label">{getMajorShortLabel(cardName)}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Minor Arcana Rows -->
  {#each suits as suit (suit)}
    <div class="heatmap-row">
      <div class="row-label" style="color: {getSuitColor(suit)}">{suit}</div>
      <div class="heatmap-cells minor-cells">
        {#each minorNumbers as number (number)}
          {@const cardName = getMinorCardName(number, suit)}
          {@const count = getCount(cardName)}
          <button
            class="heatmap-cell"
            class:active={activeCard === cardName}
            style="background-color: {getSuitColor(suit)}; opacity: {getOpacity(
              count,
            )}"
            title="{cardName}: {count}"
            on:click={(e) => handleCellClick(e, cardName, count)}
          >
            <span class="cell-label">{getShortLabel(number)}</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Legend -->
  <div class="heatmap-legend">
    <span class="legend-label">Less frequent</span>
    <div class="legend-gradient"></div>
    <span class="legend-label">More frequent</span>
  </div>
</div>

<style>
  .heatmap-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .heatmap-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .row-label {
    width: 100px;
    font-weight: 600;
    font-size: 0.85rem;
    text-align: right;
    flex-shrink: 0;
  }

  .heatmap-cells {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
  }

  .major-cells {
    max-width: calc(22 * 32px + 21 * 3px);
  }

  .minor-cells {
    max-width: calc(14 * 32px + 13 * 3px);
  }

  .heatmap-cell {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;
    border: none;
    padding: 0;
    font-family: inherit;
  }

  .heatmap-cell:hover,
  .heatmap-cell.active {
    transform: scale(1.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    z-index: 10;
    opacity: 1 !important;
  }

  .heatmap-cell.active {
    outline: 2px solid white;
  }

  .cell-label {
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .heatmap-legend {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
    padding-left: 116px;
  }

  .legend-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .legend-gradient {
    width: 120px;
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(
      to right,
      rgba(128, 128, 128, 0.2),
      rgba(128, 128, 128, 1)
    );
  }

  /* Mobile Tooltip Styles */
  .mobile-tooltip {
    position: fixed;
    transform: translate(-50%, -100%) translateY(-12px);
    z-index: 100;
    pointer-events: auto;
  }

  .tooltip-content {
    background: #1a1a2e;
    border: 1px solid #3a3a5c;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    min-width: 140px;
  }

  .tooltip-card-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: #ffffff;
    text-align: center;
  }

  .tooltip-count {
    font-size: 0.85rem;
    color: #e0e0e0;
    font-weight: 500;
  }

  .tooltip-action {
    margin-top: 0.25rem;
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
    background: var(--color-primary, #6366f1);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .tooltip-action:hover {
    background: var(--color-primary-hover, #5558e3);
  }

  @media (max-width: 768px) {
    .row-label {
      width: 70px;
      font-size: 0.75rem;
    }

    .heatmap-cell {
      width: 22px;
      height: 22px;
    }

    .cell-label {
      font-size: 0.55rem;
    }

    .heatmap-legend {
      padding-left: 86px;
    }

    .major-cells {
      max-width: calc(22 * 25px + 21 * 3px);
    }

    .minor-cells {
      max-width: calc(14 * 25px + 13 * 3px);
    }
  }

  @media (max-width: 600px) {
    .heatmap-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .row-label {
      text-align: left;
      width: auto;
    }

    .heatmap-legend {
      padding-left: 0;
      justify-content: center;
    }
  }
</style>
