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
  /* Uses global modal styles from app.css */
  .modal-header h3 {
    color: var(--color-warning);
  }
</style>
