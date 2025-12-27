<script lang="ts">
  import { navigate } from "svelte-routing";
</script>

<div class="not-found-container">
  <div class="not-found-content">
    <div class="card-symbol">🃏</div>
    <h1>404</h1>
    <h2>Page Not Found</h2>
    <p>The cards didn't reveal this path...</p>
    <button class="home-button" on:click={() => navigate("/")}>
      Return to Dashboard
    </button>
  </div>
</div>

<style>
  .not-found-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    padding: 2rem;
  }

  .not-found-content {
    text-align: center;
    background: var(--color-bg-white);
    padding: 3rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    max-width: 400px;
  }

  .card-symbol {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  h1 {
    font-size: 4rem;
    margin: 0;
    background: linear-gradient(
      135deg,
      var(--color-gradient-start) 0%,
      var(--color-gradient-end) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  h2 {
    margin: 0.5rem 0 1rem;
    color: var(--color-text-primary);
    font-size: 1.5rem;
  }

  p {
    color: var(--color-text-secondary);
    margin-bottom: 2rem;
    font-style: italic;
  }

  .home-button {
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    color: white;
    background: linear-gradient(
      135deg,
      var(--color-gradient-start) 0%,
      var(--color-gradient-end) 100%
    );
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-normal);
  }

  .home-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
</style>
