<script lang="ts">
  import { onMount } from 'svelte';
  import ReadingDetail from './lib/ReadingDetail.svelte';
  import ReadingForm from './lib/ReadingForm.svelte';
  
  type Reading = {
    id: number;
    date: string;
    time: string;
    spread_name: string;
    deck_name: string;
    is_incomplete?: boolean;
    cards?: any[];
  };
  
  type View = 'summary' | 'form' | 'detail';
  
  let currentView: View = 'summary';
  let readings: Reading[] = [];
  let selectedReadingId: number | null = null;
  let editingReadingId: number | null = null;
  let sortAscending: boolean = false;
  
  onMount(async () => {
    await loadReadings();
  });
  
  async function loadReadings() {
    try {
      const response = await fetch('/api/readings');
      readings = await response.json();
      sortReadings();
    } catch (error) {
      console.error('Error loading readings:', error);
    }
  }
  
  function toggleDateSort() {
    sortAscending = !sortAscending;
    sortReadings();
  }
  
  function sortReadings() {
    readings = readings.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return sortAscending 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });
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
  
  function showSummaryView() {
    currentView = 'summary';
    editingReadingId = null;
    loadReadings();
  }
  
  function showFormView(readingId?: number) {
    currentView = 'form';
    editingReadingId = readingId || null;
  }
  
  function showDetailView(id: number) {
    currentView = 'detail';
    selectedReadingId = id;
  }
  
  function handleEdit(id: number) {
    showFormView(id);
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
        <h2>Past Readings</h2>
        <button class="btn btn-primary" on:click={() => showFormView()}>
          + New Reading
        </button>
      </div>
      
      <table class="readings-table">
        <thead>
          <tr>
            <th on:click={toggleDateSort} style="cursor: pointer;">
              Date {sortAscending ? '↑' : '↓'}
            </th>
            <th>Spread Name</th>
            <th>Deck</th>
            <th style="text-align: center;">Incomplete</th>
          </tr>
        </thead>
        <tbody>
          {#if readings.length === 0}
            <tr>
              <td colspan="4" class="empty-message">
                No readings yet. Click "New Reading" to get started!
              </td>
            </tr>
          {:else}
            {#each readings as reading}
              <tr on:click={() => showDetailView(reading.id)} style="cursor: pointer;">
                <td>{formatDateTime(reading.date, reading.time)}</td>
                <td>{reading.spread_name}</td>
                <td>{reading.deck_name}</td>
                <td style="text-align: center;">{reading.is_incomplete ? '⚠️' : ''}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <!-- Form View -->
  {#if currentView === 'form'}
    <ReadingForm 
      readingId={editingReadingId}
      onBack={showSummaryView}
      onSaved={showSummaryView}
    />
  {/if}

  <!-- Detail View -->
  {#if currentView === 'detail' && selectedReadingId}
    <ReadingDetail 
      readingId={selectedReadingId} 
      onBack={showSummaryView}
      onEdit={handleEdit}
    />
  {/if}
</div>
