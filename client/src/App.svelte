<script lang="ts">
  import { onMount } from 'svelte';
  import { Route, Router, navigate } from 'svelte-routing';
  import Admin from './lib/Admin.svelte';
  import DeckModal from './lib/DeckModal.svelte';
  import Header from './lib/Header.svelte';
  import Login from './lib/Login.svelte';
  import Profile from './lib/Profile.svelte';
  import ReadingDetail from './lib/ReadingDetail.svelte';
  import ReadingForm from './lib/ReadingForm.svelte';
  import ReadingsList from './lib/ReadingsList.svelte';
  import { authStore } from './stores/authStore';
  
  let formRef: any = null;
  let currentPath = '';
  let authInitialized = false;
  let showFabMenu: boolean = false;
  let isDeckModalOpen: boolean = false;
  
  // Show FAB on home, profile, and reading pages
  $: showFab = currentPath === '/' || currentPath === '/profile' || (currentPath.startsWith('/reading/') && currentPath !== '/reading/new');
  // When in edit mode, only show Manage Decks option
  $: isEditMode = currentPath.includes('/edit');
  
  onMount(() => {
    // Initialize auth
    authStore.init().then(() => {
      authInitialized = true;
    });

    // Initial path
    currentPath = window.location.pathname;
    
    // Listen for route changes
    const updatePath = () => {
      const newPath = window.location.pathname;
      if (newPath !== currentPath) {
        currentPath = newPath;
      }
    };
    
    // Listen to popstate for back/forward button
    window.addEventListener('popstate', updatePath);
    
    // Poll for path changes (catches navigate() calls)
    const intervalId = setInterval(updatePath, 100);
    
    return () => {
      window.removeEventListener('popstate', updatePath);
      clearInterval(intervalId);
    };
  });
  
  function handleDecksUpdated() {
    // Reload decks in the form if it's open
    if (formRef?.loadDecks) {
      formRef.loadDecks();
    }
  }

  function toggleFabMenu() {
    showFabMenu = !showFabMenu;
  }

  function handleNewReading() {
    showFabMenu = false;
    navigate('/reading/new');
    setTimeout(() => currentPath = window.location.pathname, 0);
  }

  function handleManageDecks() {
    showFabMenu = false;
    isDeckModalOpen = true;
  }

  function closeDeckModal() {
    isDeckModalOpen = false;
  }

  function handleDeckAdded() {
    // Deck was added, reload if needed
    if (formRef?.loadDecks) {
      formRef.loadDecks();
    }
  }

</script>

{#if !authInitialized}
  <div class="loading">Loading...</div>
{:else if !$authStore}
  <Login />
{:else}
<Router>
  <div class="container">
    <Header 
      onHome={() => {
        navigate('/');
        setTimeout(() => currentPath = window.location.pathname, 0);
      }}
      onNewReading={() => {
        navigate('/reading/new');
        setTimeout(() => currentPath = window.location.pathname, 0);
      }}
      on:decksUpdated={handleDecksUpdated}
    />

    <Route path="/">
      <ReadingsList />
    </Route>
    <Route path="/profile">
      <Profile />
    </Route>
    <Route path="/admin">
      <Admin />
    </Route>
    <Route path="/reading/new">
      <ReadingForm bind:this={formRef} />
    </Route>
    <Route path="/reading/:id" let:params>
      <ReadingDetail {params} />
    </Route>
    <Route path="/reading/:id/edit" let:params>
      <ReadingForm {params} bind:this={formRef} />
    </Route>
  </div>
  
  <!-- Floating action button -->
  {#if showFab}
    <div class="fab-container">
      {#if showFabMenu}
        <div class="fab-menu">
          {#if !isEditMode}
            <button class="fab-menu-item" on:click={handleNewReading}>
              <span class="fab-menu-icon">📖</span>
              <span class="fab-menu-label">New Reading</span>
            </button>
          {/if}
          <button class="fab-menu-item" on:click={handleManageDecks}>
            <span class="fab-menu-icon">🃏</span>
            <span class="fab-menu-label">Manage Decks</span>
          </button>
        </div>
      {/if}
      <button 
        class="fab" 
        class:fab-open={showFabMenu}
        on:click={toggleFabMenu} 
        aria-label="Menu" 
        aria-expanded={showFabMenu}
      >
        <span class="fab-icon">{showFabMenu ? '×' : '+'}</span>
      </button>
    </div>
  {/if}
  
  <DeckModal 
    isOpen={isDeckModalOpen}
    onClose={closeDeckModal}
    onDeckAdded={handleDeckAdded}
  />
</Router>
{/if}

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2rem;
    color: #666;
  }

  /* Floating Action Button */
  .fab-container {
    position: fixed;
    bottom: 2rem;
    right: max(2rem, calc((100vw - 1200px) / 2 + 2rem));
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1rem;
    z-index: 100;
  }

  .fab-menu {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fab-menu-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: white;
    border: none;
    border-radius: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .fab-menu-item:hover {
    transform: translateX(-5px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .fab-menu-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .fab-menu-label {
    font-size: 1rem;
    font-weight: 500;
    color: #333;
  }

  .fab {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .fab:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab.fab-open:active {
    transform: scale(0.95);
  }

  .fab-icon {
    font-size: 2rem;
    line-height: 1;
    font-weight: 300;
  }
</style>
