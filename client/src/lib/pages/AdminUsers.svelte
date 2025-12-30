<script lang="ts">
  import { unverifiedCountStore } from "../../stores/adminStore";
  import { authStore } from "../../stores/authStore";
  import type { UserStats } from "../../types/admin";

  type SortField =
    | "username"
    | "display_name"
    | "created_at"
    | "last_login"
    | "deck_count"
    | "reading_count"
    | "storage_bytes";
  type SortDirection = "asc" | "desc";

  // Props
  export let users: UserStats[] = [];
  export let loading = true;
  export let error = "";
  export let onToast: (
    message: string,
    type: "success" | "error" | "info",
  ) => void;

  let resetUserId: number | null = null;
  let newPassword = "";
  let resetError = "";
  let editEmailUserId: number | null = null;
  let newEmail = "";
  let emailError = "";
  let deleteUserId: number | null = null;
  let verifyingUserId: number | null = null;
  let resendingUserId: number | null = null;
  let sortField: SortField = "username";
  let sortDirection: SortDirection = "asc";
  let showPassword = false;

  async function handleResendVerification(userId: number, email: string) {
    resendingUserId = userId;
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend verification email");
      }

      const user = users.find((u) => u.id === userId);
      onToast(`Verification email sent to ${user?.username}`, "success");
    } catch (e: any) {
      onToast(`Error: ${e.message}`, "error");
    } finally {
      resendingUserId = null;
    }
  }

  async function handleVerifyUser(userId: number) {
    verifyingUserId = userId;
    try {
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "PUT",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify user");
      }

      // Update the user in the list
      users = users.map((u) =>
        u.id === userId ? { ...u, email_verified: true } : u,
      );
      const user = users.find((u) => u.id === userId);
      onToast(`${user?.username} has been verified`, "success");

      // Update the header notification badge
      unverifiedCountStore.fetchUnverifiedCount();
    } catch (e: any) {
      onToast(`Error: ${e.message}`, "error");
    } finally {
      verifyingUserId = null;
    }
  }

  $: adminUser = users.find((u) => u.id === $authStore?.id);
  $: unverifiedUsers = users.filter(
    (u) => !u.email_verified && u.id !== $authStore?.id,
  );
  $: otherUsers = users
    .filter((u) => u.id !== $authStore?.id)
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === "asc" ? 1 : -1;

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * multiplier;
    });

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

  function startEditEmail(userId: number, currentEmail: string) {
    editEmailUserId = userId;
    newEmail = currentEmail || "";
    emailError = "";
  }

  function cancelEditEmail() {
    editEmailUserId = null;
    newEmail = "";
    emailError = "";
  }

  async function handleUpdateEmail(userId: number) {
    emailError = "";

    if (!newEmail.trim()) {
      emailError = "Email is required";
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      emailError = "Invalid email format";
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/email`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update email");
      }

      // Update the user in the list
      users = users.map((u) =>
        u.id === userId
          ? { ...u, email: data.email, email_verified: data.email_verified }
          : u,
      );
      const user = users.find((u) => u.id === userId);
      onToast(`Email updated for ${user?.username}`, "success");
      cancelEditEmail();

      // Update unverified count since email change marks user as unverified
      unverifiedCountStore.fetchUnverifiedCount();
    } catch (e: any) {
      emailError = e.message;
    }
  }

  async function handleResetPassword(userId: number) {
    resetError = "";

    if (newPassword.length < 6) {
      resetError = "Password must be at least 6 characters";
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/reset-password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const user = users.find((u) => u.id === userId);
      onToast(`Password reset successfully for ${user?.username}`, "success");
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

      users = users.filter((u) => u.id !== userId);
      deleteUserId = null;
      onToast(`User ${username} has been deleted`, "success");
    } catch (e: any) {
      onToast(`Error: ${e.message}`, "error");
      deleteUserId = null;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = "asc";
    }
  }

  $: sortIcon = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? "↑" : "↓";
  };
</script>

{#if loading}
  <div class="loading">
    <div class="loading-spinner"></div>
  </div>
{:else if error}
  <div class="message-box error">{error}</div>
{:else}
  {#if adminUser}
    <div class="admin-user-section">
      <h3>Your Account</h3>
      <div class="admin-user-card">
        <div class="admin-user-info">
          <div><strong>Username:</strong> {adminUser.username}</div>
          <div>
            <strong>Display Name:</strong>
            {adminUser.display_name || "-"}
          </div>
          <div>
            <strong>Created:</strong>
            {formatDate(adminUser.created_at)}
          </div>
          <div>
            <strong>Last Login:</strong>
            {adminUser.last_login ? formatDate(adminUser.last_login) : "Never"}
          </div>
          <div><strong>Decks:</strong> {adminUser.deck_count}</div>
          <div><strong>Readings:</strong> {adminUser.reading_count}</div>
          <div>
            <strong>Storage:</strong>
            {formatBytes(adminUser.storage_bytes)}
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if unverifiedUsers.length > 0}
    <div class="unverified-users-section">
      <h3>⚠️ Unverified Users ({unverifiedUsers.length})</h3>
      <div class="users-table-container">
        <table class="users-table unverified-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each unverifiedUsers as user}
              <tr>
                <td>{user.username}</td>
                <td>{user.email || "-"}</td>
                <td>{formatDate(user.created_at)}</td>
                <td>
                  <div class="action-buttons">
                    {#if user.email}
                      <button
                        class="btn btn-small btn-secondary"
                        on:click={() =>
                          handleResendVerification(user.id, user.email!)}
                        disabled={resendingUserId === user.id}
                      >
                        {resendingUserId === user.id
                          ? "Sending..."
                          : "📧 Resend"}
                      </button>
                    {/if}
                    <button
                      class="btn btn-small btn-success"
                      on:click={() => handleVerifyUser(user.id)}
                      disabled={verifyingUserId === user.id}
                    >
                      {verifyingUserId === user.id
                        ? "Verifying..."
                        : "✓ Verify"}
                    </button>
                    <button
                      class="btn btn-small btn-danger"
                      on:click={() => confirmDelete(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <!-- Mobile cards view for unverified users -->
        <div class="users-cards">
          {#each unverifiedUsers as user}
            <div class="user-card unverified-card">
              <div class="user-card-header">
                <div>
                  <div class="user-name">{user.username}</div>
                  <div class="user-email">{user.email || "No email"}</div>
                </div>
              </div>
              <div class="user-stats">
                <div class="stat-item">
                  <span class="stat-label">Created:</span>
                  <span class="stat-value">{formatDate(user.created_at)}</span>
                </div>
              </div>
              <div class="user-actions">
                {#if deleteUserId === user.id}
                  <div class="delete-confirm">
                    <p class="warning-text">
                      ⚠️ Delete {user.username}?
                    </p>
                    <button
                      class="btn btn-small btn-danger"
                      on:click={() => handleDeleteUser(user.id)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      class="btn btn-small btn-secondary"
                      on:click={cancelDelete}
                    >
                      Cancel
                    </button>
                  </div>
                {:else}
                  <div class="action-buttons">
                    {#if user.email}
                      <button
                        class="btn btn-small btn-secondary"
                        on:click={() =>
                          handleResendVerification(user.id, user.email!)}
                        disabled={resendingUserId === user.id}
                      >
                        {resendingUserId === user.id
                          ? "Sending..."
                          : "📧 Resend"}
                      </button>
                    {/if}
                    <button
                      class="btn btn-small btn-success"
                      on:click={() => handleVerifyUser(user.id)}
                      disabled={verifyingUserId === user.id}
                    >
                      {verifyingUserId === user.id
                        ? "Verifying..."
                        : "✓ Verify"}
                    </button>
                    <button
                      class="btn btn-small btn-danger"
                      on:click={() => confirmDelete(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
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
              <th class="sortable" on:click={() => handleSort("username")}>
                Username {sortIcon("username")}
              </th>
              <th>Email</th>
              <th class="sortable" on:click={() => handleSort("created_at")}>
                Created {sortIcon("created_at")}
              </th>
              <th class="sortable" on:click={() => handleSort("last_login")}>
                Last Login {sortIcon("last_login")}
              </th>
              <th class="sortable" on:click={() => handleSort("deck_count")}>
                Decks {sortIcon("deck_count")}
              </th>
              <th class="sortable" on:click={() => handleSort("reading_count")}>
                Readings {sortIcon("reading_count")}
              </th>
              <th class="sortable" on:click={() => handleSort("storage_bytes")}>
                Storage {sortIcon("storage_bytes")}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each otherUsers as user}
              <tr>
                <td>
                  {user.username}
                  {#if !user.email_verified}
                    <span class="unverified-badge" title="Email not verified"
                      >⚠️</span
                    >
                  {/if}
                </td>
                <td class="email-cell">
                  {#if editEmailUserId === user.id}
                    <form
                      class="email-form"
                      on:submit|preventDefault={() =>
                        handleUpdateEmail(user.id)}
                    >
                      <input
                        type="email"
                        bind:value={newEmail}
                        placeholder="user@example.com"
                        class="email-input"
                      />
                      <button type="submit" class="btn btn-small btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        class="btn btn-small btn-secondary"
                        on:click={cancelEditEmail}
                      >
                        Cancel
                      </button>
                      {#if emailError}
                        <div class="inline-error">{emailError}</div>
                      {/if}
                    </form>
                  {:else}
                    <span class="email-display">
                      {user.email || "-"}
                      <button
                        class="btn-icon"
                        on:click={() =>
                          startEditEmail(user.id, user.email || "")}
                        title="Edit email"
                      >
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                    </span>
                  {/if}
                </td>
                <td>{formatDate(user.created_at)}</td>
                <td
                  >{user.last_login ? formatDate(user.last_login) : "Never"}</td
                >
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
                        class="btn btn-small btn-danger"
                        on:click={() => handleDeleteUser(user.id)}
                      >
                        Yes, Delete
                      </button>
                      <button
                        class="btn btn-small btn-secondary"
                        on:click={cancelDelete}
                      >
                        Cancel
                      </button>
                    </div>
                  {:else if resetUserId === user.id}
                    <form
                      class="reset-form"
                      on:submit|preventDefault={() =>
                        handleResetPassword(user.id)}
                    >
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
                          on:click={() => (showPassword = !showPassword)}
                          aria-label={showPassword
                            ? "Hide password"
                            : "Show password"}
                        >
                          <span class="material-symbols-outlined">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      <button type="submit" class="btn btn-small btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        class="btn btn-small btn-secondary"
                        on:click={cancelReset}
                      >
                        Cancel
                      </button>
                      {#if resetError}
                        <div class="inline-error">{resetError}</div>
                      {/if}
                    </form>
                  {:else}
                    <div class="action-buttons">
                      {#if !user.email_verified}
                        <button
                          class="btn btn-small btn-success"
                          on:click={() => handleVerifyUser(user.id)}
                          disabled={verifyingUserId === user.id}
                        >
                          {verifyingUserId === user.id
                            ? "Verifying..."
                            : "Verify"}
                        </button>
                      {/if}
                      <button
                        class="btn btn-small btn-warning"
                        on:click={() => startReset(user.id)}
                      >
                        Reset Password
                      </button>
                      <button
                        class="btn btn-small btn-danger"
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
        <!-- Mobile cards view -->
        <div class="users-cards">
          {#each otherUsers as user}
            <div class="user-card">
              <div class="user-card-header">
                <div>
                  <div class="user-name">
                    {user.username}
                    {#if !user.email_verified}
                      <span class="unverified-badge" title="Email not verified"
                        >⚠️</span
                      >
                    {/if}
                  </div>
                </div>
              </div>
              <div class="user-stats">
                <div class="stat-item stat-item-full">
                  <span class="stat-label">Email:</span>
                  {#if editEmailUserId === user.id}
                    <form
                      class="email-form"
                      on:submit|preventDefault={() =>
                        handleUpdateEmail(user.id)}
                    >
                      <input
                        type="email"
                        bind:value={newEmail}
                        placeholder="user@example.com"
                        class="email-input"
                      />
                      <div class="email-form-buttons">
                        <button type="submit" class="btn btn-small btn-primary">
                          Save
                        </button>
                        <button
                          type="button"
                          class="btn btn-small btn-secondary"
                          on:click={cancelEditEmail}
                        >
                          Cancel
                        </button>
                      </div>
                      {#if emailError}
                        <div class="inline-error">{emailError}</div>
                      {/if}
                    </form>
                  {:else}
                    <span class="stat-value email-display">
                      {user.email || "-"}
                      <button
                        class="btn-icon"
                        on:click={() =>
                          startEditEmail(user.id, user.email || "")}
                        title="Edit email"
                      >
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                    </span>
                  {/if}
                </div>
                <div class="stat-item">
                  <span class="stat-label">Created:</span>
                  <span class="stat-value">{formatDate(user.created_at)}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Last Login:</span>
                  <span class="stat-value"
                    >{user.last_login
                      ? formatDate(user.last_login)
                      : "Never"}</span
                  >
                </div>
                <div class="stat-item">
                  <span class="stat-label">Decks:</span>
                  <span class="stat-value stat-cell">{user.deck_count}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Readings:</span>
                  <span class="stat-value stat-cell">{user.reading_count}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Storage:</span>
                  <span class="stat-value stat-cell"
                    >{formatBytes(user.storage_bytes)}</span
                  >
                </div>
              </div>
              <div class="user-actions">
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
                      class="btn btn-small btn-danger"
                      on:click={() => handleDeleteUser(user.id)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      class="btn btn-small btn-secondary"
                      on:click={cancelDelete}
                    >
                      Cancel
                    </button>
                  </div>
                {:else if resetUserId === user.id}
                  <form
                    class="reset-form"
                    on:submit|preventDefault={() =>
                      handleResetPassword(user.id)}
                  >
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
                        on:click={() => (showPassword = !showPassword)}
                        aria-label={showPassword
                          ? "Hide password"
                          : "Show password"}
                      >
                        <span class="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <button type="submit" class="btn btn-small btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      class="btn btn-small btn-secondary"
                      on:click={cancelReset}
                    >
                      Cancel
                    </button>
                    {#if resetError}
                      <div class="inline-error">{resetError}</div>
                    {/if}
                  </form>
                {:else}
                  <div class="action-buttons">
                    {#if !user.email_verified}
                      <button
                        class="btn btn-small btn-success"
                        on:click={() => handleVerifyUser(user.id)}
                        disabled={verifyingUserId === user.id}
                      >
                        {verifyingUserId === user.id
                          ? "Verifying..."
                          : "Verify"}
                      </button>
                    {/if}
                    <button
                      class="btn btn-small btn-warning"
                      on:click={() => startReset(user.id)}
                    >
                      Reset Password
                    </button>
                    <button
                      class="btn btn-small btn-danger"
                      on:click={() => confirmDelete(user.id)}
                    >
                      Delete User
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <div class="empty-state">No other users found</div>
  {/if}
{/if}

<style>
  .admin-user-section {
    margin-bottom: 3rem;
  }

  .admin-user-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .admin-user-card {
    background: var(--color-primary-light);
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .admin-user-info {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .admin-user-info div {
    color: var(--color-text-primary);
  }

  .other-users-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .unverified-users-section {
    margin-bottom: 2rem;
  }

  .unverified-users-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-warning-hover);
  }

  .unverified-table {
    border: 2px solid var(--color-warning);
  }

  .unverified-table thead {
    background: rgba(255, 193, 7, 0.15);
  }

  .unverified-card {
    border: 2px solid var(--color-warning) !important;
    background: rgba(255, 193, 7, 0.05) !important;
  }

  .user-email {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .users-table-container {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow-x: auto;
    container-type: inline-size;
  }

  .users-cards {
    display: none;
  }

  .users-table {
    width: 100%;
    border-collapse: collapse;
  }

  .users-table thead {
    background: var(--color-bg-section);
    border-bottom: 2px solid var(--color-border);
  }

  .users-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-heading);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
  }

  .sortable:hover {
    background-color: var(--color-bg-hover);
  }

  .users-table td {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .users-table tbody tr:hover {
    background-color: var(--color-bg-section);
  }

  .stat-cell {
    font-weight: 600;
    color: var(--color-primary);
  }

  .muted {
    color: var(--color-text-light);
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
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    min-width: 150px;
  }

  .password-input-wrapper input[type="text"] {
    font-family: ui-monospace, "Cascadia Code", "Courier New", Courier,
      monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-buttons .btn-small {
    flex: 1;
  }

  .email-cell {
    min-width: 200px;
  }

  .email-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .email-form {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .email-input {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 0.85rem;
    min-width: 180px;
  }

  .email-form-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-icon {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    color: var(--color-text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition:
      color 0.2s,
      background-color 0.2s;
  }

  .btn-icon:hover {
    color: var(--color-primary);
    background-color: var(--color-bg-hover);
  }

  .btn-icon .material-symbols-outlined {
    font-size: 1.1rem;
  }

  .delete-confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid var(--color-warning);
    border-radius: var(--radius-md);
  }

  .warning-text {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--color-warning-hover);
  }

  .inline-error {
    color: var(--color-error-text);
    font-size: 0.85rem;
    width: 100%;
  }

  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-light);
  }

  @container (max-width: 872px) {
    .users-table {
      display: none;
    }

    .users-cards {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .user-card {
      background: var(--color-bg-section);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }

    .user-card-header {
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--color-border);
    }

    .user-name {
      font-weight: 600;
      font-size: 1.1rem;
      color: var(--color-text-primary);
      margin-bottom: 0.25rem;
    }

    .user-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--color-text-secondary);
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 0.9rem;
      color: var(--color-text-primary);
    }

    .user-actions {
      padding-top: 0.75rem;
      border-top: 1px solid var(--color-border);
    }

    .user-actions .action-buttons {
      flex-direction: column;
    }

    .user-actions .action-buttons .btn {
      width: 100%;
    }

    .user-actions .reset-form {
      flex-direction: column;
    }

    .user-actions .reset-input {
      width: 100%;
    }

    .user-actions .delete-confirm .btn {
      width: 100%;
    }

    .stat-item-full {
      grid-column: 1 / -1;
      flex-direction: column;
      align-items: flex-start;
    }

    .stat-item-full .email-form {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }

    .stat-item-full .email-input {
      width: 100%;
      min-width: unset;
    }

    .stat-item-full .email-form-buttons {
      width: 100%;
    }

    .stat-item-full .email-form-buttons .btn {
      flex: 1;
    }
  }

  @media (max-width: 768px) {
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
