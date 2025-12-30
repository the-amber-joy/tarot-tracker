<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import type { UserStats } from "../../types/admin";
  import Toast from "../components/Toast.svelte";
  import AdminCards from "./AdminCards.svelte";
  import AdminStyleGuide from "./AdminStyleGuide.svelte";
  import AdminUsers from "./AdminUsers.svelte";

  let activeTab: "users" | "cards" | "styles" = "users";
  let users: UserStats[] = [];
  let loading = true;
  let error = "";
  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";
  let showNukeConfirm = false;
  let nukeConfirmText = "";
  let nukeLoading = false;
  let showDeploymentInfo = false;
  let deploymentContent = "";
  let deploymentLoading = false;
  let mounted = false;

  onMount(async () => {
    if (!$authStore?.is_admin) {
      navigate("/");
      return;
    }

    // Restore the active tab from localStorage
    const savedTab = localStorage.getItem("adminActiveTab");
    if (savedTab === "users" || savedTab === "cards" || savedTab === "styles") {
      activeTab = savedTab;
    }

    await loadUsers();
    mounted = true;
  });

  // Save active tab when it changes (only after mount)
  $: if (mounted && activeTab) {
    localStorage.setItem("adminActiveTab", activeTab);
  }

  async function loadUsers() {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      users = await response.json();
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function displayToast(
    message: string,
    type: "success" | "error" | "info" = "success",
  ) {
    toastMessage = message;
    toastType = type;
    showToast = true;
  }

  async function openDeploymentInfo() {
    showDeploymentInfo = true;
    deploymentLoading = true;
    try {
      const response = await fetch("/api/deploy-info");
      if (!response.ok) {
        throw new Error("Failed to load deployment info");
      }
      const data = await response.json();
      deploymentContent = data.content;
    } catch (e: any) {
      deploymentContent = "Failed to load deployment information: " + e.message;
    } finally {
      deploymentLoading = false;
    }
  }

  function closeDeploymentInfo() {
    showDeploymentInfo = false;
  }

  function openNukeConfirm() {
    showNukeConfirm = true;
    nukeConfirmText = "";
  }

  function closeNukeConfirm() {
    showNukeConfirm = false;
    nukeConfirmText = "";
  }

  async function handleNuke() {
    if (nukeConfirmText !== "DELETE EVERYTHING") {
      return;
    }

    nukeLoading = true;
    try {
      const response = await fetch("/api/admin/nuke", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to clear data");
      }

      displayToast("All data cleared successfully!");
      closeNukeConfirm();
      await loadUsers();
    } catch (e: any) {
      displayToast("Error: " + e.message);
    } finally {
      nukeLoading = false;
    }
  }
</script>

<div class="admin-container">
  <Toast bind:isVisible={showToast} message={toastMessage} type={toastType} />

  <div class="admin-header">
    <h2><span class="material-symbols-outlined"> build </span> Admin Panel</h2>
    <div class="admin-header-buttons">
      <button
        class="btn btn-small btn-secondary"
        on:click={openDeploymentInfo}
        title="View deployment information"
      >
        🚀 Deployment Info
      </button>
      <button
        class="btn btn-small btn-danger nuke-button"
        on:click={openNukeConfirm}
      >
        ☢️ Nuclear Option
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === "users"}
      on:click={() => (activeTab = "users")}
    >
      Users
    </button>
    <button
      class="tab"
      class:active={activeTab === "cards"}
      on:click={() => (activeTab = "cards")}
    >
      Cards Database
    </button>
    <button
      class="tab"
      class:active={activeTab === "styles"}
      on:click={() => (activeTab = "styles")}
    >
      Style Guide
    </button>
  </div>

  <!-- Tab Contents - always mounted, visibility toggled -->
  <div class="tab-content" class:hidden={activeTab !== "users"}>
    <AdminUsers {users} {loading} {error} onToast={displayToast} />
  </div>

  <div class="tab-content" class:hidden={activeTab !== "cards"}>
    <AdminCards onToast={displayToast} />
  </div>

  <div class="tab-content" class:hidden={activeTab !== "styles"}>
    <AdminStyleGuide onToast={displayToast} />
  </div>

  {#if showNukeConfirm}
    <div
      class="modal-overlay"
      on:click={closeNukeConfirm}
      on:keydown={(e) => e.key === "Escape" && closeNukeConfirm()}
      role="button"
      tabindex="-1"
    >
      <div
        class="nuke-modal"
        on:click|stopPropagation
        on:keydown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuke-modal-title"
        tabindex="-1"
      >
        <div class="nuke-header">
          <h3 id="nuke-modal-title">☢️ Nuclear Option</h3>
          <button class="modal-close" on:click={closeNukeConfirm}>
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="nuke-body">
          <p class="nuke-warning">
            ⚠️ <strong>WARNING:</strong> This will permanently delete:
          </p>
          <ul class="nuke-list">
            <li>All users (except you)</li>
            <li>All readings from all users</li>
            <li>All decks from all users</li>
            <li>Your own readings and decks</li>
          </ul>
          <p class="nuke-warning">Only your admin account will remain.</p>
          <p class="nuke-instruction">
            Type <strong>DELETE EVERYTHING</strong> to confirm:
          </p>
          <input
            type="text"
            class="nuke-input"
            bind:value={nukeConfirmText}
            placeholder="DELETE EVERYTHING"
          />
        </div>
        <div class="nuke-actions">
          <button
            class="btn btn-small btn-danger"
            on:click={handleNuke}
            disabled={nukeConfirmText !== "DELETE EVERYTHING" || nukeLoading}
          >
            {nukeLoading ? "Deleting..." : "☢️ Delete Everything"}
          </button>
          <button
            class="btn btn-small btn-secondary"
            on:click={closeNukeConfirm}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Deployment Info Modal -->
{#if showDeploymentInfo}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal-overlay"
    on:click={closeDeploymentInfo}
    on:keydown={(e) => e.key === "Escape" && closeDeploymentInfo()}
    role="button"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="modal-content deployment-modal"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="deployment-modal-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h3 id="deployment-modal-title">
          <span class="material-symbols-outlined">cloud</span> Deployment Information
        </h3>
        <button
          class="btn-close"
          on:click={closeDeploymentInfo}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
      <div class="modal-body">
        {#if deploymentLoading}
          <div class="loading">
            <div class="loading-spinner"></div>
          </div>
        {:else}
          <pre class="deployment-content">{deploymentContent}</pre>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .admin-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
  }

  .admin-header {
    margin-bottom: 2rem;
  }

  .admin-header h2 {
    margin: 0;
    font-size: 2rem;
    color: var(--color-text-primary);
  }

  .admin-header-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .tab-content.hidden {
    display: none;
  }

  /* Nuclear option modal */
  .nuke-modal {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    max-width: 500px;
    width: 90%;
    box-shadow: var(--shadow-xl);
  }

  .nuke-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .nuke-header h3 {
    margin: 0;
    color: var(--color-danger);
    font-size: 1.5rem;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: var(--color-text-light);
    cursor: pointer;
    line-height: 1;
  }

  .modal-close:hover {
    color: var(--color-text-primary);
  }

  .nuke-body {
    padding: 1.5rem;
  }

  .nuke-warning {
    margin: 0 0 1rem 0;
    color: var(--color-warning-hover);
    background: rgba(255, 193, 7, 0.1);
    padding: 0.75rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-warning);
  }

  .nuke-list {
    margin: 1rem 0;
    padding-left: 2rem;
    color: var(--color-text-secondary);
  }

  .nuke-list li {
    margin: 0.5rem 0;
  }

  .nuke-instruction {
    margin: 1.5rem 0 0.5rem 0;
    font-weight: 500;
  }

  .nuke-input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--color-danger);
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-family: monospace;
  }

  .nuke-input:focus {
    outline: none;
    border-color: var(--color-danger-hover);
  }

  .nuke-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .nuke-button {
    align-self: flex-start;
  }

  /* Deployment modal styles */
  .deployment-modal {
    max-width: 800px;
    max-height: 85vh;
  }

  .deployment-content {
    background: var(--color-bg-dark);
    color: #a8e6cf;
    padding: 1.5rem;
    border-radius: var(--radius-md);
    font-family: "Courier New", monospace;
    font-size: 1rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    margin: 0;
  }

  @media (max-width: 768px) {
    .admin-container {
      padding: 1rem;
    }
  }
</style>
