<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { readingsStore } from '../stores/readingsStore';
  
  type Reading = {
    id: number;
    date: string;
    time: string;
    spread_name: string;
    deck_name: string;
    is_incomplete?: boolean;
  };
  
  let sortAscending: boolean = false;
  
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

</script>

<div class="view summary-view">
  <div class="view-header">
    <h2>My Readings</h2>
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
</style>
