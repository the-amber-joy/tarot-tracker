<script lang="ts">
  import interact from "interactjs";
  import { onMount } from "svelte";
  import CardModal from "../modals/CardModal.svelte";

  export let spreadTemplate: string = "";
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
  let mobileActiveCard: number | null = null; // Track which card shows controls on mobile

  // Canvas scaling for responsiveness
  const BASE_CANVAS_SIZE = 750; // Base size for card positions
  let canvasScale = 1;
  let displayScale = 1; // Scale for fitting predefined spreads in viewport
  let translateX = 0; // X offset to center cards
  let translateY = 0; // Y offset to center cards
  let userZoom = 1; // User-controlled zoom multiplier
  let userPanX = 0; // User-controlled pan offset X
  let userPanY = 0; // User-controlled pan offset Y

  // Drag state for panning
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartPanX = 0;
  let dragStartPanY = 0;

  // Pinch zoom state
  let isPinching = false;
  let initialPinchDistance = 0;
  let initialPinchZoom = 1;

  // Modal state
  let isModalOpen = false;
  let modalCardIndex: number | null = null;
  let modalPositionLabel = "";
  let modalExistingCard: any = null;

  // Get list of used card names (excluding current card being edited)
  $: usedCardNames = Object.entries(spreadCards)
    .filter(([indexStr]) => parseInt(indexStr) !== modalCardIndex)
    .map(([_, card]) => card.card_name)
    .filter((name) => name && name.trim());

  onMount(() => {
    loadSpreadTemplates();
    updateCanvasScale();

    // Update scale on window resize
    window.addEventListener("resize", updateCanvasScale);

    // Add drag event listeners
    canvasElement.addEventListener("mousedown", handleDragStart);
    canvasElement.addEventListener("touchstart", handleDragStart, {
      passive: false,
    });
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("resize", updateCanvasScale);
      canvasElement.removeEventListener("mousedown", handleDragStart);
      canvasElement.removeEventListener("touchstart", handleDragStart);
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };
  });

  function updateCanvasScale() {
    if (canvasElement) {
      const currentWidth = canvasElement.clientWidth;
      const currentHeight = canvasElement.clientHeight;
      canvasScale = currentWidth / BASE_CANVAS_SIZE;

      // For predefined spreads, calculate scale and position based on actual spread bounds
      if (currentTemplate && currentTemplate.id !== "custom") {
        // Find bounding box of all cards
        const cardWidth = 100;
        const cardHeight = 140;
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity;

        currentTemplate.positions.forEach((pos) => {
          minX = Math.min(minX, pos.defaultX);
          maxX = Math.max(maxX, pos.defaultX + cardWidth);
          minY = Math.min(minY, pos.defaultY);
          maxY = Math.max(maxY, pos.defaultY + cardHeight);
        });

        const spreadWidth = maxX - minX;
        const spreadHeight = maxY - minY;

        // Calculate scale to fit with margin (more zoom on larger screens)
        const scaleX = currentWidth / spreadWidth;
        const scaleY = currentHeight / spreadHeight;
        const marginMultiplier = currentWidth < 600 ? 0.95 : 1.5; // Less margin on desktop
        displayScale = Math.min(scaleX, scaleY, 1) * marginMultiplier;

        // Calculate where the scaled bounding box should be positioned to center it
        const totalScale = displayScale * userZoom;
        const scaledSpreadWidth = spreadWidth * totalScale;
        const scaledSpreadHeight = spreadHeight * totalScale;

        // Offset to center the spread in the viewport
        const centerOffsetX = (currentWidth - scaledSpreadWidth) / 2;
        const centerOffsetY = (currentHeight - scaledSpreadHeight) / 2;

        // Calculate final translation: move to center, accounting for where cards start (minX, minY)
        translateX = centerOffsetX - minX * totalScale;
        translateY = centerOffsetY - minY * totalScale;
      } else {
        displayScale = 1;
        translateX = 0;
        translateY = 0;
      }
    }
  }

  function zoomIn() {
    userZoom = Math.min(3, userZoom + 0.2);
    updateCanvasScale();
  }

  function zoomOut() {
    userZoom = Math.max(0.3, userZoom - 0.2);
    updateCanvasScale();
  }

  function centerView() {
    userZoom = 1;
    userPanX = 0;
    userPanY = 0;
    updateCanvasScale();
  }

  function getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleDragStart(e: MouseEvent | TouchEvent) {
    // Don't start drag if clicking on a card or control button
    const target = e.target as HTMLElement;
    if (target.closest(".card-position") || target.closest(".zoom-controls")) {
      return;
    }

    if (e instanceof TouchEvent) {
      if (e.touches.length === 2) {
        // Two fingers - start pinch zoom
        e.preventDefault(); // Prevent page zoom
        isPinching = true;
        isDragging = false;
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialPinchZoom = userZoom;
        return;
      } else if (e.touches.length === 1) {
        // One finger - start drag
        isDragging = true;
        isPinching = false;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        dragStartPanX = userPanX;
        dragStartPanY = userPanY;
      }
    } else if (e instanceof MouseEvent) {
      // Mouse - start drag
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartPanX = userPanX;
      dragStartPanY = userPanY;
      canvasElement.style.cursor = "grabbing";
    }
  }

  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (e instanceof TouchEvent && e.touches.length === 2 && isPinching) {
      // Handle pinch zoom
      e.preventDefault(); // Prevent page zoom
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance;
      userZoom = Math.max(0.3, Math.min(3, initialPinchZoom * scale));
      updateCanvasScale();
      return;
    }

    if (!isDragging) return;

    let clientX: number, clientY: number;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e instanceof TouchEvent && e.touches.length === 1) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      return;
    }

    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;

    userPanX = dragStartPanX + dx;
    userPanY = dragStartPanY + dy;
  }

  function handleDragEnd() {
    if (isDragging) {
      isDragging = false;
      canvasElement.style.cursor = "";
    }
    if (isPinching) {
      isPinching = false;
      initialPinchDistance = 0;
    }
  }

  // Helper to scale positions from stored values
  function scalePosition(value: number): number {
    // For predefined spreads, use positions as-is (zoom handles the scaling)
    if (currentTemplate && currentTemplate.id !== "custom") {
      return value;
    }
    // For custom spreads, scale positions responsively
    return value * canvasScale;
  }

  async function loadSpreadTemplates() {
    try {
      const response = await fetch("/api/spreads");
      spreadTemplates = await response.json();
      updateCurrentTemplate();
    } catch (error) {
      console.error("Error loading spread templates:", error);
    }
  }

  function updateCurrentTemplate() {
    if (spreadTemplate) {
      currentTemplate =
        spreadTemplates.find((t) => t.id === spreadTemplate) || null;
      updateCanvasScale();
    } else {
      currentTemplate = null;
      displayScale = 1;
    }
  }

  function handleCanvasClick(event: MouseEvent) {
    // Clear mobile active card when clicking canvas
    mobileActiveCard = null;

    // Don't handle clicks in readonly mode
    if (readonly) {
      return;
    }

    // Only handle canvas clicks for custom spreads or when no template selected
    if (currentTemplate && currentTemplate.id !== "custom") {
      return;
    }

    // Don't add card if we just finished rotating
    if (preventCanvasClick) {
      return;
    }

    // Don't add card if clicking on an existing card
    if ((event.target as HTMLElement).closest(".card-position")) {
      return;
    }

    // Auto-select Custom template on first click if no template selected
    if (!spreadTemplate) {
      const customTemplate = spreadTemplates.find((t) => t.id === "custom");
      if (customTemplate) {
        spreadTemplate = "custom";
        updateCurrentTemplate();
        // Notify parent component
        const selectEvent = new CustomEvent("templateAutoSelected", {
          detail: "custom",
        });
        canvasElement.dispatchEvent(selectEvent);
      }
    }

    const rect = canvasElement.getBoundingClientRect();
    const x = (event.clientX - rect.left - 50) / canvasScale; // Center the card, store at base scale
    const y = (event.clientY - rect.top - 70) / canvasScale; // Center the card, store at base scale

    // Find next available index (just use the count since we renumber on delete)
    const nextIndex = Object.keys(spreadCards).length;

    // Add empty card at this position
    const newCards = { ...spreadCards };
    newCards[nextIndex] = {
      position_x: x,
      position_y: y,
      position_label: `Card ${nextIndex + 1}`,
      card_name: "",
      rotation: 0,
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

    // On mobile, first tap shows controls, doesn't open modal
    // Check if device is touch-enabled
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      if (mobileActiveCard === index) {
        // Already active, do nothing (user should tap + button)
        return;
      } else {
        // Deactivate any other card and activate this one
        mobileActiveCard = index;
        return;
      }
    } else {
      // Desktop: clear mobile active card in case it was somehow set
      mobileActiveCard = null;
    }

    // Desktop: shouldn't reach here, + button handles modal opening
  }

  function openCardModal(index: number) {
    const existingCard = spreadCards[index];

    modalCardIndex = index;
    modalExistingCard = existingCard;

    // Set position label
    if (
      currentTemplate &&
      currentTemplate.id !== "custom" &&
      currentTemplate.positions[index]
    ) {
      modalPositionLabel =
        existingCard?.position_label || currentTemplate.positions[index].label;
    } else {
      modalPositionLabel = existingCard?.position_label || `Card ${index + 1}`;
    }

    // Clear mobile active card when opening modal
    mobileActiveCard = null;

    isModalOpen = true;
  }

  function handleAddButtonClick(event: Event, index: number) {
    event.stopPropagation();
    openCardModal(index);
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
      position_label: cardData.position_label,
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

  function deleteCard(index: number) {
    const card = spreadCards[index];

    // If card has a name, just clear it
    if (card?.card_name && card.card_name.trim()) {
      const newCards = { ...spreadCards };
      newCards[index] = {
        ...newCards[index],
        card_name: "",
        interpretation: "",
      };
      onCardsUpdate(newCards);
    } else {
      // Card is already empty - delete the position entirely
      const newCards: Record<number, any> = {};

      // Rebuild the cards object, skipping the deleted card and renumbering
      let newIndex = 0;
      Object.keys(spreadCards)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((key) => {
          const oldIndex = parseInt(key);
          if (oldIndex !== index) {
            // Keep this card but renumber it
            newCards[newIndex] = {
              ...spreadCards[oldIndex],
              position_label: `Card ${newIndex + 1}`,
            };
            newIndex++;
          }
        });

      onCardsUpdate(newCards);
    }
  }

  function handleDeleteKeydown(event: KeyboardEvent, index: number) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      deleteCard(index);
    }
  }

  // Setup interact.js for drag and rotate
  function setupInteractions(element: HTMLButtonElement, index: number) {
    const currentRotation = spreadCards[index]?.rotation || 0;
    let hasMoved = false;

    // Setup draggable
    const interactable = interact(element)
      .draggable({
        inertia: false,
        autoScroll: false,
        listeners: {
          start(event) {
            hasMoved = false;
            event.target.style.cursor = "grabbing";
          },
          move(event) {
            hasMoved = true;

            const target = event.target;

            // Get current position (or start from stored card position)
            const currentX = parseFloat(target.getAttribute("data-x")) || 0;
            const currentY = parseFloat(target.getAttribute("data-y")) || 0;

            // Add the delta to the current position
            const newX = currentX + event.dx;
            const newY = currentY + event.dy;

            // Store the accumulated position
            target.setAttribute("data-x", newX.toString());
            target.setAttribute("data-y", newY.toString());

            // Calculate display position: base position + scaled accumulated delta
            const baseX = spreadCards[index]?.position_x || 0;
            const baseY = spreadCards[index]?.position_y || 0;
            const displayX = scalePosition(baseX) + newX;
            const displayY = scalePosition(baseY) + newY;

            // Update display position
            target.style.left = `${displayX}px`;
            target.style.top = `${displayY}px`;
          },
          end(event) {
            event.target.style.cursor = "grab";

            if (hasMoved) {
              const target = event.target;
              // Get the accumulated deltas
              const deltaX = parseFloat(target.getAttribute("data-x") || "0");
              const deltaY = parseFloat(target.getAttribute("data-y") || "0");

              // Calculate final position in base scale
              const baseX = spreadCards[index]?.position_x || 0;
              const baseY = spreadCards[index]?.position_y || 0;
              const finalX = baseX + deltaX / canvasScale;
              const finalY = baseY + deltaY / canvasScale;

              // Clean up data attributes
              target.removeAttribute("data-x");
              target.removeAttribute("data-y");

              const newCards = { ...spreadCards };
              newCards[index] = {
                ...newCards[index],
                position_x: finalX,
                position_y: finalY,
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
          },
        },
      })
      .styleCursor(false); // We manage cursor ourselves

    // Setup rotation gesture on the rotation handle
    const handle = element.querySelector(".rotation-handle") as HTMLElement;
    if (handle) {
      let startAngle = 0;
      let startRotation = 0;

      interact(handle)
        .on("down", (event) => {
          event.preventDefault();
          event.stopPropagation();

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
          startAngle =
            Math.atan2(event.clientY - centerY, event.clientX - centerX) *
            (180 / Math.PI);
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
              const currentAngle =
                Math.atan2(event.clientY - centerY, event.clientX - centerX) *
                (180 / Math.PI);

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

              const rotation = parseInt(element.dataset.tempRotation || "0");

              // Update rotation in spreadCards
              const newCards = { ...spreadCards };
              newCards[index] = {
                ...newCards[index],
                rotation,
              };
              onCardsUpdate(newCards);

              // Keep justDragged and preventCanvasClick flags longer to prevent modal/card creation
              setTimeout(() => {
                justDragged[index] = false;
                preventCanvasClick = false;
              }, 200);

              delete element.dataset.tempRotation;
            },
          },
        })
        .styleCursor(false);
    }

    return interactable;
  }

  function handleCanvasKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Convert keyboard event to a click-like event at center of canvas
      const rect = canvasElement.getBoundingClientRect();
      const mouseEvent = new MouseEvent("click", {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true,
      });
      handleCanvasClick(mouseEvent);
    }
  }

  // Update template when prop changes
  $: if (spreadTemplate !== undefined) {
    updateCurrentTemplate();
  }

  // Update scale when canvas element changes
  $: if (canvasElement) {
    updateCanvasScale();
  }

  // Svelte action for setting up interact.js on cards
  function interactCard(node: HTMLButtonElement, index: number) {
    let interactable: any = null;

    // Only allow dragging/rotating in custom spreads and when not readonly
    const isCustomSpread = !currentTemplate || currentTemplate.id === "custom";
    if (!readonly && isCustomSpread) {
      interactable = setupInteractions(node, index);
    }

    return {
      destroy() {
        if (interactable) {
          interactable.unset();
        }
      },
    };
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
  class="spread-canvas {currentTemplate?.id === 'custom' || !currentTemplate
    ? 'custom-spread'
    : ''} {readonly ? 'readonly' : ''}"
  bind:this={canvasElement}
  role="region"
  aria-label={readonly
    ? "Tarot spread layout"
    : "Interactive tarot spread canvas"}
