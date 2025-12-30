<script lang="ts">
  export let onClose: () => void;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="modal-overlay"
  onclick={onClose}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="presentation"
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-content"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="session-expired-title"
    tabindex="-1"
  >
    <div class="modal-header">
      <h3 id="session-expired-title">Session Expired</h3>
    </div>
    <div class="modal-body">
      <p>Your session has expired. Please log in again to continue.</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick={onClose}>
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
