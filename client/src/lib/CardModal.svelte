<script lang="ts">
  import { onMount } from 'svelte';
  
  export let isOpen = false;
  export let cardIndex: number | null = null;
  export let positionLabel = '';
  export let existingCard: any = null;
  export let usedCards: string[] = [];
  export let readonly: boolean = false;
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
  
  // Focus on card name input when modal opens and trap focus
  $: if (isOpen && modalElement) {
    setTimeout(() => {
      const input = modalElement.querySelector('#cardName') as HTMLInputElement;
      input?.focus();
    }, 50);
  }
  
  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleCancel();
    }
    
    // Focus trap
    if (event.key === 'Tab' && modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }
</script>

{#if isOpen}
  <div class="modal" bind:this={modalElement} on:keydown={handleModalKeydown} role="dialog" aria-modal="true" aria-labelledby="card-modal-title" tabindex="-1">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="card-modal-title">{readonly ? 'View Card' : existingCard ? 'Edit Card' : 'Add Card'}</h2>
        <button class="btn-close" on:click={handleCancel} aria-label="Close">&times;</button>
      </div>
      
      <div class="modal-body">
        <form on:submit={handleSubmit}>
          <div class="form-group">
            <label for="cardPositionName">Position</label>
            <input 
              type="text" 
              id="cardPositionName" 
              bind:value={positionLabel}
              readonly={readonly}
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
              readonly={readonly}
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
              readonly={readonly}
            ></textarea>
          </div>
          
          <div class="modal-actions">
            {#if !readonly}
              <button type="submit" class="btn btn-primary">Save Card</button>
              {#if existingCard}
                <button type="button" class="btn btn-danger" on:click={handleRemove}>
                  Clear Card
                </button>
              {/if}
              <button type="button" class="btn btn-secondary" on:click={handleCancel}>
                Cancel
              </button>
            {:else}
              <button type="button" class="btn btn-secondary" on:click={handleCancel}>
                Close
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}
