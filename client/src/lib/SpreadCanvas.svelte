<script lang="ts">
  import interact from 'interactjs';
  import { onMount } from 'svelte';
  import CardModal from './CardModal.svelte';
  
  export let spreadTemplate: string = '';
  export let spreadCards: Record<number, any> = {};
  export let onCardsUpdate: (cards: Record<number, any>) => void;
  export let readonly: boolean = false;
  
  type SpreadTemplate = {
    id: string;
    name: string;
    positions: Array<{
      order: number;
      label: string;
      defaultX: number;
      defaultY: number;
      rotation?: number;
    }>;
  };
  
  let spreadTemplates: SpreadTemplate[] = [];
  let currentTemplate: SpreadTemplate | null = null;
  let canvasElement: HTMLDivElement;
  let justDragged: Record<number, boolean> = {};
  let preventCanvasClick = false;
  
  // Modal state
  let isModalOpen = false;
  let modalCardIndex: number | null = null;
  let modalPositionLabel = '';
  let modalExistingCard: any = null;
  
  // Get list of used card names (excluding current card being edited)
  $: usedCardNames = Object.entries(spreadCards)
    .filter(([indexStr]) => parseInt(indexStr) !== modalCardIndex)
    .map(([_, card]) => card.card_name)
    .filter(name => name && name.trim());
  
  onMount(async () => {
    await loadSpreadTemplates();
  });
  
  async function loadSpreadTemplates() {
    try {
      const response = await fetch('/api/spreads');
      spreadTemplates = await response.json();
      updateCurrentTemplate();
    } catch (error) {
      console.error('Error loading spread templates:', error);
    }
  }
  
  function updateCurrentTemplate() {
    if (spreadTemplate) {
      currentTemplate = spreadTemplates.find(t => t.id === spreadTemplate) || null;
    } else {
      currentTemplate = null;
    }
  }
  
  function handleCanvasClick(event: MouseEvent) {
    // Don't handle clicks in readonly mode
    if (readonly) {
      return;
    }
    
    // Only handle canvas clicks for custom spreads or when no template selected
    if (currentTemplate && currentTemplate.id !== 'custom') {
      return;
    }
    
    // Don't add card if we just finished rotating
    if (preventCanvasClick) {
      return;
    }
    
    // Don't add card if clicking on an existing card
    if ((event.target as HTMLElement).closest('.card-position')) {
      return;
    }
    
    // Auto-select Custom template on first click if no template selected
    if (!spreadTemplate) {
      const customTemplate = spreadTemplates.find(t => t.id === 'custom');
      if (customTemplate) {
        spreadTemplate = 'custom';
        updateCurrentTemplate();
        // Notify parent component
        const selectEvent = new CustomEvent('templateAutoSelected', { detail: 'custom' });
        canvasElement.dispatchEvent(selectEvent);
      }
    }
    
    const rect = canvasElement.getBoundingClientRect();
    const x = event.clientX - rect.left - 50; // Center the card (100px width / 2)
    const y = event.clientY - rect.top - 70; // Center the card (140px height / 2)
    
    // Find next available index (just use the count since we renumber on delete)
    const nextIndex = Object.keys(spreadCards).length;
    
    // Add empty card at this position
    const newCards = { ...spreadCards };
    newCards[nextIndex] = {
      position_x: x,
      position_y: y,
      position_label: `Card ${nextIndex + 1}`,
      card_name: '',
      rotation: 0
    };
    
    onCardsUpdate(newCards);
  }
  
  function handleCardClick(index: number) {
    // In readonly mode, always open modal to view
    if (readonly) {
      openCardModal(index);
      return;
    }
    
    // Don't open modal if card was just dragged
    if (justDragged[index]) {
      return;
    }
    
    // Open card modal
    openCardModal(index);
  }
  
  function openCardModal(index: number) {
    const existingCard = spreadCards[index];
    
    modalCardIndex = index;
    modalExistingCard = existingCard;
    
    // Set position label
    if (currentTemplate && currentTemplate.id !== 'custom' && currentTemplate.positions[index]) {
      modalPositionLabel = existingCard?.position_label || currentTemplate.positions[index].label;
    } else {
      modalPositionLabel = existingCard?.position_label || `Card ${index + 1}`;
    }
    
    isModalOpen = true;
  }
  
  function handleModalSave(cardData: any) {
    if (modalCardIndex === null) return;
    
    // Save or update card
    const newCards = { ...spreadCards };
    const existingCard = newCards[modalCardIndex];
    
    newCards[modalCardIndex] = {
      ...existingCard,
      card_name: cardData.card_name,
      interpretation: cardData.interpretation,
      position_label: cardData.position_label
    };
    
    onCardsUpdate(newCards);
    
    isModalOpen = false;
    modalCardIndex = null;
    modalExistingCard = null;
  }
  
  function handleModalCancel() {
    isModalOpen = false;
    modalCardIndex = null;
    modalExistingCard = null;
  }
  
  function convertToCustomSpread() {
    // Find and set Custom template
    const customTemplate = spreadTemplates.find(t => t.id === 'custom');
    if (customTemplate) {
      spreadTemplate = 'custom';
      currentTemplate = customTemplate;
      
      // Notify parent component
      const selectEvent = new CustomEvent('templateAutoSelected', { detail: 'custom' });
      canvasElement.dispatchEvent(selectEvent);
    }
  }
  
  function deleteCard(index: number) {
    const card = spreadCards[index];
    const isCustomSpread = !currentTemplate || currentTemplate.id === 'custom';
    
    // If card has a name, just clear it
    if (card?.card_name && card.card_name.trim()) {
      const newCards = { ...spreadCards };
      newCards[index] = {
        ...newCards[index],
        card_name: '',
        interpretation: ''
      };
      onCardsUpdate(newCards);
    } else if (isCustomSpread) {
      // Card is already empty and it's a custom spread - delete the position entirely
      const newCards: Record<number, any> = {};
      
      // Rebuild the cards object, skipping the deleted card and renumbering
      let newIndex = 0;
      Object.keys(spreadCards).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
        const oldIndex = parseInt(key);
        if (oldIndex !== index) {
          // Keep this card but renumber it
          newCards[newIndex] = {
            ...spreadCards[oldIndex],
            position_label: `Card ${newIndex + 1}`
          };
          newIndex++;
        }
      });
      
      onCardsUpdate(newCards);
    }
    // For predefined spreads with empty cards, do nothing (X won't be shown anyway)
  }
  
  function handleDeleteKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      deleteCard(index);
    }
  }
  
  // Setup interact.js for drag and rotate
  function setupInteractions(element: HTMLButtonElement, index: number) {
    const currentRotation = spreadCards[index]?.rotation || 0;
    let hasMoved = false;
    let confirmedConversion = false;
    
    // Setup draggable
    const interactable = interact(element)
      .draggable({
        listeners: {
          start(event) {
            hasMoved = false;
            confirmedConversion = false;
            event.target.style.cursor = 'grabbing';
          },
          move(event) {
            // Check if this is a predefined spread and needs confirmation
            if (!hasMoved && !confirmedConversion && currentTemplate && currentTemplate.id !== 'custom') {
              if (!confirm('Moving cards will convert this to a custom spread. Continue?')) {
                // Cancel the interaction
                interactable.draggable(false);
                event.target.style.cursor = 'grab';
                setTimeout(() => interactable.draggable(true), 0);
                return;
              }
              convertToCustomSpread();
              confirmedConversion = true;
            }
            hasMoved = true;
            
            const target = event.target;
            const x = parseFloat(target.style.left) || spreadCards[index]?.position_x || 0;
            const y = parseFloat(target.style.top) || spreadCards[index]?.position_y || 0;
            
            // Update position
            target.style.left = `${x + event.dx}px`;
            target.style.top = `${y + event.dy}px`;
          },
          end(event) {
            event.target.style.cursor = 'grab';
            
            if (hasMoved) {
              // Update position in spreadCards
              const x = parseFloat(event.target.style.left);
              const y = parseFloat(event.target.style.top);
              
              const newCards = { ...spreadCards };
              newCards[index] = {
                ...newCards[index],
                position_x: x,
                position_y: y
              };
              onCardsUpdate(newCards);
              
              // Mark as just dragged to prevent modal opening
              justDragged[index] = true;
              setTimeout(() => {
                justDragged[index] = false;
              }, 200);
              
              // Prevent canvas click after dragging
              preventCanvasClick = true;
              setTimeout(() => {
                preventCanvasClick = false;
              }, 200);
            }
          }
        }
      })
      .styleCursor(false); // We manage cursor ourselves
    
    // Setup rotation gesture on the rotation handle
    const handle = element.querySelector('.rotation-handle') as HTMLElement;
    if (handle) {
      let startAngle = 0;
      let startRotation = 0;
      
      interact(handle)
        .on('down', (event) => {
          // Warn about conversion for predefined spreads
          if (currentTemplate && currentTemplate.id !== 'custom') {
            if (!confirm('Rotating cards will convert this to a custom spread. Continue?')) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            convertToCustomSpread();
          }
          
          // Prevent card click while rotating
          justDragged[index] = true;
          preventCanvasClick = true;
          
          // Store the initial rotation
          startRotation = spreadCards[index]?.rotation || 0;
          
          // Get card center
          const cardRect = element.getBoundingClientRect();
          const centerX = cardRect.left + cardRect.width / 2;
          const centerY = cardRect.top + cardRect.height / 2;
          
          // Calculate initial angle from center to mouse
          startAngle = Math.atan2(
            event.clientY - centerY,
            event.clientX - centerX
          ) * (180 / Math.PI);
        })
        .draggable({
          listeners: {
            move(event) {
              event.stopPropagation();
              
              // Get card center
              const cardRect = element.getBoundingClientRect();
              const centerX = cardRect.left + cardRect.width / 2;
              const centerY = cardRect.top + cardRect.height / 2;
              
              // Calculate current angle from center to mouse
              const currentAngle = Math.atan2(
                event.clientY - centerY,
                event.clientX - centerX
              ) * (180 / Math.PI);
              
              // Calculate the delta rotation
              const deltaAngle = currentAngle - startAngle;
              const degrees = Math.round(startRotation + deltaAngle);
              
              // Apply rotation
              element.style.transform = `rotate(${degrees}deg)`;
              
              // Store the current rotation temporarily
              element.dataset.tempRotation = degrees.toString();
            },
            end(event) {
              event.stopPropagation();
              
              const rotation = parseInt(element.dataset.tempRotation || '0');
              
              // Update rotation in spreadCards
              const newCards = { ...spreadCards };
              newCards[index] = {
                ...newCards[index],
                rotation
              };
              onCardsUpdate(newCards);
              
              // Keep justDragged and preventCanvasClick flags longer to prevent modal/card creation
              setTimeout(() => {
                justDragged[index] = false;
                preventCanvasClick = false;
              }, 200);
              
              delete element.dataset.tempRotation;
            }
          }
        })
        .styleCursor(false);
    }
    
    return interactable;
  }
  
  function handleCanvasKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Convert keyboard event to a click-like event at center of canvas
      const rect = canvasElement.getBoundingClientRect();
      const mouseEvent = new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
      });
      handleCanvasClick(mouseEvent);
    }
  }
  
  // Update template when prop changes
  $: if (spreadTemplate !== undefined) {
    updateCurrentTemplate();
  }
  
  // Svelte action for setting up interact.js on cards
  function interactCard(node: HTMLButtonElement, index: number) {
    let interactable: any = null;
    
    // Only allow dragging/rotating in custom spreads and when not readonly
    const isCustomSpread = !currentTemplate || currentTemplate.id === 'custom';
    if (!readonly && isCustomSpread) {
      interactable = setupInteractions(node, index);
    }
    
    return {
      destroy() {
        if (interactable) {
          interactable.unset();
        }
      }
    };
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div 
  class="spread-canvas {currentTemplate?.id === 'custom' || !currentTemplate ? 'custom-spread' : ''} {readonly ? 'readonly' : ''}"
  bind:this={canvasElement}
  on:click={handleCanvasClick}
  on:keydown={handleCanvasKeydown}
  role="region"
  aria-label="{readonly ? 'Tarot spread layout' : 'Interactive tarot spread canvas'}"
>
  {#if !currentTemplate}
    <!-- No template selected - empty canvas waiting for clicks -->
    {#each Object.entries(spreadCards) as [indexStr, cardData]}
      {@const index = parseInt(indexStr)}
      <button
        type="button"
        class="card-position custom-card {cardData.card_name ? 'filled' : ''}"
        style="left: {cardData.position_x}px; top: {cardData.position_y}px; {cardData.rotation ? `transform: rotate(${cardData.rotation}deg)` : ''}; {readonly ? 'cursor: default;' : 'cursor: grab;'}"
        on:click|stopPropagation={() => !readonly && handleCardClick(index)}
        use:interactCard={index}
        data-position-index={index}
        aria-label="{cardData.position_label || `Position ${index + 1}`} - {cardData.card_name || 'Add card'}"
      >
        {#if !readonly}
          <div 
            class="delete-card-btn" 
            title="{cardData.card_name ? 'Clear card' : 'Delete position'}" 
            on:click|stopPropagation={() => deleteCard(index)}
            on:keydown={(e) => handleDeleteKeydown(e, index)}
            role="button"
            tabindex="0"
            aria-label="{cardData.card_name ? 'Clear card' : 'Delete position'}"
          >×</div>
        {/if}
        <div class="position-number">{index + 1}</div>
        <div class="position-label">{cardData.position_label || `Card ${index + 1}`}</div>
        {#if cardData.card_name}
          <div class="card-name">{cardData.card_name}</div>
        {:else}
          <div class="empty-card">+</div>
        {/if}
        {#if !readonly}
          <div class="rotation-handle" title="Drag to rotate">↻</div>
        {/if}
      </button>
    {/each}
  {:else if currentTemplate.id === 'custom'}
    <!-- Custom template - click-to-add cards -->
    {#each Object.entries(spreadCards) as [indexStr, cardData]}
      {@const index = parseInt(indexStr)}
      <button
        type="button"
        class="card-position custom-card {cardData.card_name ? 'filled' : ''}"
        style="left: {cardData.position_x}px; top: {cardData.position_y}px; {cardData.rotation ? `transform: rotate(${cardData.rotation}deg)` : ''}; {readonly ? 'cursor: default;' : 'cursor: grab;'}"
        on:click|stopPropagation={() => handleCardClick(index)}
        use:interactCard={index}
        data-position-index={index}
        aria-label="{cardData.position_label || `Position ${index + 1}`} - {cardData.card_name || 'Add card'}"
      >
        {#if !readonly}
          <div 
            class="delete-card-btn" 
            title="{cardData.card_name ? 'Clear card' : 'Delete position'}" 
            on:click|stopPropagation={() => deleteCard(index)}
            on:keydown={(e) => handleDeleteKeydown(e, index)}
            role="button"
            tabindex="0"
            aria-label="{cardData.card_name ? 'Clear card' : 'Delete position'}"
          >×</div>
        {/if}
        <div class="position-number">{index + 1}</div>
        <div class="position-label">{cardData.position_label || `Card ${index + 1}`}</div>
        {#if cardData.card_name}
          <div class="card-name">{cardData.card_name}</div>
        {:else}
          <div class="empty-card">+</div>
        {/if}
        {#if !readonly}
          <div class="rotation-handle" title="Drag to rotate">↻</div>
        {/if}
      </button>
    {/each}
  {:else}
    <!-- Pre-defined spread template -->
    {#each currentTemplate.positions as position, index}
      {@const cardData = spreadCards[index]}
      {@const xPos = cardData?.position_x ?? position.defaultX}
      {@const yPos = cardData?.position_y ?? position.defaultY}
      {@const rotation = cardData?.rotation ?? position.rotation ?? 0}
      <button
        type="button"
        class="card-position {cardData?.card_name ? 'filled' : ''}"
        style="left: {xPos}px; top: {yPos}px; {rotation ? `transform: rotate(${rotation}deg)` : ''}; cursor: pointer;"
        on:click|stopPropagation={() => handleCardClick(index)}
        use:interactCard={index}
        data-position-index={index}
        title={position.label}
        aria-label="{position.label} - {cardData?.card_name || 'Add card'}"
      >
        {#if cardData?.card_name}
          {#if !readonly && cardData.card_name.trim()}
            <div 
              class="delete-card-btn" 
              title="Clear card" 
              on:click|stopPropagation={() => deleteCard(index)}
              on:keydown={(e) => handleDeleteKeydown(e, index)}
              role="button"
              tabindex="0"
              aria-label="Clear card"
            >×</div>
          {/if}
          <div class="position-number">{position.order}</div>
          <div class="position-label">{position.label}</div>
          <div class="card-name">{cardData.card_name}</div>
        {:else}
          <div class="position-number">{position.order}</div>
          <div class="position-label">{position.label}</div>
          <div class="empty-card">+</div>
        {/if}
      </button>
    {/each}
  {/if}
</div>

<CardModal 
  bind:isOpen={isModalOpen}
  cardIndex={modalCardIndex}
  positionLabel={modalPositionLabel}
  existingCard={modalExistingCard}
  usedCards={usedCardNames}
  {readonly}
  onSave={handleModalSave}
  onCancel={handleModalCancel}
/>
