<script lang="ts">
  import { onMount } from 'svelte';
  
  export let isOpen = false;
  export let cardIndex: number | null = null;
  export let positionLabel = '';
  export let existingCard: any = null;
  export let usedCards: string[] = [];
  export let onSave: (cardData: any) => void;
  export let onCancel: () => void;
  
  type TarotCard = {
    name: string;
    suit?: string;
    rank?: string;
  };
  
  let tarotCards: TarotCard[] = [];
  let cardName = '';
  let cardInterpretation = '';
  let modalElement: HTMLDivElement;
  
  onMount(async () => {
    await loadTarotCards();
  });
  
  async function loadTarotCards() {
    try {
      const response = await fetch('/api/cards');
      tarotCards = await response.json();
    } catch (error) {
      console.error('Error loading tarot cards:', error);
    }
  }
  
  function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Validate card name if provided (allow empty for placeholder cards)
    if (cardName.trim() && tarotCards.length > 0) {
      const isValidCard = tarotCards.some(card => card.name === cardName.trim());
      if (!isValidCard) {
        alert('Please select a valid card name from the list.');
        return;
      }
    }
    
    onSave({
      card_name: cardName.trim(),
      interpretation: cardInterpretation.trim(),
      position_label: positionLabel
    });
    
    // Reset form
    cardName = '';
    cardInterpretation = '';
  }
  
  function handleCancel() {
    cardName = '';
    cardInterpretation = '';
    onCancel();
  }
  
  function handleRemove() {
    // Clear card name and interpretation but keep the position
    onSave({
      card_name: '',
      interpretation: '',
      position_label: positionLabel
    });
  }
  
  // Filter available cards (exclude already used cards)
  $: availableCards = tarotCards.filter(card => {
    // Don't filter out the current card being edited
    if (existingCard && card.name === existingCard.card_name) {
      return true;
    }
    // Filter out used cards
    return !usedCards.includes(card.name);
  });
  
  // Update form when existingCard changes
  $: if (existingCard) {
    cardName = existingCard.card_name || '';
    cardInterpretation = existingCard.interpretation || '';
  } else {
    cardName = '';
    cardInterpretation = '';
  }
  
  // Focus on card name input when modal opens
  $: if (isOpen && modalElement) {
    setTimeout(() => {
      const input = modalElement.querySelector('#cardName') as HTMLInputElement;
      input?.focus();
    }, 50);
  }
</script>

{#if isOpen}
  <div class="modal" bind:this={modalElement}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>{existingCard ? 'Edit Card' : 'Add Card'}</h2>
        <button class="btn-close" on:click={handleCancel}>&times;</button>
      </div>
      
      <div class="modal-body">
        <form on:submit={handleSubmit}>
          <div class="form-group">
            <label for="cardPositionName">Position</label>
            <input 
              type="text" 
              id="cardPositionName" 
              bind:value={positionLabel}
            />
          </div>
          
          <div class="form-group">
            <label for="cardName">Card Name</label>
            <input 
              type="text" 
              id="cardName" 
              list="cardList"
              bind:value={cardName}
              placeholder="Start typing card name..."
            />
            <datalist id="cardList">
              {#each availableCards as card}
                <option value={card.name}>{card.name}</option>
              {/each}
            </datalist>
          </div>
          
          <div class="form-group">
            <label for="cardInterpretation">Interpretation</label>
            <textarea 
              id="cardInterpretation" 
              bind:value={cardInterpretation}
              rows="4"
              placeholder="Your interpretation of this card..."
            ></textarea>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn btn-primary">Save Card</button>
            {#if existingCard}
              <button type="button" class="btn btn-danger" on:click={handleRemove}>
                Remove Card
              </button>
            {/if}
            <button type="button" class="btn btn-secondary" on:click={handleCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
