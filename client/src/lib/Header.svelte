<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DeckModal from './DeckModal.svelte';
  
  export let onNewReading: () => void;
  export let onSave: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;
  export let isFormView: boolean = false;
  
  const dispatch = createEventDispatcher();
  let isDeckModalOpen = false;
  
  function openDeckModal() {
    isDeckModalOpen = true;
  }
  
  function closeDeckModal() {
    isDeckModalOpen = false;
  }
  
  function handleDeckAdded() {
    // Dispatch event so other components can reload decks if needed
    dispatch('decksUpdated');
  }
</script>

<header class="app-header">
  <h1>🔮 Tarot Tracker</h1>
  
  <div class="header-actions">
    <button class="btn btn-secondary" on:click={openDeckModal}>
      Manage Decks
    </button>
    {#if isFormView}
      <button class="btn btn-secondary" on:click={onCancel}>
        Cancel
      </button>
      <button class="btn btn-primary" on:click={onSave}>
        Save Reading
      </button>
    {:else}
      <button class="btn btn-primary" on:click={onNewReading}>
        + New Reading
      </button>
    {/if}
  </div>
</header>

<DeckModal 
  isOpen={isDeckModalOpen}
  onClose={closeDeckModal}
  onDeckAdded={handleDeckAdded}
/>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: var(--color-bg-secondary, #1a1a2e);
    border-bottom: 2px solid var(--color-border, #16213e);
    margin-bottom: 2rem;
  }
  
  .app-header h1 {
    margin: 0;
    font-size: 2rem;
    color: var(--color-text, #eee);
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
  }
</style>
