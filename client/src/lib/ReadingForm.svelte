<script lang="ts">
  import { onMount } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { readingsStore } from '../stores/readingsStore';
  import SpreadCanvas from './SpreadCanvas.svelte';
  
  export let params: { id?: string } = {};
  
  $: readingId = params.id ? parseInt(params.id) : null;
  $: isEditMode = readingId !== null;
  
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
  let previousSpreadTemplate = '';
  let spreadName = '';
  let notes = '';
  let spreadCards: Record<number, any> = {};
  
  onMount(async () => {
    await Promise.all([loadDecks(), loadSpreadTemplates()]);
    if (isEditMode) {
      await loadReadingData();
    }
  });
  
  async function loadReadingData() {
    if (!readingId) return;
    
    try {
      const response = await fetch(`/api/readings/${readingId}`);
      const reading = await response.json();
      
      // Populate form fields
      date = reading.date;
      time = reading.time;
      deckName = reading.deck_name;
      spreadTemplate = reading.spread_template_id || 'custom';
      previousSpreadTemplate = reading.spread_template_id || 'custom';
      spreadName = reading.spread_name;
      notes = reading.notes || '';
      
      // Transform cards into spreadCards format
      spreadCards = reading.cards.reduce((acc: Record<number, any>, card: any, idx: number) => {
        acc[idx] = {
          card_name: card.card_name,
          position_label: card.position,
          interpretation: card.interpretation,
          position_x: card.position_x,
          position_y: card.position_y,
          rotation: card.rotation
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error loading reading:', error);
      alert('Error loading reading data.');
    }
  }
  
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
  
  function handleSpreadTemplateChange(event: Event) {
    const newTemplate = (event.target as HTMLSelectElement).value;
    
    // Check if there are any cards and if template is actually changing
    const hasCards = Object.keys(spreadCards).length > 0;
    const isChanging = previousSpreadTemplate !== newTemplate;
    
    if (hasCards && isChanging && previousSpreadTemplate) {
      const confirmed = confirm(
        'Changing the spread layout will clear all previously selected cards. Are you sure you want to continue?'
      );
      
      if (confirmed) {
        // Clear all cards
        spreadCards = {};
        spreadTemplate = newTemplate;
        previousSpreadTemplate = newTemplate;
      } else {
        // Revert to previous template
        spreadTemplate = previousSpreadTemplate;
        // Force the select to update
        (event.target as HTMLSelectElement).value = previousSpreadTemplate;
      }
    } else if (isChanging) {
      // Always clear cards when switching templates (even if no confirmation needed)
      spreadCards = {};
      spreadTemplate = newTemplate;
      previousSpreadTemplate = newTemplate;
    }
  }
  
  function handleTemplateAutoSelected(event: CustomEvent) {
    spreadTemplate = event.detail;
    previousSpreadTemplate = event.detail;
  }
  
  // Expose method to trigger submit from parent component
  export function triggerSubmit() {
    handleSubmit(new Event('submit'));
  }
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validate required fields
    if (!date || !time) {
      alert('Please fill in all required fields (Date and Time).');
      return;
    }
    
    // Prepare reading data
    const readingData = {
      date: date,
      time: time,
      deck_name: deckName || '-',
      spread_template_id: spreadTemplate || 'custom',
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
      const url = isEditMode ? `/api/readings/${readingId}` : '/api/readings';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(readingData)
      });
      
      if (response.ok) {
        await readingsStore.refresh();
        navigate('/');
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
    <h2>{isEditMode ? 'Edit Reading' : 'New Reading'}</h2>
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
        <label for="deckName">Deck Used</label>
        <select id="deckName" bind:value={deckName}>
          <option value="">No deck specified</option>
          {#each decks as deck}
            <option value={deck.name}>{deck.name}</option>
          {/each}
        </select>
      </div>
      
      <div class="form-group">
        <label for="spreadTemplate">Spread Template</label>
        <select id="spreadTemplate" value={spreadTemplate} on:change={handleSpreadTemplateChange}>
          <option disabled value="">Selct one, or click the canvas to start a custom spread...</option>
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
      <button type="button" class="btn btn-secondary" on:click={() => navigate('/')}>Cancel</button>
      <button type="submit" class="btn btn-primary">{isEditMode ? 'Update Reading' : 'Save Reading'}</button>
    </div>
  </form>
</div>

