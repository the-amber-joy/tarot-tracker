<script lang="ts">
  export let isOpen: boolean = false;
  export let title: string = "Confirm";
  export let message: string = "";
  export let confirmText: string = "Confirm";
  export let cancelText: string = "Cancel";
  export let isDanger: boolean = false;
  export let isAlert: boolean = false; // If true, show only one button (alert style)
  export let onConfirm: () => void;
  export let onCancel: (() => void) | undefined = undefined;

  function handleConfirm() {
    onConfirm();
  }

  function handleCancel() {
    if (isAlert) {
      // For alerts, close button acts like confirm
      handleConfirm();
    } else if (onCancel) {
      onCancel();
    }
  }

  function handleOverlayClick() {
    handleCancel();
  }
</script>

{#if isOpen}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === "Escape" && handleCancel()}
    role="button"
    tabindex="-1"
  >
    <div
      class="modal-dialog"
      on:click|stopPropagation
      on:keydown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h3 id="modal-title">{title}</h3>
      </div>
      <div class="modal-body">
        <p>{@html message}</p>
      </div>
      <div class="modal-footer" class:single-button={isAlert}>
        {#if !isAlert}
          <button
            type="button"
            class="btn btn-secondary"
            on:click={handleCancel}>{cancelText}</button
          >
        {/if}
        <button
          type="button"
          class={isDanger ? "btn btn-danger" : "btn btn-primary"}
          on:click={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Uses global modal styles from app.css */
  .modal-dialog {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-lg);
  }
</style>
