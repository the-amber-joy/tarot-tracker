<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import DeckModal from './DeckModal.svelte';
  
  export let onNewReading: () => void;
  export let onSave: (() => void) | null = null;
  export let onCancel: (() => void) | null = null;
  export let isFormView: boolean = false;
  
  const dispatch = createEventDispatcher();
  let isDeckModalOpen = false;
  let isMenuOpen = false;
  
  function openDeckModal() {
    isDeckModalOpen = true;
    isMenuOpen = false; // Close menu when opening modal
  }
  
  function closeDeckModal() {
    isDeckModalOpen = false;
  }
  
  function handleDeckAdded() {
    // Dispatch event so other components can reload decks if needed
    dispatch('decksUpdated');
  }
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  function handleNewReading() {
    isMenuOpen = false; // Close menu when opening new reading
    onNewReading();
  }
</script>

<header class="app-header">
  <h1>🔮 Tarot Tracker</h1>
  
  <button class="hamburger" on:click={toggleMenu} aria-label="Menu" aria-expanded={isMenuOpen}>
    <span></span>
    <span></span>
    <span></span>
  </button>
  
  <div class="header-actions" class:menu-open={isMenuOpen}>
    <button class="btn btn-secondary manage-decks-btn" on:click={openDeckModal}>
      Manage Decks
    </button>
    {#if isFormView}
      <button class="btn btn-secondary form-action-btn" on:click={onCancel}>
        Cancel
      </button>
      <button class="btn btn-primary form-action-btn" on:click={onSave}>
        Save Reading
      </button>
    {:else}
      <button class="btn btn-primary" on:click={handleNewReading}>
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
    position: relative;
    container-type: inline-size;
  }
  
  .app-header h1 {
    margin: 0;
    font-size: 2rem;
    color: var(--color-text, #eee);
  }
  
  .hamburger {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
  }
  
  .hamburger span {
    width: 24px;
    height: 3px;
    background: var(--color-text, #eee);
    transition: all 0.3s ease;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
  }
  
  /* Container query: show hamburger when header is narrow */
  @container (max-width: 600px) {
    .app-header h1 {
      font-size: 1.5rem;
    }
    
    .hamburger {
      display: flex;
    }
    
    .header-actions {
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      flex-direction: column;
      background: var(--color-bg-secondary, #1a1a2e);
      border-bottom: 2px solid var(--color-border, #16213e);
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      z-index: 10;
    }
    
    .header-actions.menu-open {
      max-height: 300px;
      padding: 1rem;
    }
    
    .header-actions button {
      width: 100%;
    }
    
    /* Hide save/cancel buttons in menu on mobile */
    .form-action-btn {
      display: none;
    }
  }
</style>
