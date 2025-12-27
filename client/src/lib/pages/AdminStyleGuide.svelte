<script lang="ts">
  export let onToast: (
    message: string,
    type: "success" | "error" | "info",
  ) => void;
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
        <button class="tab active">Active Tab</button>
        <button class="tab">Inactive Tab</button>
        <button class="tab">Another Tab</button>
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
</div>

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

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-light);
  }
</style>
