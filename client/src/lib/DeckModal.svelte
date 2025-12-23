<script lang="ts">
  import { onMount } from 'svelte';
  
  export let isOpen = false;
  export let onClose: () => void;
  export let onDeckAdded: () => void;
  
  type Deck = {
    id: number;
    name: string;
  };
  
  let decks: Deck[] = [];
  let newDeckName = '';
  let modalElement: HTMLDivElement;
  
  onMount(async () => {
    if (isOpen) {
      await loadDecks();
    }
  });
  
  async function loadDecks() {
    try {
      const response = await fetch('/api/decks');
      decks = await response.json();
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  }
  
  async function handleAddDeck() {
    if (!newDeckName.trim()) {
      alert('Please enter a deck name.');
      return;
    }
    
    try {
      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newDeckName.trim() })
      });
      
      if (response.ok) {
        newDeckName = '';
        await loadDecks();
        onDeckAdded();
      } else {
        const error = await response.text();
        alert(`Failed to add deck: ${error}`);
      }
    } catch (error) {
      console.error('Error adding deck:', error);
      alert('Error adding deck. Please try again.');
    }
  }
  
  async function handleDeleteDeck(deckId: number, deckName: string) {
    if (!confirm(`Delete deck "${deckName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadDecks();
        onDeckAdded();
      } else {
        const error = await response.text();
        alert(`Failed to delete deck: ${error}`);
      }
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Error deleting deck. Please try again.');
    }
  }
  
  // Reload decks when modal opens
  $: if (isOpen) {
    loadDecks();
  }
</script>

{#if isOpen}
  <div class="modal" bind:this={modalElement}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Manage Decks</h2>
        <button class="btn-close" on:click={onClose}>&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label for="newDeckName">Add New Deck</label>
          <div class="input-with-button">
            <input 
              type="text" 
              id="newDeckName" 
              bind:value={newDeckName}
              placeholder="Enter deck name..."
              on:keydown={(e) => e.key === 'Enter' && handleAddDeck()}
            />
            <button class="btn-small" on:click={handleAddDeck}>Add</button>
          </div>
        </div>
        
        <div class="deck-list">
          <h3>Your Decks</h3>
          <ul>
            {#each decks as deck}
              <li>
                <span>{deck.name}</span>
                <button 
                  class="btn-remove-small" 
                  on:click={() => handleDeleteDeck(deck.id, deck.name)}
                >
                  Remove
                </button>
              </li>
            {/each}
            {#if decks.length === 0}
              <li style="color: #666; font-style: italic;">No decks added yet</li>
            {/if}
          </ul>
        </div>
      </div>
    </div>
  </div>
{/if}
