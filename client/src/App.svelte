<script lang="ts">
  import { onMount } from "svelte";
  import { Route, Router, navigate } from "svelte-routing";
  import Header from "./lib/components/Header.svelte";
  import ManageDeckModal from "./lib/modals/ManageDeckModal.svelte";
  import SessionExpiredModal from "./lib/modals/SessionExpiredModal.svelte";
  import Admin from "./lib/pages/Admin.svelte";
  import Dashboard from "./lib/pages/Dashboard.svelte";
  import Login from "./lib/pages/Login.svelte";
  import NotFound from "./lib/pages/NotFound.svelte";
  import Profile from "./lib/pages/Profile.svelte";
  import ReadingDetail from "./lib/pages/ReadingDetail.svelte";
  import ReadingForm from "./lib/pages/ReadingForm.svelte";
  import { authStore } from "./stores/authStore";
  import { sessionStore } from "./stores/sessionStore";

  let currentPath = "";
  let authInitialized = false;
  let isDeckModalOpen: boolean = false;

  // Show FAB on home, profile, admin, and reading pages (not in edit/new mode)
  $: showFab =
    currentPath === "/" ||
    currentPath === "/profile" ||
    currentPath === "/admin" ||
    (currentPath.startsWith("/reading/") &&
      currentPath !== "/reading/new" &&
      !currentPath.includes("/edit"));

  // Start/stop polling based on auth state
  $: if (authInitialized) {
    if ($authStore) {
      sessionStore.startPolling();
    } else {
      sessionStore.stopPolling();
    }
  }

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
    window.addEventListener("popstate", updatePath);

    // Poll for path changes (catches navigate() calls)
    const intervalId = setInterval(updatePath, 100);

    return () => {
      window.removeEventListener("popstate", updatePath);
      clearInterval(intervalId);
      sessionStore.stopPolling();
    };
  });

  function handleNewReading() {
    navigate("/reading/new");
    setTimeout(() => (currentPath = window.location.pathname), 0);
  }

  function closeDeckModal() {
    isDeckModalOpen = false;
  }

  function handleSessionExpired() {
    sessionStore.stopPolling();
    sessionStore.hideExpiredModal();
    authStore.logout();
  }
</script>

{#if !authInitialized}
  <div class="loading">
    <div class="loading-spinner"></div>
    <span>Loading...</span>
  </div>
{:else if !$authStore}
  <Login />
{:else}
  <Router>
    <div class="container">
      <Header
        onHome={() => {
          navigate("/");
          setTimeout(() => (currentPath = window.location.pathname), 0);
        }}
      />

      <Route path="/">
        <Dashboard />
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
      <Route path="*">
        <NotFound />
      </Route>
    </div>

    <!-- Floating action button -->
    {#if showFab}
      <button class="fab" on:click={handleNewReading} aria-label="New Reading">
        <span class="fab-icon">+</span>
      </button>
    {/if}

    <ManageDeckModal
      isOpen={isDeckModalOpen}
      onClose={closeDeckModal}
      onDeckAdded={() => {}}
    />
  </Router>
{/if}

<!-- Session expired modal - shown globally -->
{#if $sessionStore.showExpiredModal}
  <SessionExpiredModal onClose={handleSessionExpired} />
{/if}

<style>
  .loading {
    height: 100vh;
  }

  /* Floating Action Button */
  .fab {
    position: fixed;
    bottom: 2rem;
    right: max(2rem, calc((100vw - 1200px) / 2 + 2rem));
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--color-gradient-start) 0%,
      var(--color-gradient-end) 100%
    );
    color: white;
    border: none;
    box-shadow: 0 0 12px rgba(255, 255, 255, 0.5);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--transition-normal);
    z-index: var(--z-dropdown);
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
