<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { readingsStore } from '../stores/readingsStore';
  import DeckModal from './DeckModal.svelte';
  
  type Reading = {
    id: number;
    date: string;
    time: string;
    spread_name: string;
    deck_name: string;
    is_incomplete?: boolean;
  };
  
  let sortAscending: boolean = false;
  let showFabMenu: boolean = false;
  let isDeckModalOpen: boolean = false;
  
  $: readings = $readingsStore;
  $: sortedReadings = [...readings].sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
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
    const dateObj = new Date(date + ' ' + time);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
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
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDateSort();
    }
  }
  
  function handleRowKeydown(event: KeyboardEvent, reading: Reading) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleReadingClick(reading);
    }
  }

  function toggleFabMenu() {
    showFabMenu = !showFabMenu;
  }

  function handleNewReading() {
    showFabMenu = false;
    navigate('/reading/new');
  }

  function handleNewDeck() {
    showFabMenu = false;
    isDeckModalOpen = true;
  }

  function closeDeckModal() {
    isDeckModalOpen = false;
  }

  function handleDeckAdded() {
    // Deck was added, modal will close automatically
  }
</script>

<div class="view summary-view">
  <div class="view-header">
    <h2>Past Readings</h2>
    <button class="mobile-sort-btn" on:click={toggleDateSort}>
      Date {sortAscending ? '↑' : '↓'}
    </button>
  </div>
  
  <!-- Table layout for larger screens -->
  <table class="readings-table">
    <thead>
      <tr>
        <th on:click={toggleDateSort} on:keydown={handleSortKeydown} tabindex="0" style="cursor: pointer;">
          Date {sortAscending ? '↑' : '↓'}
        </th>
        <th>Spread Name</th>
        <th>Deck</th>
      </tr>
    </thead>
    <tbody aria-live="polite">
      {#if readings.length === 0}
        <tr>
          <td colspan="3" class="empty-message">
            No readings yet. Tap the + button to get started!
          </td>
        </tr>
      {:else}
        {#each sortedReadings as reading}
          <tr on:click={() => handleReadingClick(reading)} on:keydown={(e) => handleRowKeydown(e, reading)} tabindex="0" style="cursor: pointer;">
            <td>{formatDateTime(reading.date, reading.time)}</td>
            <td>
              {#if reading.is_incomplete}
                <span class="incomplete-icon" title="Incomplete">⚠️</span>
              {/if}
              {reading.spread_name}
            </td>
            <td>{reading.deck_name}</td>
          </tr>
        {/each}
      {/if}
    </tbody>
  </table>
  
  <!-- Card layout for mobile -->
  <div class="readings-cards" aria-live="polite">
    {#if sortedReadings.length === 0}
      <p class="empty-message">No readings yet. Tap the + button below to get started!</p>
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
              {reading.spread_name}
            </span>
            <span class="reading-deck">{reading.deck_name}</span>
          </div>
          <div class="reading-date">{formatDateTime(reading.date, reading.time)}</div>
        </button>
      {/each}
    {/if}
  </div>

  <!-- Floating action button for mobile -->
  <div class="fab-container">
    {#if showFabMenu}
      <div class="fab-menu">
        <button class="fab-menu-item" on:click={handleNewReading}>
          <span class="fab-menu-icon">📖</span>
          <span class="fab-menu-label">New Reading</span>
        </button>
        <button class="fab-menu-item" on:click={handleNewDeck}>
          <span class="fab-menu-icon">🃏</span>
          <span class="fab-menu-label">Manage Decks</span>
        </button>
      </div>
    {/if}
    <button 
      class="fab" 
      class:fab-open={showFabMenu}
      on:click={toggleFabMenu} 
      aria-label="Menu" 
      aria-expanded={showFabMenu}
    >
      <span class="fab-icon">{showFabMenu ? '×' : '+'}</span>
    </button>
  </div>

  <DeckModal 
    isOpen={isDeckModalOpen}
    onClose={closeDeckModal}
    onDeckAdded={handleDeckAdded}
  />
</div>

<style>
  .summary-view {
    container-type: inline-size;
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
      color: #666;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    
    .mobile-sort-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #333;
    }
    
    .mobile-sort-btn:focus {
      outline: 2px solid var(--color-primary, #7b2cbf);
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
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s;
      color: #333;
    }
    
    .reading-card:hover {
      transform: translateY(-2px);
      border-color: var(--color-primary, #7b2cbf);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
      color: #333;
    }
    
    .reading-deck {
      color: #666;
      font-size: 0.9rem;
    }
    
    .reading-date {
      color: #666;
      font-size: 0.9rem;
    }
  }
  
  /* Floating Action Button */
  .fab-container {
    position: fixed;
    bottom: 2rem;
    right: max(2rem, calc((100vw - 1200px) / 2));
    display: none;
    flex-direction: column;
    align-items: flex-end;
    gap: 1rem;
    z-index: 100;
  }

  .fab-menu {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fab-menu-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: white;
    border: none;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .fab-menu-item:hover {
    transform: translateX(-5px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .fab-menu-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .fab-menu-label {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }

  .fab {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .fab:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab.fab-open:active {
    transform: scale(0.95);
  }

  .fab-icon {
    font-size: 2rem;
    line-height: 1;
    font-weight: 300;
  }

  /* Floating Action Button - visible on all screen sizes */
  .fab-container {
    display: flex;
  }
</style>