>
  <div
    class="canvas-inner"
    on:click={handleCanvasClick}
    on:keydown={handleCanvasKeydown}
    style={currentTemplate
      ? `transform: translate(${translateX + userPanX}px, ${translateY + userPanY}px) scale(${displayScale * userZoom})`
      : ""}
  >
    {#if !currentTemplate}
      <!-- No template selected - empty canvas waiting for clicks -->
      {#each Object.entries(spreadCards) as [indexStr, cardData]}
        {@const index = parseInt(indexStr)}
        <button
          type="button"
          class="card-position custom-card {cardData.card_name
            ? 'filled'
            : ''} {mobileActiveCard === index ? 'mobile-active' : ''}"
          style="left: {scalePosition(
            cardData.position_x,
          )}px; top: {scalePosition(cardData.position_y)}px; {cardData.rotation
            ? `transform: rotate(${cardData.rotation}deg)`
            : ''}; {readonly ? 'cursor: default;' : 'cursor: grab;'}"
          on:click|stopPropagation={() => !readonly && handleCardClick(index)}
          use:interactCard={index}
          data-position-index={index}
          aria-label="{cardData.position_label ||
            `Position ${index + 1}`} - {cardData.card_name || 'Add card'}"
        >
          {#if !readonly}
            <div
              class="delete-card-btn {cardData.card_name ? '' : 'delete-icon'}"
              title={cardData.card_name ? "Clear card" : "Delete position"}
              on:click|stopPropagation={() => deleteCard(index)}
              on:keydown={(e) => handleDeleteKeydown(e, index)}
              role="button"
              tabindex="0"
              aria-label={cardData.card_name ? "Clear card" : "Delete position"}
            >
              <span class="material-symbols-outlined">
                {cardData.card_name ? "close_small" : "delete_forever"}
              </span>
            </div>
            <div class="drag-handle-icon" aria-hidden="true">
              <span class="material-symbols-outlined">drag_handle</span>
            </div>
          {/if}
          <div class="position-number">{index + 1}</div>
          <div class="position-label">
            {cardData.position_label || `Card ${index + 1}`}
          </div>
          {#if cardData.card_name}
            <div class="card-position-name">{cardData.card_name}</div>
          {:else}
            <div
              class="empty-card-btn"
              on:click={(e) => handleAddButtonClick(e, index)}
              on:keydown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleAddButtonClick(e, index)
                  : null}
              role="button"
              tabindex="0"
              title="Add card"
              aria-label="Add card to this position"
            >
              <span class="material-symbols-outlined">add_2</span>
            </div>
          {/if}
          {#if !readonly}
            <div class="rotation-handle" title="Drag to rotate">
              <span class="material-symbols-outlined"> rotate_right </span>
            </div>
          {/if}
        </button>
      {/each}
    {:else if currentTemplate.id === "custom"}
      <!-- Custom template - click-to-add cards -->
      {#each Object.entries(spreadCards) as [indexStr, cardData]}
        {@const index = parseInt(indexStr)}
        <button
          type="button"
          class="card-position custom-card {cardData.card_name
            ? 'filled'
            : ''} {mobileActiveCard === index ? 'mobile-active' : ''}"
          style="left: {scalePosition(
            cardData.position_x,
          )}px; top: {scalePosition(cardData.position_y)}px; {cardData.rotation
            ? `transform: rotate(${cardData.rotation}deg)`
            : ''}; {readonly ? 'cursor: default;' : 'cursor: grab;'}"
          on:click|stopPropagation={() => handleCardClick(index)}
          use:interactCard={index}
          data-position-index={index}
          aria-label="{cardData.position_label ||
            `Position ${index + 1}`} - {cardData.card_name || 'Add card'}"
        >
          {#if !readonly}
            <div
              class="delete-card-btn {cardData.card_name ? '' : 'delete-icon'}"
              title={cardData.card_name ? "Clear card" : "Delete position"}
              on:click|stopPropagation={() => deleteCard(index)}
              on:keydown={(e) => handleDeleteKeydown(e, index)}
              role="button"
              tabindex="0"
              aria-label={cardData.card_name ? "Clear card" : "Delete position"}
            >
              <span class="material-symbols-outlined">
                {cardData.card_name ? "close_small" : "delete_forever"}
              </span>
            </div>
            <div class="drag-handle-icon" aria-hidden="true">
              <span class="material-symbols-outlined">drag_handle</span>
            </div>
          {/if}
          <div class="position-number">{index + 1}</div>
          <div class="position-label">
            {cardData.position_label || `Card ${index + 1}`}
          </div>
          {#if cardData.card_name}
            <div class="card-position-name">{cardData.card_name}</div>
          {:else}
            <div
              class="empty-card-btn"
              on:click={(e) => handleAddButtonClick(e, index)}
              on:keydown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleAddButtonClick(e, index)
                  : null}
              role="button"
              tabindex="0"
              title="Add card"
              aria-label="Add card to this position"
            >
              <span class="material-symbols-outlined">add_2</span>
            </div>
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
          class="card-position {cardData?.card_name
            ? 'filled'
            : ''} {mobileActiveCard === index ? 'mobile-active' : ''}"
          style="left: {scalePosition(xPos)}px; top: {scalePosition(
            yPos,
          )}px; {rotation
            ? `transform: rotate(${rotation}deg)`
            : ''}; cursor: pointer;"
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
              >
                <span class="material-symbols-outlined"> close </span>
              </div>
            {/if}
            <div class="position-number">{position.order}</div>
            <div class="position-label">{position.label}</div>
            <div class="card-position-name">{cardData.card_name}</div>
          {:else}
            <div class="position-number">{position.order}</div>
            <div class="position-label">{position.label}</div>
            <div
              class="empty-card-btn"
              on:click={(e) => handleAddButtonClick(e, index)}
              on:keydown={(e) =>
                e.key === "Enter" || e.key === " "
                  ? handleAddButtonClick(e, index)
                  : null}
              role="button"
              tabindex="0"
              title="Add card"
              aria-label="Add card to this position"
            >
              <span class="material-symbols-outlined">add_2</span>
            </div>
          {/if}
        </button>
      {/each}
    {/if}
  </div>

  {#if currentTemplate}
    <div class="zoom-controls">
      <button
        type="button"
        class="zoom-btn"
        on:click={zoomOut}
        title="Zoom out"
        aria-label="Zoom out"
        ><span class="material-symbols-outlined"> remove </span></button
      >
      <button
        type="button"
        class="zoom-btn"
        on:click={centerView}
        title="Reset zoom"
        aria-label="Reset zoom"
        ><span class="material-symbols-outlined">
          center_focus_weak
        </span></button
      >
      <button
        type="button"
        class="zoom-btn"
        on:click={zoomIn}
        title="Zoom in"
        aria-label="Zoom in"
        ><span class="material-symbols-outlined"> add </span></button
      >
    </div>
  {/if}
</div>

<CardModal
  bind:isOpen={isModalOpen}
  positionLabel={modalPositionLabel}
  existingCard={modalExistingCard}
  usedCards={usedCardNames}
  {readonly}
  onSave={handleModalSave}
  onCancel={handleModalCancel}
/>
