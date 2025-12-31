<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let index: number;
  export let cardName: string = "";
  export let positionLabel: string = "";
  export let positionNumber: number;
  export let rotation: number = 0;
  export let reversed: boolean = false;
  export let left: number;
  export let top: number;
  export let readonly: boolean = false;
  export let isCustomSpread: boolean = false;
  export let isMobileActive: boolean = false;
  export let interactAction:
    | ((node: HTMLButtonElement, index: number) => any)
    | null = null;

  const dispatch = createEventDispatcher<{
    click: void;
    delete: void;
    rotateRight: void;
    rotateLeft: void;
    reverse: void;
    addClick: void;
  }>();

  // Helper to get card image URL from card name
  function getCardImageUrl(name: string): string {
    if (!name || !name.trim()) return "";
    const filename = name.replace(/\s+/g, "").toLowerCase();
    return `/tarot-images/${filename}.jpeg`;
  }

  function handleKeydown(e: KeyboardEvent, action: () => void) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  }

  // Build the style string (rotation only, no reversal - that's on the image layer)
  $: style = [
    `left: ${left}px`,
    `top: ${top}px`,
    rotation ? `transform: rotate(${rotation}deg)` : "",
    readonly
      ? "cursor: default"
      : isCustomSpread
        ? "cursor: grab"
        : "cursor: pointer",
  ]
    .filter(Boolean)
    .join("; ");

  // Build the image layer style (background image + reversal)
  $: imageStyle = [
    `background-image: url('${getCardImageUrl(cardName)}')`,
    "background-size: cover",
    "background-position: center",
    reversed ? "transform: rotate(180deg)" : "",
  ]
    .filter(Boolean)
    .join("; ");

  // Determine button classes
  $: classes = [
    "card-position",
    isCustomSpread ? "custom-card" : "",
    cardName ? "filled" : "",
    isMobileActive ? "mobile-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Determine delete button behavior
  $: deleteTitle = cardName ? "Clear card" : "Delete position";
  $: deleteIcon = cardName ? "cancel" : "delete_forever";
  $: deleteAriaLabel = cardName ? "Clear card" : "Delete position";

  // Show controls based on spread type and readonly
  $: showControls = isCustomSpread ? !readonly : !readonly && cardName?.trim();
  $: showDragHandle = isCustomSpread && !readonly;

  // Rotation limits: max 90° right (clockwise), max 90° left (270° = -90°)
  // Hide rotate right when at 90°, hide rotate left when at 270°
  $: canRotateRight = rotation !== 90;
  $: canRotateLeft = rotation !== -90;

  // Wrapper for interactAction that handles null case
  function useInteract(node: HTMLButtonElement, idx: number) {
    if (interactAction) {
      return interactAction(node, idx);
    }
    return { destroy() {} };
  }
</script>

<button
  type="button"
  class={classes}
  {style}
  on:click|stopPropagation={() => dispatch("click")}
  use:useInteract={index}
  data-position-index={index}
  title={positionLabel}
  aria-label="{positionLabel} - {cardName || 'Add card'}"
>
  {#if cardName}
    <div class="card-image-layer" style={imageStyle}></div>
  {/if}

  {#if showControls}
    <div class="card-controls">
      {#if canRotateLeft}
        <div
          class="card-control-btn rotate-left-btn"
          title="Rotate left 30°"
          on:click|stopPropagation={() => dispatch("rotateLeft")}
          on:keydown={(e) => handleKeydown(e, () => dispatch("rotateLeft"))}
          role="button"
          tabindex="0"
          aria-label="Rotate card left 30 degrees"
        >
          <span class="material-symbols-outlined">rotate_left</span>
        </div>
      {/if}
      <div
        class="card-control-btn delete-btn {!cardName ? 'delete-icon' : ''}"
        title={deleteTitle}
        on:click|stopPropagation={() => dispatch("delete")}
        on:keydown={(e) => handleKeydown(e, () => dispatch("delete"))}
        role="button"
        tabindex="0"
        aria-label={deleteAriaLabel}
      >
        <span class="material-symbols-outlined">{deleteIcon}</span>
      </div>
      {#if canRotateRight}
        <div
          class="card-control-btn rotate-right-btn"
          title="Rotate right 30°"
          on:click|stopPropagation={() => dispatch("rotateRight")}
          on:keydown={(e) => handleKeydown(e, () => dispatch("rotateRight"))}
          role="button"
          tabindex="0"
          aria-label="Rotate card right 30 degrees"
        >
          <span class="material-symbols-outlined">rotate_right</span>
        </div>
      {/if}
    </div>
  {/if}

  {#if showDragHandle}
    <div class="drag-handle-icon" aria-hidden="true">
      <span class="material-symbols-outlined">drag_handle</span>
    </div>
  {/if}

  {#if !cardName}
    <div class="position-number">{positionNumber}</div>
    <div class="position-label">{positionLabel}</div>
  {/if}

  {#if cardName}
    <div class="card-position-name">{cardName}</div>
  {:else}
    <div
      class="empty-card-btn"
      on:click|stopPropagation={() => dispatch("addClick")}
      on:keydown={(e) => handleKeydown(e, () => dispatch("addClick"))}
      role="button"
      tabindex="0"
      title="Add card"
      aria-label="Add card to this position"
    >
      <span class="material-symbols-outlined">add_2</span>
    </div>
  {/if}

  {#if showControls && cardName}
    <div class="card-controls-bottom">
      <div
        class="card-control-btn reverse-btn"
        title={reversed ? "Set upright" : "Reverse card"}
        on:click|stopPropagation={() => dispatch("reverse")}
        on:keydown={(e) => handleKeydown(e, () => dispatch("reverse"))}
        role="button"
        tabindex="0"
        aria-label={reversed ? "Set card upright" : "Reverse card"}
      >
        <span class="material-symbols-outlined">swap_vert</span>
      </div>
    </div>
  {/if}
</button>
