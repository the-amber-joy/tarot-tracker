<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../stores/authStore";

  type UserStats = {
    id: number;
    username: string;
    display_name: string;
    created_at: string;
    deck_count: number;
    reading_count: number;
    storage_bytes: number;
  };

  type SortField = 'username' | 'display_name' | 'created_at' | 'deck_count' | 'reading_count' | 'storage_bytes';
  type SortDirection = 'asc' | 'desc';

  let users: UserStats[] = [];
  let loading = true;
  let error = "";
  let resetUserId: number | null = null;
  let newPassword = "";
  let resetError = "";
  let deleteUserId: number | null = null;
  let toastMessage = "";
  let showToast = false;
  let sortField: SortField = 'username';
  let sortDirection: SortDirection = 'asc';
  let showNukeConfirm = false;
  let nukeConfirmText = "";
  let nukeLoading = false;
  let showPassword = false;

  $: adminUser = users.find(u => u.id === $authStore?.id);
  $: otherUsers = users.filter(u => u.id !== $authStore?.id).sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return aVal.localeCompare(bVal) * multiplier;
    }
    return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * multiplier;
  });

  onMount(async () => {
    if (!$authStore?.is_admin) {
      navigate("/");
      return;
    }
    await loadUsers();
  });

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

  function startReset(userId: number) {
    resetUserId = userId;
    newPassword = "";
    resetError = "";
    showPassword = false;
  }

  function cancelReset() {
    resetUserId = null;
    newPassword = "";
    resetError = "";
  }

  function displayToast(message: string) {
    toastMessage = message;
    showToast = true;
    setTimeout(() => {
      showToast = false;
    }, 3000);
  }

  async function handleResetPassword(userId: number) {
    resetError = "";

    if (newPassword.length < 6) {
      resetError = "Password must be at least 6 characters";
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const user = users.find(u => u.id === userId);
      displayToast(`Password reset successfully for ${user?.username}`);
      cancelReset();
    } catch (e: any) {
      resetError = e.message;
    }
  }

  function confirmDelete(userId: number) {
    deleteUserId = userId;
  }

  function cancelDelete() {
    deleteUserId = null;
  }

  async function handleDeleteUser(userId: number) {
    const user = users.find((u) => u.id === userId);
    const username = user?.username;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      // Remove user from list
      users = users.filter((u) => u.id !== userId);
      deleteUserId = null;
      displayToast(`User ${username} has been deleted`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
      deleteUserId = null;
    }
  }

  function goBack() {
    navigate("/");
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
  }

  function getSortIcon(field: SortField): string {
    if (sortField !== field) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
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
  {#if showToast}
    <div class="toast success-toast">
      ✓ {toastMessage}
    </div>
  {/if}

  <div class="admin-header">
    <button class="back-button" on:click={goBack}>← Back to Home</button>
    <h2>🔧 Admin Panel</h2>
    <button class="btn-danger nuke-button" on:click={openNukeConfirm}>
      ☢️ Nuclear Option
    </button>
  </div>

  {#if loading}
    <div class="loading">Loading users...</div>
  {:else if error}
    <div class="error-message">{error}</div>
  {:else}
    {#if adminUser}
      <div class="admin-user-section">
        <h3>Your Account</h3>
        <div class="admin-user-card">
          <div class="admin-user-info">
            <div><strong>Username:</strong> {adminUser.username}</div>
            <div><strong>Display Name:</strong> {adminUser.display_name || "-"}</div>
            <div><strong>Created:</strong> {formatDate(adminUser.created_at)}</div>
            <div><strong>Decks:</strong> {adminUser.deck_count}</div>
            <div><strong>Readings:</strong> {adminUser.reading_count}</div>
            <div><strong>Storage:</strong> {formatBytes(adminUser.storage_bytes)}</div>
          </div>
        </div>
      </div>
    {/if}

    {#if otherUsers.length > 0}
      <div class="other-users-section">
        <h3>Other Users</h3>
        <div class="users-table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th class="sortable" on:click={() => handleSort('username')}>
                  Username {getSortIcon('username')}
                </th>
                <th class="sortable" on:click={() => handleSort('display_name')}>
                  Display Name {getSortIcon('display_name')}
                </th>
                <th class="sortable" on:click={() => handleSort('created_at')}>
                  Created {getSortIcon('created_at')}
                </th>
                <th class="sortable" on:click={() => handleSort('deck_count')}>
                  Decks {getSortIcon('deck_count')}
                </th>
                <th class="sortable" on:click={() => handleSort('reading_count')}>
                  Readings {getSortIcon('reading_count')}
                </th>
                <th class="sortable" on:click={() => handleSort('storage_bytes')}>
                  Storage {getSortIcon('storage_bytes')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each otherUsers as user}
                <tr>
                  <td>{user.username}</td>
                  <td>{user.display_name || "-"}</td>
                  <td>{formatDate(user.created_at)}</td>
                  <td class="stat-cell">{user.deck_count}</td>
                  <td class="stat-cell">{user.reading_count}</td>
                  <td class="stat-cell">{formatBytes(user.storage_bytes)}</td>
                  <td>
                {#if user.id === $authStore?.id}
                  <span class="muted">-</span>
                {:else if deleteUserId === user.id}
                  <div class="delete-confirm">
                    <p class="warning-text">
                      ⚠️ Delete {user.username}?<br />
                      This will permanently delete:<br />
                      • {user.deck_count} deck(s)<br />
                      • {user.reading_count} reading(s)
                    </p>
                    <button
                      class="btn-small btn-danger"
                      on:click={() => handleDeleteUser(user.id)}
                    >
                      Yes, Delete
                    </button>
                    <button class="btn-small btn-secondary" on:click={cancelDelete}>
                      Cancel
                    </button>
                  </div>
                {:else if resetUserId === user.id}
                  <form class="reset-form" on:submit|preventDefault={() => handleResetPassword(user.id)}>
                    <div class="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        bind:value={newPassword}
                        placeholder="New password (6+ chars)"
                        class="reset-input"
                      />
                      <button 
                        type="button" 
                        class="password-toggle-btn"
                        on:click={() => showPassword = !showPassword}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        <span class="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <button
                      type="submit"
                      class="btn-small btn-primary"
                    >
                      Save
                    </button>
                    <button type="button" class="btn-small btn-secondary" on:click={cancelReset}>
                      Cancel
                    </button>
                    {#if resetError}
                      <div class="inline-error">{resetError}</div>
                    {/if}
                  </form>
                {:else}
                  <div class="action-buttons">
                    <button
                      class="btn-small btn-warning"
                      on:click={() => startReset(user.id)}
                    >
                      Reset Password
                    </button>
                    <button
                      class="btn-small btn-danger"
                      on:click={() => confirmDelete(user.id)}
                    >
                      Delete User
                    </button>
                  </div>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
  {:else}
    <div class="empty-state">No other users found</div>
  {/if}
{/if}

{#if showNukeConfirm}
  <div class="modal-overlay" on:click={closeNukeConfirm}>
    <div class="nuke-modal" on:click|stopPropagation>
      <div class="nuke-header">
        <h3>☢️ Nuclear Option</h3>
        <button class="modal-close" on:click={closeNukeConfirm}>&times;</button>
      </div>
      <div class="nuke-body">
        <p class="nuke-warning">⚠️ <strong>WARNING:</strong> This will permanently delete:</p>
        <ul class="nuke-list">
          <li>All users (except you)</li>
          <li>All readings from all users</li>
          <li>All decks from all users</li>
          <li>Your own readings and decks</li>
        </ul>
        <p class="nuke-warning">Only your admin account will remain.</p>
        <p class="nuke-instruction">Type <strong>DELETE EVERYTHING</strong> to confirm:</p>
        <input 
          type="text" 
          class="nuke-input" 
          bind:value={nukeConfirmText}
          placeholder="DELETE EVERYTHING"
          autofocus
        />
      </div>
      <div class="nuke-actions">
        <button 
          class="btn-small btn-danger" 
          on:click={handleNuke}
          disabled={nukeConfirmText !== "DELETE EVERYTHING" || nukeLoading}
        >
          {nukeLoading ? "Deleting..." : "☢️ Delete Everything"}
        </button>
        <button class="btn-small btn-secondary" on:click={closeNukeConfirm}>
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

</div>

<style>
  .admin-container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
  }

  .toast {
    position: fixed;
    top: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }

  .success-toast {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .admin-header {
    margin-bottom: 2rem;
  }

  .back-button {
    background: none;
    border: none;
    color: #4a90e2;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
    display: inline-block;
  }

  .back-button:hover {
    text-decoration: underline;
  }

  .admin-header h2 {
    margin: 0;
    font-size: 2rem;
    color: #333;
  }

  .admin-user-section {
    margin-bottom: 3rem;
  }

  .admin-user-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #333;
  }

  .admin-user-card {
    background: #f0f7ff;
    border: 2px solid #4a90e2;
    border-radius: 8px;
    padding: 1.5rem;
  }

  .admin-user-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .admin-user-info div {
    color: #333;
  }

  .other-users-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: #333;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #666;
    font-size: 1.1rem;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .users-table-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow-x: auto;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table thead {
    background: #f8f9fa;
    border-bottom: 2px solid #dee2e6;
  }

  .users-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #495057;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  .sortable:hover {
    background-color: #e9ecef;
  }

  .users-table td {
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
    vertical-align: middle;
  }

  .users-table tbody tr:hover {
    background-color: #f8f9fa;
  }

  .stat-cell {
    font-weight: 600;
    color: #4a90e2;
  }

  .muted {
    color: #999;
  }

  .reset-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .password-input-wrapper {
    position: relative;
    display: inline-block;
  }

  .reset-input {
    padding: 0.4rem 2.5rem 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.85rem;
    min-width: 150px;
  }

  .password-toggle-btn {
    position: absolute;
    right: 0.25rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1rem;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .password-toggle-btn:hover {
    opacity: 1;
  }

  .btn-small {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #4a90e2;
    color: white;
  }

  .btn-primary:hover {
    background: #357abd;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .btn-warning {
    background: #ffc107;
    color: #000;
  }

  .btn-warning:hover {
    background: #e0a800;
  }

  .password-input-wrapper input[type="text"] {
    font-family: ui-monospace, 'Cascadia Code', 'Courier New', Courier, monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  .btn-danger {
    background: #dc3545;
    color: white;
  }

  .btn-danger:hover {
    background: #c82333;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .delete-confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
  }

  .warning-text {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #856404;
  }

  .inline-error {
    color: #c33;
    font-size: 0.85rem;
    width: 100%;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: #999;
  }

  /* Nuclear option modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .nuke-modal {
    background: white;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .nuke-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #ddd;
  }

  .nuke-header h3 {
    margin: 0;
    color: #dc3545;
    font-size: 1.5rem;
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    color: #999;
    cursor: pointer;
    line-height: 1;
  }

  .modal-close:hover {
    color: #333;
  }

  .nuke-body {
    padding: 1.5rem;
  }

  .nuke-warning {
    margin: 0 0 1rem 0;
    color: #856404;
    background: #fff3cd;
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid #ffc107;
  }

  .nuke-list {
    margin: 1rem 0;
    padding-left: 2rem;
    color: #666;
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
    border: 2px solid #dc3545;
    border-radius: 4px;
    font-size: 1rem;
    font-family: monospace;
  }

  .nuke-input:focus {
    outline: none;
    border-color: #c82333;
  }

  .nuke-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: 1.5rem;
    border-top: 1px solid #ddd;
  }

  .nuke-button {
    align-self: flex-start;
  }

  @media (max-width: 768px) {
    .admin-container {
      padding: 1rem;
    }

    .users-table {
      font-size: 0.85rem;
    }

    .users-table th,
    .users-table td {
      padding: 0.75rem 0.5rem;
    }

    .reset-form {
      flex-direction: column;
      align-items: stretch;
    }

    .reset-input {
      min-width: unset;
    }
  }
</style>
