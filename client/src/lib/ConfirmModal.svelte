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
          <button type="button" class="btn-cancel" on:click={handleCancel}
            >{cancelText}</button
          >
        {/if}
        <button
          type="button"
          class={isDanger ? "btn-danger" : "btn btn-primary"}
          on:click={handleConfirm}
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-dialog {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid #dee2e6;
  }

  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #212529;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-body p {
    margin: 0;
    color: #495057;
    line-height: 1.5;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .btn-cancel {
    padding: 10px 20px;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-cancel:hover {
    background-color: #5a6268;
  }

  .btn-danger {
    padding: 10px 20px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-danger:hover {
    background: #c82333;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
  }
</style>
