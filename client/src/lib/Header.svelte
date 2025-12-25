<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { navigate } from 'svelte-routing';
  import { authStore } from '../stores/authStore';
  
  export let onNewReading: () => void;
  export let onHome: () => void;
  
  const dispatch = createEventDispatcher();
  let isMenuOpen = false;
  
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
  
  function handleNewReading() {
    isMenuOpen = false; // Close menu when opening new reading
    onNewReading();
  }

  async function handleLogout() {
    try {
      await authStore.logout();
      isMenuOpen = false;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  function handleProfileClick() {
    isMenuOpen = false;
    navigate('/profile');
  }

  function handleAdminClick() {
    isMenuOpen = false;
    navigate('/admin');
  }
</script>

<header class="app-header">
  <h1><button on:click={onHome} class="home-button">🔮 Tarot Tracker</button></h1>
  
  <button class="hamburger" on:click={toggleMenu} aria-label="Menu" aria-expanded={isMenuOpen}>
    <span></span>
    <span></span>
    <span></span>
  </button>
  
  <div class="header-actions" class:menu-open={isMenuOpen}>
    {#if $authStore}
      <button class="user-info" on:click={handleProfileClick} title="View Profile">
        👤 Profile
      </button>
    {/if}
    {#if $authStore?.is_admin}
      <button class="btn btn-warning" on:click={handleAdminClick}>
        🔧 Admin
      </button>
    {/if}
    {#if $authStore}
      <button class="btn btn-secondary" on:click={handleLogout}>
        Logout
      </button>
    {/if}
  </div>
</header>

<style>
  .app-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    background: var(--color-bg-secondary, #1a1a2e);
    border-bottom: 2px solid var(--color-border, #16213e);
    margin-bottom: 2rem;
    position: relative;
    container-type: inline-size;
  }
  
  .app-header h1 {
    margin: 0;
    font-size: 2rem;
    color: var(--color-text, #eee);
  }

  .home-button {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }
  
  .hamburger {
    display: none;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
  }
  
  .hamburger span {
    width: 24px;
    height: 3px;
    background: var(--color-text, #eee);
    transition: all 0.3s ease;
  }
  
  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .user-info {
    color: var(--color-text, #eee);
    font-size: 0.9rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .user-info:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Container query: show hamburger when header is narrow */
  @container (max-width: 600px) {
    .app-header h1 {
      font-size: 1.5rem;
    }
    
    .hamburger {
      display: flex;
    }
    
    .header-actions {
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      flex-direction: column;
      background: var(--color-bg-secondary, #1a1a2e);
      border-bottom: 2px solid var(--color-border, #16213e);
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      z-index: 10;
    }
    
    .header-actions.menu-open {
      max-height: 300px;
      padding: 1rem;
    }
    
    .header-actions button {
      width: 100%;
    }
  }
</style>
