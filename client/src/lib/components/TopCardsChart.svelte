<script lang="ts">
  import { suitColors } from "../chartColors";

  type CardData = {
    name: string;
    suit: string | null;
    count: number;
    image_filename?: string;
  };

  export let cards: CardData[] = [];

  // Find max count for scaling bars
  $: maxCount = Math.max(...cards.map((c) => c.count), 1);

  function getSuitColor(suit: string | null): string {
    switch (suit) {
      case "Wands":
        return suitColors.wands.background;
      case "Cups":
        return suitColors.cups.background;
      case "Swords":
        return suitColors.swords.background;
      case "Pentacles":
        return suitColors.pentacles.background;
      default:
        return suitColors.majorArcana.background;
    }
  }
</script>

<div class="top-cards-chart">
  {#each cards as card, index}
    <div class="card-row">
      <div class="card-label">
        <div class="card-thumbnail">
          {#if card.image_filename}
            <img
              src="/tarot-images/{card.image_filename}"
              alt={card.name}
              class="card-image"
            />
          {:else}
            <div class="card-placeholder">?</div>
          {/if}
        </div>
        <span class="card-name">{card.name}</span>
      </div>
      <div class="bar-container">
        <div
          class="bar"
          style="width: {(card.count / maxCount) *
            100}%; background-color: {getSuitColor(card.suit)};"
        ></div>
        <span class="count-label">{card.count}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .top-cards-chart {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .card-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .card-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 200px;
    flex-shrink: 0;
  }

  .card-thumbnail {
    width: 30px;
    height: 50px;
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      var(--color-bg-section) 0%,
      var(--color-border) 100%
    );
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-light);
    font-size: 0.75rem;
  }

  .card-name {
    font-size: 0.9rem;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .bar-container {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 24px;
  }

  .bar {
    height: 100%;
    border-radius: 4px;
    min-width: 4px;
    transition: width 0.3s ease;
  }

  .count-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    min-width: 30px;
  }

  @media (max-width: 768px) {
    .card-label {
      min-width: 150px;
    }

    .card-thumbnail {
      width: 24px;
      height: 40px;
    }

    .card-name {
      font-size: 0.8rem;
    }
  }
</style>
