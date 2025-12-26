<script lang="ts">
  export let onClose: () => void;
</script>

<div class="modal-overlay" on:click={onClose}>
  <div class="modal-content" on:click|stopPropagation>
    <div class="modal-header">
      <h3>Session Expired</h3>
    </div>
    <div class="modal-body">
      <p>Your session has expired. Please log in again to continue.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" on:click={onClose}>
        Return to Login
      </button>
    </div>
  </div>
</div>

<style>
  .modal-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h3 {
    margin: 0;
    color: var(--color-warning);
    font-size: 1.5rem;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-body p {
    margin: 0;
    color: var(--color-text-primary);
    line-height: 1.6;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .modal-content {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    max-width: 400px;
    width: 90%;
    box-shadow: var(--shadow-xl);
  }
</style>
