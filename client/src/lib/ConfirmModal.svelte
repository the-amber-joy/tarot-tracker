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
          <button type="button" class="btn btn-secondary" on:click={handleCancel}
            >{cancelText}</button
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
  /* Using global .modal-overlay from app.css */

  .modal-dialog {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-body p {
    margin: 0;
    color: var(--color-text-heading);
    line-height: 1.5;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  /* Using global .btn, .btn-primary, .btn-secondary, .btn-danger from app.css */
</style>
