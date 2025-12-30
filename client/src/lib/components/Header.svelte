<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { unverifiedCountStore } from "../../stores/adminStore";
  import { authStore } from "../../stores/authStore";

  export let onHome: () => void;

  let isMenuOpen = false;

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Fetch on mount if admin
  onMount(() => {
    if ($authStore?.is_admin) {
      unverifiedCountStore.fetchUnverifiedCount();
    }
  });

  // Re-fetch when auth changes (e.g., after login)
  $: if ($authStore?.is_admin) {
    unverifiedCountStore.fetchUnverifiedCount();
  } else {
    unverifiedCountStore.reset();
  }

  async function handleLogout() {
    try {
      await authStore.logout();
      isMenuOpen = false;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function handleProfileClick() {
    isMenuOpen = false;
    navigate("/profile");
  }

  function handleAdminClick() {
    isMenuOpen = false;
    navigate("/admin");
  }
</script>

<header class="app-header">
  <h1>
    <button on:click={onHome} class="home-button">🔮 Tarot Tracker</button>
  </h1>

  <button
    class="hamburger"
    on:click={toggleMenu}
    aria-label="Menu"
    aria-expanded={isMenuOpen}
  >
    <span></span>
    <span></span>
    <span></span>
  </button>

  <div class="header-actions" class:menu-open={isMenuOpen}>
    {#if $authStore?.is_admin}
      <button class="btn btn-warning admin-btn" on:click={handleAdminClick}>
        <span class="material-symbols-outlined"> build </span> Admin
        {#if $unverifiedCountStore > 0}
          <span
            class="notification-badge"
            title="{$unverifiedCountStore} unverified user(s)"
          >
            {$unverifiedCountStore}
          </span>
        {/if}
      </button>
    {/if}
    {#if $authStore}
      <button
        class="btn user-info"
        on:click={handleProfileClick}
        title="View Profile"
      >
        <span class="material-symbols-outlined profile-icon">
          user_attributes
        </span>
        <span class="profile-text">My Profile</span>
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
    background: var(--color-bg-dark);
    border-bottom: 2px solid var(--color-bg-dark-border);
    margin-bottom: 2rem;
    position: relative;
    container-type: inline-size;
  }

  .app-header h1 {
    margin: 0;
    font-size: 2rem;
    color: white;
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
    background: white;
    transition: var(--transition-normal);
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  /* Using global .btn from app.css */

  .admin-btn {
    position: relative;
  }

  .notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #dc3545;
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .user-info {
    background: none;
    color: white;
  }

  .user-info:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .profile-text {
    display: none;
  }

  /* Container query: show hamburger when header is narrow */
  @container (max-width: 600px) {
    .app-header h1 {
      font-size: 1.5rem;
    }

    .hamburger {
      display: flex;
    }

    .profile-icon {
      display: none;
    }

    .profile-text {
      display: inline;
    }

    .header-actions {
      position: absolute;
      top: 100%;
      right: 0;
      left: 0;
      flex-direction: column;
      background: linear-gradient(
        135deg,
        var(--color-gradient-start) 0%,
        var(--color-gradient-end) 100%
      );
      border-bottom: 2px solid var(--color-border);
      padding: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
      z-index: var(--z-dropdown);
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
