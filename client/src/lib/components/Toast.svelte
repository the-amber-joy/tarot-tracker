<script lang="ts">
  export let message: string = "";
  export let isVisible: boolean = false;
  export let type: "success" | "error" | "info" = "info";
  export let duration: number = 3000;

  let timeoutId: number;

  $: if (isVisible && duration > 0) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      isVisible = false;
    }, duration);
  }
</script>

{#if isVisible}
  <div class="toast toast-{type}" role="alert">
    <span class="toast-icon">
      {#if type === "success"}
        <span class="material-symbols-outlined"> check </span>
      {:else if type === "error"}
        <span class="material-symbols-outlined"> error </span>
      {:else}
        <span class="material-symbols-outlined"> info </span>
      {/if}
    </span>
    <span class="toast-message">{message}</span>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    min-width: 250px;
    max-width: 400px;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    z-index: var(--z-toast);
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-success {
    background: var(--color-success);
    color: white;
  }

  .toast-error {
    background: var(--color-danger);
    color: white;
  }

  .toast-info {
    background: #17a2b8;
    color: white;
  }

  .toast-icon {
    font-size: 4rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  @media (max-width: 768px) {
    .toast {
      right: 10px;
      left: 10px;
      min-width: unset;
      max-width: unset;
    }
  }
</style>
