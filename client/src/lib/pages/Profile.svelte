<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import Toast from "../components/Toast.svelte";
  import ProfileAccount from "./ProfileAccount.svelte";
  import ProfileDecks from "./ProfileDecks.svelte";
  import ProfileReadings from "./ProfileReadings.svelte";

  let activeTab: "profile" | "decks" | "readings" = "decks";
  let display_name = $authStore?.display_name || $authStore?.username || "";

  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";

  let mounted = false;

  onMount(async () => {
    // Restore the active tab from localStorage
    const savedTab = localStorage.getItem("profileActiveTab");
    if (
      savedTab === "profile" ||
      savedTab === "decks" ||
      savedTab === "readings"
    ) {
      activeTab = savedTab;
    }
    mounted = true;
  });

  // Save active tab when it changes (only after mount)
  $: if (mounted && activeTab) {
    localStorage.setItem("profileActiveTab", activeTab);
  }

  function handleToast(message: string, type: string = "success") {
    toastMessage = message;
    toastType = type as "success" | "error" | "info";
    showToast = true;
  }

  function goBack() {
    navigate("/");
  }
</script>

<Toast bind:isVisible={showToast} message={toastMessage} type={toastType} />

<div class="profile-container">
  <div class="profile-header">
    <button class="back-button" on:click={goBack}>← Back to Dashboard</button>
    <h2>{display_name}'s Profile</h2>
  </div>

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === "readings"}
      on:click={() => (activeTab = "readings")}
    >
      Readings
    </button>
    <button
      class="tab"
      class:active={activeTab === "decks"}
      on:click={() => (activeTab = "decks")}
    >
      Decks
    </button>
    <button
      class="tab"
      class:active={activeTab === "profile"}
      on:click={() => (activeTab = "profile")}
    >
      Account
    </button>
  </div>

  <div class="profile-content">
    <div class="tab-content" class:hidden={activeTab !== "readings"}>
      <ProfileReadings onToast={handleToast} />
    </div>

    <div class="tab-content" class:hidden={activeTab !== "decks"}>
      <ProfileDecks onToast={handleToast} />
    </div>

    <div class="tab-content" class:hidden={activeTab !== "profile"}>
      <ProfileAccount />
    </div>
  </div>
</div>

<style>
  .tab-content.hidden {
    display: none;
  }

  .profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 0.5rem;
  }

  .profile-header {
    margin-bottom: 2rem;
  }

  .profile-header h2 {
    margin: 0.5rem 0 0 0;
    color: var(--color-text-primary);
  }

  .back-button {
    background: none;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0;
    font-size: 1rem;
  }

  .back-button:hover {
    text-decoration: underline;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--color-border);
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-secondary);
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: var(--color-primary);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 600;
  }

  .profile-content {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (max-width: 600px) {
    .tabs {
      flex-wrap: wrap;
    }

    .tab {
      flex: 1;
      text-align: center;
      padding: 0.75rem 0.5rem;
    }
  }
</style>
