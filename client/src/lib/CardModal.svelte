<script lang="ts">
  import { onMount } from 'svelte';
  
  export let isOpen = false;
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
  let showDropdown = false;
  let searchInput = '';
  
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
    searchInput = '';
    cardInterpretation = '';
    showDropdown = false;
  }
  
  function handleCancel() {
    cardName = '';
    searchInput = '';
    cardInterpretation = '';
    showDropdown = false;
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
  
  // Filter cards based on search input
  $: filteredCards = availableCards.filter(card => 
    card.name.toLowerCase().includes(searchInput.toLowerCase())
  ).slice(0, 50); // Limit to 50 results for performance
  
  // Update form when existingCard changes
  $: if (existingCard) {
    cardName = existingCard.card_name || '';
    searchInput = existingCard.card_name || '';
    cardInterpretation = existingCard.interpretation || '';
  } else {
    cardName = '';
    searchInput = '';
    cardInterpretation = '';
  }
  
  function handleSearchInput() {
    showDropdown = searchInput.length > 0;
    cardName = searchInput; // Update cardName as user types
  }
  
  function selectCard(card: TarotCard) {
    cardName = card.name;
    searchInput = card.name;
    showDropdown = false;
  }
  
  function handleSearchFocus() {
    if (searchInput.length > 0) {
      showDropdown = true;
    }
  }
  
  function handleSearchBlur() {
    // Delay hiding dropdown to allow click events to register
    setTimeout(() => {
      showDropdown = false;
    }, 200);
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
            <div class="search-container">
              <input 
                type="text" 
                id="cardName" 
                bind:value={searchInput}
                on:input={handleSearchInput}
                on:focus={handleSearchFocus}
                on:blur={handleSearchBlur}
                placeholder="Start typing card name..."
                readonly={readonly}
                autocomplete="off"
              />
              {#if showDropdown && filteredCards.length > 0 && !readonly}
                <div class="dropdown-list">
                  {#each filteredCards as card}
                    <button 
                      type="button"
                      class="dropdown-item"
                      on:click={() => selectCard(card)}
                    >
                      {card.name}
                    </button>
                  {/each}
                </div>
              {/if}
              {#if showDropdown && filteredCards.length === 0 && searchInput.length > 0 && !readonly}
                <div class="dropdown-list">
                  <div class="dropdown-item-empty">No matching cards found</div>
                </div>
              {/if}
            </div>
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
