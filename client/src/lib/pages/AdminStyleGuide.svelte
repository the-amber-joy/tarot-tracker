<script lang="ts">
  import AddDeckModal from "../modals/AddDeckModal.svelte";
  import CardDetailsModal from "../modals/CardDetailsModal.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";
  import SessionExpiredModal from "../modals/SessionExpiredModal.svelte";

  export let onToast: (
    message: string,
    type: "success" | "error" | "info",
  ) => void;

  let showSessionExpiredModal = false;
  let showConfirmModal = false;
  let showDangerConfirmModal = false;
  let showAlertModal = false;
  let showAddDeckModal = false;
  let showCardDetailsModal = false;
  let activeTab = 1;
</script>

<div class="style-guide-section">
  <h3>Style Guide</h3>
  <p class="style-guide-intro">
    Global UI components and styles used throughout the app.
  </p>

  <div class="style-demo">
    <h4>Loading Spinner</h4>
    <div class="demo-box">
      <div class="loading">
        <div class="loading-spinner"></div>
      </div>
    </div>
  </div>

  <div class="style-demo">
    <h4>Empty State</h4>
    <div class="demo-box">
      <div class="empty-state">No items found</div>
    </div>
  </div>

  <div class="style-demo">
    <h4>Buttons</h4>
    <div class="demo-box button-row">
      <button class="btn btn-primary">Primary</button>
      <button class="btn btn-secondary">Secondary</button>
      <button class="btn btn-danger">Danger</button>
      <button class="btn btn-warning">Warning</button>
      <button class="btn btn-small btn-primary">Small</button>
    </div>
  </div>

  <div class="style-demo">
    <h4>Styled Select</h4>
    <div class="demo-box">
      <select class="styled-select">
        <option>Option 1</option>
        <option>Option 2</option>
        <option>Option 3</option>
      </select>
    </div>
  </div>

  <div class="style-demo">
    <h4>Tabs</h4>
    <div class="demo-box">
      <div class="tabs demo-tabs">
        <button
          class="tab"
          class:active={activeTab === 1}
          on:click={() => (activeTab = 1)}>Tab One</button
        >
        <button
          class="tab"
          class:active={activeTab === 2}
          on:click={() => (activeTab = 2)}>Tab Two</button
        >
        <button
          class="tab"
          class:active={activeTab === 3}
          on:click={() => (activeTab = 3)}>Tab Three</button
        >
      </div>
      <div class="tab-content">
        {#if activeTab === 1}
          <p>Content for Tab One</p>
        {:else if activeTab === 2}
          <p>Content for Tab Two</p>
        {:else}
          <p>Content for Tab Three</p>
        {/if}
      </div>
    </div>
  </div>

  <div class="style-demo">
    <h4>Message Boxes</h4>
    <div class="demo-box">
      <div class="message-box error">This is an error message</div>
      <div class="message-box success">This is a success message</div>
    </div>
  </div>

  <div class="style-demo">
    <h4>Toasts</h4>
    <div class="demo-box button-row">
      <button
        class="btn btn-primary"
        on:click={() => onToast("This is a success toast!", "success")}
      >
        Success Toast
      </button>
      <button
        class="btn btn-danger"
        on:click={() => onToast("This is an error toast!", "error")}
      >
        Error Toast
      </button>
      <button
        class="btn btn-secondary"
        on:click={() => onToast("This is an info toast!", "info")}
      >
        Info Toast
      </button>
    </div>
  </div>

  <div class="style-demo">
    <h4>Modals</h4>
    <div class="demo-box button-row">
      <button
        class="btn btn-warning"
        on:click={() => (showSessionExpiredModal = true)}
      >
        Session Expired
      </button>
      <button
        class="btn btn-primary"
        on:click={() => (showConfirmModal = true)}
      >
        Confirm
      </button>
      <button
        class="btn btn-danger"
        on:click={() => (showDangerConfirmModal = true)}
      >
        Danger Confirm
      </button>
      <button
        class="btn btn-secondary"
        on:click={() => (showAlertModal = true)}
      >
        Alert
      </button>
      <button
        class="btn btn-primary"
        on:click={() => (showAddDeckModal = true)}
      >
        Add Deck
      </button>
      <button
        class="btn btn-secondary"
        on:click={() => (showCardDetailsModal = true)}
      >
        Card Details
      </button>
    </div>
  </div>
</div>

{#if showSessionExpiredModal}
  <SessionExpiredModal onClose={() => (showSessionExpiredModal = false)} />
{/if}

<ConfirmModal
  bind:isOpen={showConfirmModal}
  title="Confirm Action"
  message="Are you sure you want to proceed with this action?"
  confirmText="Confirm"
  onConfirm={() => {
    showConfirmModal = false;
    onToast("Action confirmed!", "success");
  }}
  onCancel={() => (showConfirmModal = false)}
/>

<ConfirmModal
  bind:isOpen={showDangerConfirmModal}
  title="Delete Item"
  message="This action cannot be undone. Are you sure you want to delete this item?"
  confirmText="Delete"
  isDanger={true}
  onConfirm={() => {
    showDangerConfirmModal = false;
    onToast("Item deleted!", "error");
  }}
  onCancel={() => (showDangerConfirmModal = false)}
/>

<ConfirmModal
  bind:isOpen={showAlertModal}
  title="Information"
  message="This is an alert modal with a single button."
  confirmText="OK"
  isAlert={true}
  onConfirm={() => (showAlertModal = false)}
/>

<AddDeckModal
  bind:isOpen={showAddDeckModal}
  onClose={() => (showAddDeckModal = false)}
  onDeckAdded={(name) => {
    showAddDeckModal = false;
    onToast(`Deck "${name}" would be added!`, "info");
  }}
/>

<CardDetailsModal
  bind:isOpen={showCardDetailsModal}
  cardName="The Fool"
  onClose={() => (showCardDetailsModal = false)}
/>

<style>
  .style-guide-section {
    margin-top: 1rem;
  }

  .style-guide-section h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .style-guide-intro {
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
  }

  .style-demo {
    margin-bottom: 2rem;
  }

  .style-demo h4 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    color: var(--color-text-secondary);
  }

  .demo-box {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 2rem;
  }

  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .demo-tabs {
    margin-bottom: 0;
  }

  .tab-content {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    background: var(--color-bg-section);
  }

  .tab-content p {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-light);
  }
</style>
