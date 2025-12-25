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
  
  let currentPath = '';
  let authInitialized = false;
  let isDeckModalOpen: boolean = false;
  
  // Show FAB on home, profile, and reading pages (not in edit/new mode)
  $: showFab = currentPath === '/' || currentPath === '/profile' || (currentPath.startsWith('/reading/') && currentPath !== '/reading/new' && !currentPath.includes('/edit'));
  
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
  
  function handleNewReading() {
    navigate('/reading/new');
    setTimeout(() => currentPath = window.location.pathname, 0);
  }

  function closeDeckModal() {
    isDeckModalOpen = false;
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
      <ReadingForm />
    </Route>
    <Route path="/reading/:id" let:params>
      <ReadingDetail {params} />
    </Route>
    <Route path="/reading/:id/edit" let:params>
      <ReadingForm {params} />
    </Route>
  </div>
  
  <!-- Floating action button -->
  {#if showFab}
    <button 
      class="fab" 
      on:click={handleNewReading} 
      aria-label="New Reading"
    >
      <span class="fab-icon">+</span>
    </button>
  {/if}
  
  <DeckModal 
    isOpen={isDeckModalOpen}
    onClose={closeDeckModal}
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
  .fab {
    position: fixed;
    bottom: 2rem;
    right: max(2rem, calc((100vw - 1200px) / 2 + 2rem));
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
    z-index: 100;
  }

  .fab:hover {
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.7);
  }

  .fab:active {
    transform: scale(0.95);
  }

  .fab-icon {
    font-size: 2rem;
    line-height: 1;
    font-weight: 300;
  }
</style>
