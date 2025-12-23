<script lang="ts">
  import { onMount } from 'svelte';
  
  export let spreadTemplate: string = '';
  export let spreadCards: Record<number, any> = {};
  export let onCardsUpdate: (cards: Record<number, any>) => void;
  
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
    // Only handle canvas clicks for custom spreads or when no template selected
    if (currentTemplate && currentTemplate.id !== 'custom') {
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
    
    // Find next available index
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
    // Open card modal
    // TODO: We'll implement the modal in Phase 7
    console.log('Would open card modal for position', index);
  }
  
  function deleteCard(index: number) {
    const newCards = { ...spreadCards };
    delete newCards[index];
    onCardsUpdate(newCards);
  }
  
  function handleDeleteKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      deleteCard(index);
    }
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
</script>

<div 
  class="spread-canvas {currentTemplate?.id === 'custom' || !currentTemplate ? 'custom-spread' : ''}"
  bind:this={canvasElement}
  on:click={handleCanvasClick}
  on:keydown={handleCanvasKeydown}
  role="button"
  tabindex="0"
>
  {#if !currentTemplate}
    <!-- No template selected - empty canvas waiting for clicks -->
    {#each Object.entries(spreadCards) as [indexStr, cardData]}
      {@const index = parseInt(indexStr)}
      <button
        type="button"
        class="card-position custom-card {cardData.card_name ? 'filled' : ''}"
        style="left: {cardData.position_x}px; top: {cardData.position_y}px; {cardData.rotation ? `transform: rotate(${cardData.rotation}deg)` : ''}"
        on:click|stopPropagation={() => handleCardClick(index)}
        data-position-index={index}
      >
        <div 
          class="delete-card-btn" 
          title="Delete card" 
          on:click|stopPropagation={() => deleteCard(index)}
          on:keydown={(e) => handleDeleteKeydown(e, index)}
          role="button"
          tabindex="0"
        >×</div>
        <div class="position-number">{index + 1}</div>
        <div class="position-label">{cardData.position_label || `Card ${index + 1}`}</div>
        {#if cardData.card_name}
          <div class="card-name">{cardData.card_name}</div>
        {:else}
          <div class="empty-card">+</div>
        {/if}
        <div class="rotation-handle" title="Drag to rotate">↻</div>
      </button>
    {/each}
  {:else if currentTemplate.id === 'custom'}
    <!-- Custom template - click-to-add cards -->
    {#each Object.entries(spreadCards) as [indexStr, cardData]}
      {@const index = parseInt(indexStr)}
      <button
        type="button"
        class="card-position custom-card {cardData.card_name ? 'filled' : ''}"
        style="left: {cardData.position_x}px; top: {cardData.position_y}px; {cardData.rotation ? `transform: rotate(${cardData.rotation}deg)` : ''}"
        on:click|stopPropagation={() => handleCardClick(index)}
        data-position-index={index}
      >
        <div 
          class="delete-card-btn" 
          title="Delete card" 
          on:click|stopPropagation={() => deleteCard(index)}
          on:keydown={(e) => handleDeleteKeydown(e, index)}
          role="button"
          tabindex="0"
        >×</div>
        <div class="position-number">{index + 1}</div>
        <div class="position-label">{cardData.position_label || `Card ${index + 1}`}</div>
        {#if cardData.card_name}
          <div class="card-name">{cardData.card_name}</div>
        {:else}
          <div class="empty-card">+</div>
        {/if}
        <div class="rotation-handle" title="Drag to rotate">↻</div>
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
        style="left: {xPos}px; top: {yPos}px; {rotation ? `transform: rotate(${rotation}deg)` : ''}"
        on:click|stopPropagation={() => handleCardClick(index)}
        data-position-index={index}
        title={position.label}
        aria-label="{position.label} - {cardData?.card_name || 'Add card'}"
      >
        {#if cardData?.card_name}
          <div 
            class="delete-card-btn" 
            title="Delete card" 
            on:click|stopPropagation={() => deleteCard(index)}
            on:keydown={(e) => handleDeleteKeydown(e, index)}
            role="button"
            tabindex="0"
          >×</div>
          <div class="position-number">{position.order}</div>
          <div class="position-label">{position.label}</div>
          <div class="card-name">{cardData.card_name}</div>
          <div class="rotation-handle" title="Drag to rotate">↻</div>
        {:else}
          <div class="position-number">{position.order}</div>
          <div class="position-label">{position.label}</div>
          <div class="empty-card">+</div>
        {/if}
      </button>
    {/each}
  {/if}
</div>
