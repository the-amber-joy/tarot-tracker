<script lang="ts">
  import { onMount } from 'svelte';
  import SpreadCanvas from './SpreadCanvas.svelte';
  
  export let onBack: () => void;
  export let onSaved: () => void;
  
  type Deck = {
    id: number;
    name: string;
  };
  
  type SpreadTemplate = {
    id: string;
    name: string;
    description: string;
    positions: any[];
  };
  
  let decks: Deck[] = [];
  let spreadTemplates: SpreadTemplate[] = [];
  
  let date = new Date().toISOString().split('T')[0];
  let time = new Date().toTimeString().slice(0, 5);
  let deckName = '';
  let spreadTemplate = '';
  let spreadName = '';
  let notes = '';
  let spreadCards: Record<number, any> = {};
  
  onMount(async () => {
    await Promise.all([loadDecks(), loadSpreadTemplates()]);
  });
  
  async function loadDecks() {
    try {
      const response = await fetch('/api/decks');
      decks = await response.json();
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  }
  
  async function loadSpreadTemplates() {
    try {
      const response = await fetch('/api/spreads');
      spreadTemplates = await response.json();
    } catch (error) {
      console.error('Error loading spread templates:', error);
    }
  }
  
  function setToday() {
    date = new Date().toISOString().split('T')[0];
  }
  
  function setNow() {
    time = new Date().toTimeString().slice(0, 5);
  }
  
  function handleCardsUpdate(cards: Record<number, any>) {
    spreadCards = cards;
  }
  
  function handleTemplateAutoSelected(event: CustomEvent) {
    spreadTemplate = event.detail;
  }
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validate required fields
    if (!date || !time || !deckName) {
      alert('Please fill in all required fields (Date, Time, and Deck).');
      return;
    }
    
    // Prepare reading data
    const readingData = {
      date: date,
      time: time,
      deck_name: deckName,
      spread_template: spreadTemplate || 'custom',
      spread_name: spreadName || (spreadTemplate === 'celtic-cross' ? 'Celtic Cross' : 'Custom Spread'),
      notes: notes,
      cards: Object.entries(spreadCards).map(([indexStr, card]) => ({
        card_order: parseInt(indexStr),
        position: card.position_label,
        card_name: card.card_name || '',
        interpretation: card.interpretation || '',
        position_x: card.position_x,
        position_y: card.position_y,
        rotation: card.rotation || 0
      }))
    };
    
    try {
      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(readingData)
      });
      
      if (response.ok) {
        onSaved();
      } else {
        const error = await response.text();
        alert(`Failed to save reading: ${error}`);
      }
    } catch (error) {
      console.error('Error saving reading:', error);
      alert('Error saving reading. Please try again.');
    }
  }
</script>

<div class="view">
  <div class="view-header">
    <h2>New Reading</h2>
    <button class="btn btn-primary" on:click={onBack}>
      ← Back to Summary
    </button>
  </div>
  
  <form on:submit={handleSubmit}>
    <div class="form-section">
      <h3>Reading Details</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="date">Date<span class="required">*</span></label>
          <div class="input-with-button">
            <input type="date" id="date" bind:value={date} required />
            <button type="button" class="btn btn-primary" on:click={setToday}>
              Today
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label for="time">Time<span class="required">*</span></label>
          <div class="input-with-button">
            <input type="time" id="time" bind:value={time} required />
            <button type="button" class="btn btn-primary" on:click={setNow}>
              Now
            </button>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="deckName">Deck Used<span class="required">*</span></label>
        <div class="input-with-button">
          <select id="deckName" bind:value={deckName} required>
            <option value="" disabled>Select a deck...</option>
            {#each decks as deck}
              <option value={deck.name}>{deck.name}</option>
            {/each}
          </select>
          <button type="button" class="btn btn-primary">Manage Decks</button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="spreadTemplate">Spread Template</label>
        <select id="spreadTemplate" bind:value={spreadTemplate}>
          <option value="">Click the canvas to start a custom spread...</option>
          {#each spreadTemplates as template}
            <option value={template.id}>{template.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="spreadName">Spread Name</label>
        <input 
          type="text" 
          id="spreadName" 
          bind:value={spreadName}
          placeholder="e.g., Three Card Spread, Celtic Cross"
        />
      </div>
      
      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea 
          id="notes" 
          bind:value={notes}
          placeholder="Summary notes about the reading..."
          rows="4"
        ></textarea>
      </div>
    </div>
    
    <div class="form-section">
      <h3>Spread Layout</h3>
      <p class="hint">Click on a card position to add a card</p>
      
      <SpreadCanvas 
        bind:spreadTemplate={spreadTemplate}
        spreadCards={spreadCards}
        onCardsUpdate={handleCardsUpdate}
        on:templateAutoSelected={handleTemplateAutoSelected}
      />
    </div>
    
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save Reading</button>
      <button type="button" class="btn btn-secondary" on:click={onBack}>Cancel</button>
    </div>
  </form>
</div>
