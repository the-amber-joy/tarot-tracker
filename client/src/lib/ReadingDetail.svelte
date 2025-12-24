<script lang="ts">
  import { onMount } from 'svelte';
  import SpreadCanvas from './SpreadCanvas.svelte';
  
  export let readingId: number;
  export let onBack: () => void;
  export let onEdit: (id: number) => void;
  
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
    spread_name: string;
    spread_template_id?: string;
    deck_name: string;
    notes?: string;
    cards: Card[];
  };
  
  let reading: Reading | null = null;
  let loading = true;
  
  // Transform reading cards into spreadCards format
  $: spreadCards = reading?.cards.reduce((acc, card, idx) => {
    acc[idx] = {
      card_name: card.card_name,
      position_label: card.position,
      interpretation: card.interpretation,
      position_x: card.position_x,
      position_y: card.position_y,
      rotation: card.rotation
    };
    return acc;
  }, {} as Record<number, any>) || {};
  
  onMount(async () => {
    await loadReading();
  });
  
  async function loadReading() {
    try {
      const response = await fetch(`/api/readings/${readingId}`);
      reading = await response.json();
      loading = false;
    } catch (error) {
      console.error('Error loading reading:', error);
      loading = false;
    }
  }
</script>

{#if loading}
  <div class="view">
    <p>Loading...</p>
  </div>
{:else if reading}
  <div class="view">
    <div class="view-header">
      <h2>Reading Details</h2>
      <div>
        <button class="btn btn-primary" on:click={() => onEdit(readingId)}>
          Edit
        </button>
        <button class="btn btn-secondary" on:click={onBack}>
          ← Back to Summary
        </button>
      </div>
    </div>
    
    <div class="detail-section">
      <h3>Reading Information</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <strong>Date:</strong> {reading.date}
        </div>
        <div class="detail-item">
          <strong>Time:</strong> {reading.time}
        </div>
        <div class="detail-item">
          <strong>Deck:</strong> {reading.deck_name}
        </div>
        <div class="detail-item">
          <strong>Spread:</strong> {reading.spread_name}
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
        spreadTemplate={reading.spread_template_id || 'custom'}
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
          <p class="card-name">{card.card_name}</p>
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
    <button class="btn btn-secondary" on:click={onBack}>
      ← Back to Summary
    </button>
  </div>
{/if}
