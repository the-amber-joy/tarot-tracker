<script lang="ts">
  import { onMount } from 'svelte';
  
  type Reading = {
    id: number;
    date: string;
    time: string;
    spread_name: string;
    deck_name: string;
    cards?: any[];
  };
  
  type View = 'summary' | 'form' | 'detail';
  
  let currentView: View = 'summary';
  let readings: Reading[] = [];
  
  onMount(async () => {
    await loadReadings();
  });
  
  async function loadReadings() {
    try {
      const response = await fetch('/api/readings');
      readings = await response.json();
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  }
  
  function showSummaryView() {
    currentView = 'summary';
    loadReadings();
  }
  
  function showFormView() {
    currentView = 'form';
  }
  
  function showDetailView(id: number) {
    currentView = 'detail';
  }
</script>

<div class="container">
  <header>
    <h1>🔮 Tarot Tracker</h1>
  </header>

  <!-- Summary View -->
  {#if currentView === 'summary'}
    <div class="view">
      <div class="view-header">
        <h2>Your Readings</h2>
        <button class="btn btn-primary" on:click={showFormView}>
          + New Reading
        </button>
      </div>
      
      <div class="readings-list">
        {#if readings.length === 0}
          <div class="empty-state">
            <p>No readings yet. Create your first reading to get started!</p>
          </div>
        {:else}
          {#each readings as reading}
            <div class="reading-card">
              <div class="reading-header">
                <h3>{reading.spread_name}</h3>
                <span class="reading-date">{reading.date} at {reading.time}</span>
              </div>
              <div class="reading-info">
                <span class="badge">{reading.deck_name}</span>
                <span class="badge">{reading.cards?.length || 0} cards</span>
              </div>
              <div class="reading-actions">
                <button class="btn btn-secondary" on:click={() => showDetailView(reading.id)}>
                  View
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Form View (placeholder) -->
  {#if currentView === 'form'}
    <div class="view">
      <div class="view-header">
        <h2>New Reading</h2>
        <button class="btn btn-secondary" on:click={showSummaryView}>
          ← Back to Summary
        </button>
      </div>
      
      <p>Form coming soon...</p>
    </div>
  {/if}

  <!-- Detail View (placeholder) -->
  {#if currentView === 'detail'}
    <div class="view">
      <div class="view-header">
        <h2>Reading Details</h2>
        <button class="btn btn-secondary" on:click={showSummaryView}>
          ← Back to Summary
        </button>
      </div>
      
      <p>Detail view coming soon...</p>
    </div>
  {/if}
</div>
