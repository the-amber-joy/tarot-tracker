<script lang="ts">
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
    
    // Open card modal for this position
    // TODO: We'll implement the modal in Phase 7
    console.log('Would open card modal for position', nextIndex);
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
    
    if (cardData === null) {
      // Remove card
      deleteCard(modalCardIndex);
    } else {
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
    }
    
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
  
  function handleDeleteKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      deleteCard(index);
    }
  }
  
  // Drag functionality
  function makeDraggable(element: HTMLButtonElement, index: number) {
    let isDragging = false;
    let hasMoved = false;
    let currentX: number;
    let currentY: number;
    let initialX: number;
    let initialY: number;
    let startX: number;
    let startY: number;
    
    const dragStart = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      initialX = e.clientX - element.offsetLeft;
      initialY = e.clientY - element.offsetTop;
      hasMoved = false;
      
      isDragging = true;
      element.style.cursor = 'grabbing';
      
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);
    };
    
    const drag = (e: MouseEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      // Check if moved more than 5px threshold
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      if (deltaX > 5 || deltaY > 5) {
        // Warn about conversion for predefined spreads
        if (!hasMoved && currentTemplate && currentTemplate.id !== 'custom') {
          if (!confirm('Moving cards will convert this to a custom spread. Continue?')) {
            // Cancel the drag
            isDragging = false;
            element.style.cursor = 'grab';
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', dragEnd);
            return;
          }
          // Convert to custom spread
          convertToCustomSpread();
        }
        hasMoved = true;
      }
      
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      
      element.style.left = `${currentX}px`;
      element.style.top = `${currentY}px`;
    };
    
    const dragEnd = (e: MouseEvent) => {
      if (!isDragging) return;
      
      isDragging = false;
      element.style.cursor = 'grab';
      
      if (hasMoved) {
        // Update position in spreadCards
        const newCards = { ...spreadCards };
        newCards[index] = {
          ...newCards[index],
          position_x: currentX,
          position_y: currentY
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
      
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', dragEnd);
    };
    
    element.addEventListener('mousedown', dragStart);
  }
  
  // Rotation functionality
  function makeRotatable(element: HTMLButtonElement, index: number) {
    const handle = element.querySelector('.rotation-handle') as HTMLElement;
    if (!handle) return;
    
    let isRotating = false;
    let currentRotation = spreadCards[index]?.rotation || 0;
    
    const rotateStart = (e: MouseEvent) => {
      // Warn about conversion for predefined spreads
      if (currentTemplate && currentTemplate.id !== 'custom') {
        if (!confirm('Rotating cards will convert this to a custom spread. Continue?')) {
          return;
        }
        // Convert to custom spread
        convertToCustomSpread();
      }
      
      e.preventDefault();
      e.stopPropagation();
      isRotating = true;
      preventCanvasClick = true;
      
      // Prevent card click while rotating
      justDragged[index] = true;
      
      document.addEventListener('mousemove', rotate);
      document.addEventListener('mouseup', rotateEnd);
    };
    
    const rotate = (e: MouseEvent) => {
      if (!isRotating) return;
      
      e.preventDefault();
      
      // Get card center
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate angle from center to mouse
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const degrees = angle * (180 / Math.PI) + 90; // +90 to start from top
      
      currentRotation = Math.round(degrees);
      
      // Apply rotation
      element.style.transform = `rotate(${currentRotation}deg)`;
    };
    
    const rotateEnd = (e: MouseEvent) => {
      if (!isRotating) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      isRotating = false;
      
      // Update rotation in spreadCards
      const newCards = { ...spreadCards };
      newCards[index] = {
        ...newCards[index],
        rotation: currentRotation
      };
      onCardsUpdate(newCards);
      
      // Keep justDragged and preventCanvasClick flags longer to prevent modal/card creation
      setTimeout(() => {
        justDragged[index] = false;
        preventCanvasClick = false;
      }, 200);
      
      document.removeEventListener('mousemove', rotate);
      document.removeEventListener('mouseup', rotateEnd);
    };
    
    handle.addEventListener('mousedown', rotateStart);
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
  
  // Svelte action for making cards draggable
  function draggable(node: HTMLButtonElement, index: number) {
    // Only allow dragging in custom spreads and when not readonly
    const isCustomSpread = !currentTemplate || currentTemplate.id === 'custom';
    if (!readonly && isCustomSpread) {
      makeDraggable(node, index);
    }
    return {
      destroy() {
        // Cleanup handled by removeEventListener in dragEnd
      }
    };
  }
  
  // Svelte action for making cards rotatable
  function rotatable(node: HTMLButtonElement, index: number) {
    // Only allow rotating in custom spreads and when not readonly
    const isCustomSpread = !currentTemplate || currentTemplate.id === 'custom';
    if (!readonly && isCustomSpread) {
      makeRotatable(node, index);
    }
    return {
      destroy() {
        // Cleanup handled by removeEventListener in rotateEnd
      }
    };
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="spread-canvas {currentTemplate?.id === 'custom' || !currentTemplate ? 'custom-spread' : ''} {readonly ? 'readonly' : ''}"
  bind:this={canvasElement}
  on:click={handleCanvasClick}
  on:keydown={handleCanvasKeydown}
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
        use:draggable={index}
        use:rotatable={index}
        data-position-index={index}
      >
        {#if !readonly}
          <div 
            class="delete-card-btn" 
            title="Delete card" 
            on:click|stopPropagation={() => deleteCard(index)}
            on:keydown={(e) => handleDeleteKeydown(e, index)}
            role="button"
            tabindex="0"
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
        use:draggable={index}
        use:rotatable={index}
        data-position-index={index}
      >
        {#if !readonly}
          <div 
            class="delete-card-btn" 
            title="Delete card" 
            on:click|stopPropagation={() => deleteCard(index)}
            on:keydown={(e) => handleDeleteKeydown(e, index)}
            role="button"
            tabindex="0"
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
        use:draggable={index}
        use:rotatable={index}
        data-position-index={index}
        title={position.label}
        aria-label="{position.label} - {cardData?.card_name || 'Add card'}"
      >
        {#if cardData?.card_name}
          {#if !readonly}
            <div 
              class="delete-card-btn" 
              title="Delete card" 
              on:click|stopPropagation={() => deleteCard(index)}
              on:keydown={(e) => handleDeleteKeydown(e, index)}
              role="button"
              tabindex="0"
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
