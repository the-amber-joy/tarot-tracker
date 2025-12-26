<script lang="ts">
  import { navigate } from "svelte-routing";
  import SpreadCanvas from "../components/SpreadCanvas.svelte";

  export let params: { id?: string } = { id: "" };

  const readingId = parseInt(params.id || "");

  type Card = {
    card_name: string;
    position: string;
    interpretation: string;
    position_x?: number;
    position_y?: number;
    rotation?: number;
  };

  type Reading = {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    notes?: string;
    cards: Card[];
  };

  let reading: Reading | null = null;
  let readingPromise: Promise<void>;

  // Transform reading cards into spreadCards format
  $: spreadCards =
    reading?.cards.reduce(
      (acc, card, idx) => {
        acc[idx] = {
          card_name: card.card_name,
          position_label: card.position,
          interpretation: card.interpretation,
          position_x: card.position_x,
          position_y: card.position_y,
          rotation: card.rotation,
        };
        return acc;
      },
      {} as Record<number, any>,
    ) || {};

  async function loadReading() {
    const response = await fetch(`/api/readings/${readingId}`);
    reading = await response.json();
  }

  readingPromise = loadReading();
</script>

{#await readingPromise}
  <!-- Don't render anything while loading -->
{:then}
  {#if reading}
    <div class="view">
      <div class="view-header">
        <h2>Reading Details</h2>
        <button
          type="button"
          class="btn btn-primary"
          on:click={() => navigate(`/reading/${readingId}/edit`)}>Edit</button
        >
      </div>

      <div class="detail-section">
        <h3>Reading Information</h3>
        <div class="detail-grid">
          <div class="detail-item">
            <strong>Date:</strong>
            {reading.date}
          </div>
          <div class="detail-item">
            <strong>Time:</strong>
            {reading.time}
          </div>
          <div class="detail-item">
            <strong>Deck:</strong>
            {reading.deck_name || "No Deck Specified"}
          </div>
          <div class="detail-item">
            <strong>Title:</strong>
            {reading.title}
          </div>
        </div>
        {#if reading.notes}
          <div class="detail-item">
            <strong>Notes:</strong>
            <p>{reading.notes}</p>
          </div>
        {/if}
      </div>

      <div class="detail-section">
        <h3>Spread Layout</h3>
        <SpreadCanvas
          spreadTemplate={reading.spread_template_id || "custom"}
          {spreadCards}
          readonly={true}
          onCardsUpdate={() => {}}
        />
      </div>

      <div class="detail-section">
        <h3>Cards ({reading.cards.length})</h3>
        {#each reading.cards as card, index}
          <div class="card-detail">
            <h4>Card {index + 1}: {card.position}</h4>
            <p class="card-detail-name">{card.card_name}</p>
            {#if card.interpretation}
              <p class="card-interpretation">{card.interpretation}</p>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="view">
      <p>Reading not found.</p>
    </div>
  {/if}
{:catch error}
  <div class="view">
    <p>Error loading reading: {error.message}</p>
  </div>
{/await}
