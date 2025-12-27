<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import Toast from "../components/Toast.svelte";

  type UserStats = {
    id: number;
    username: string;
    display_name: string;
    created_at: string;
    last_login: string | null;
    deck_count: number;
    reading_count: number;
    storage_bytes: number;
  };

  type Card = {
    id: number;
    name: string;
    number: number | null;
    suit: string | null;
    image_filename: string | null;
    element_name: string | null;
    element_polarity: string | null;
    zodiac_sign_name: string | null;
    zodiac_quality: string | null;
    planet_name: string | null;
    keywords: string | null;
  };

  type SortField =
    | "username"
    | "display_name"
    | "created_at"
    | "last_login"
    | "deck_count"
    | "reading_count"
    | "storage_bytes";
  type SortDirection = "asc" | "desc";

  let activeTab: "users" | "cards" = "users";
  let users: UserStats[] = [];
  let cards: Card[] = [];
  let loading = true;
  let cardsLoading = false;
  let error = "";
  let resetUserId: number | null = null;
  let newPassword = "";
  let resetError = "";
  let deleteUserId: number | null = null;
  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";
  let sortField: SortField = "username";
  let sortDirection: SortDirection = "asc";
  let showNukeConfirm = false;
  let nukeConfirmText = "";
  let nukeLoading = false;
  let showPassword = false;
  let showDeploymentInfo = false;
  let deploymentContent = "";
  let deploymentLoading = false;
  let mounted = false;

  // Card filters
  let numberFilter = "";
  let suitFilter = "";
  let elementFilter = "";
  let polarityFilter = "";
  let signFilter = "";
  let qualityFilter = "";
  let planetFilter = "";

  // Get unique values for filters
  $: uniqueNumbers = [
    ...new Set(cards.map((c) => c.number).filter((n) => n !== null)),
  ].sort((a, b) => a! - b!);

  $: uniqueSuits = [
    ...new Set(cards.map((c) => c.suit).filter((s) => s !== null)),
  ].sort();

  $: uniqueElements = [
    ...new Set(cards.map((c) => c.element_name).filter((e) => e !== null)),
  ].sort();

  $: uniquePolarities = [
    ...new Set(cards.map((c) => c.element_polarity).filter((p) => p !== null)),
  ].sort();

  $: uniqueSigns = [
    ...new Set(cards.map((c) => c.zodiac_sign_name).filter((z) => z !== null)),
  ].sort();

  $: uniqueQualities = [
    ...new Set(cards.map((c) => c.zodiac_quality).filter((q) => q !== null)),
  ].sort();

  $: uniquePlanets = [
    ...new Set(cards.map((c) => c.planet_name).filter((p) => p !== null)),
  ].sort();

  // Filter cards based on selections
  $: filteredCards = cards.filter((card) => {
    if (numberFilter && card.number?.toString() !== numberFilter) return false;
    if (suitFilter && card.suit !== suitFilter) return false;
    if (elementFilter && card.element_name !== elementFilter) return false;
    if (polarityFilter && card.element_polarity !== polarityFilter)
      return false;
    if (signFilter && card.zodiac_sign_name !== signFilter) return false;
    if (qualityFilter && card.zodiac_quality !== qualityFilter) return false;
    if (planetFilter && card.planet_name !== planetFilter) return false;
    return true;
  });

  function clearCardFilters() {
    numberFilter = "";
    suitFilter = "";
    elementFilter = "";
    polarityFilter = "";
    signFilter = "";
    qualityFilter = "";
    planetFilter = "";
  }

  function toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
      [10, "X"],
      [9, "IX"],
      [5, "V"],
      [4, "IV"],
      [1, "I"],
    ];

    if (num === 0) return "0";

    let result = "";
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  function formatCardName(card: Card): string {
    // Major Arcana cards have no suit or suit is "Major Arcana"
    if (
      (card.suit === null || card.suit === "Major Arcana") &&
      card.number !== null
    ) {
      return `${card.name} (${toRoman(card.number)})`;
    }
    return card.name;
  }

  $: adminUser = users.find((u) => u.id === $authStore?.id);
  $: otherUsers = users
    .filter((u) => u.id !== $authStore?.id)
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const multiplier = sortDirection === "asc" ? 1 : -1;

      // Handle null values (put them at the end)
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * multiplier;
      }
      return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * multiplier;
    });

  onMount(async () => {
    if (!$authStore?.is_admin) {
      navigate("/");
      return;
    }

    // Restore the active tab from localStorage
    const savedTab = localStorage.getItem("adminActiveTab");
    if (savedTab === "users" || savedTab === "cards") {
      activeTab = savedTab;
    }

    await loadUsers();

    // Load cards if that tab was active
    if (activeTab === "cards") {
      await loadCards();
    }

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

  async function loadCards() {
    cardsLoading = true;
    try {
      const response = await fetch("/api/admin/cards");
      if (!response.ok) {
        throw new Error("Failed to load cards");
      }
      cards = await response.json();
    } catch (e: any) {
      displayToast("Failed to load cards: " + e.message, "error");
    } finally {
      cardsLoading = false;
    }
  }

  function handleTabChange(tab: "users" | "cards") {
    activeTab = tab;
    if (tab === "cards" && cards.length === 0) {
      loadCards();
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
      displayToast(`Error: ${e.message}`, "error");
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
    <button class="back-button" on:click={goBack}>← Back to Dashboard</button>
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
      on:click={() => handleTabChange("users")}
    >
      Users
    </button>
    <button
      class="tab"
      class:active={activeTab === "cards"}
      on:click={() => handleTabChange("cards")}
    >
      Cards Database
    </button>
  </div>

  {#if activeTab === "users"}
    {#if loading}
      <div class="loading">Loading users...</div>
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
                {adminUser.last_login
                  ? formatDate(adminUser.last_login)
                  : "Never"}
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
                  <th
                    class="sortable"
                    on:click={() => handleSort("display_name")}
                  >
                    Display Name {sortIcon("display_name")}
                  </th>
                  <th
                    class="sortable"
                    on:click={() => handleSort("created_at")}
                  >
                    Created {sortIcon("created_at")}
                  </th>
                  <th
                    class="sortable"
                    on:click={() => handleSort("last_login")}
                  >
                    Last Login {sortIcon("last_login")}
                  </th>
                  <th
                    class="sortable"
                    on:click={() => handleSort("deck_count")}
                  >
                    Decks {sortIcon("deck_count")}
                  </th>
                  <th
                    class="sortable"
                    on:click={() => handleSort("reading_count")}
                  >
                    Readings {sortIcon("reading_count")}
                  </th>
                  <th
                    class="sortable"
                    on:click={() => handleSort("storage_bytes")}
                  >
                    Storage {sortIcon("storage_bytes")}
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
                    <td
                      >{user.last_login
                        ? formatDate(user.last_login)
                        : "Never"}</td
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
                          <button
                            type="submit"
                            class="btn btn-small btn-primary"
                          >
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
                      <div class="user-name">{user.username}</div>
                      <div class="user-display-name">
                        {user.display_name || "-"}
                      </div>
                    </div>
                  </div>
                  <div class="user-stats">
                    <div class="stat-item">
                      <span class="stat-label">Created:</span>
                      <span class="stat-value"
                        >{formatDate(user.created_at)}</span
                      >
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
                      <span class="stat-value stat-cell">{user.deck_count}</span
                      >
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Readings:</span>
                      <span class="stat-value stat-cell"
                        >{user.reading_count}</span
                      >
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
  {/if}

  {#if activeTab === "cards"}
    <div class="cards-section">
      <h3>Tarot Cards Database</h3>

      {#if cardsLoading}
        <div class="loading">Loading cards...</div>
      {:else if cards.length === 0}
        <div class="empty-state">No cards found in database</div>
      {:else}
        <div class="cards-count">
          Total Cards: {filteredCards.length}
          {#if filteredCards.length !== cards.length}
            (filtered from {cards.length})
          {/if}
        </div>

        <!-- Filters Section -->
        <div class="filters-section">
          <div class="controls">
            <select class="filter-select" bind:value={numberFilter}>
              <option value="">All Numbers</option>
              {#each uniqueNumbers as num}
                <option value={num?.toString()}>{num}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={suitFilter}>
              <option value="">All Suits</option>
              {#each uniqueSuits as suit}
                <option value={suit}>{suit}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={elementFilter}>
              <option value="">All Elements</option>
              {#each uniqueElements as element}
                <option value={element}>{element}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={polarityFilter}>
              <option value="">All Polarities</option>
              {#each uniquePolarities as polarity}
                <option value={polarity}>{polarity}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={signFilter}>
              <option value="">All Signs</option>
              {#each uniqueSigns as sign}
                <option value={sign}>{sign}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={qualityFilter}>
              <option value="">All Qualities</option>
              {#each uniqueQualities as quality}
                <option value={quality}>{quality}</option>
              {/each}
            </select>
            <select class="filter-select" bind:value={planetFilter}>
              <option value="">All Planets</option>
              {#each uniquePlanets as planet}
                <option value={planet}>{planet}</option>
              {/each}
            </select>
            {#if numberFilter || suitFilter || elementFilter || polarityFilter || signFilter || qualityFilter || planetFilter}
              <button class="clear-filters-btn" on:click={clearCardFilters}>
                Clear Filters
              </button>
            {/if}
          </div>
        </div>

        <div class="cards-table-container">
          <table class="cards-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Planet</th>
                <th>Element</th>
                <th>Polarity</th>
                <th>Sign</th>
                <th>Quality</th>
                <th>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredCards as card}
                <tr>
                  <td class="card-image-cell">
                    {#if card.image_filename}
                      <img
                        src="/tarot-images/{card.image_filename}"
                        alt={card.name}
                        class="card-thumbnail"
                      />
                    {:else}
                      <div class="card-placeholder">?</div>
                    {/if}
                  </td>
                  <td class="card-name-cell">{formatCardName(card)}</td>
                  <td>{card.planet_name || "-"}</td>
                  <td>{card.element_name || "-"}</td>
                  <td>{card.element_polarity || "-"}</td>
                  <td>{card.zodiac_sign_name || "-"}</td>
                  <td>{card.zodiac_quality || "-"}</td>
                  <td class="keywords-cell">{card.keywords || "-"}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards view -->
        <div class="cards-mobile">
          {#each filteredCards as card}
            <div class="card-mobile-item">
              <div class="card-mobile-header">
                {#if card.image_filename}
                  <img
                    src="/tarot-images/{card.image_filename}"
                    alt={card.name}
                    class="card-thumbnail-mobile"
                  />
                {/if}
                <span>{formatCardName(card)}</span>
              </div>
              <div class="card-mobile-details">
                {#if card.planet_name}
                  <div class="detail-item">
                    <span class="detail-label">Planet:</span>
                    <span class="detail-value">{card.planet_name}</span>
                  </div>
                {/if}
                {#if card.element_name}
                  <div class="detail-item">
                    <span class="detail-label">Element:</span>
                    <span class="detail-value">{card.element_name}</span>
                  </div>
                {/if}
                {#if card.element_polarity}
                  <div class="detail-item">
                    <span class="detail-label">Polarity:</span>
                    <span class="detail-value">{card.element_polarity}</span>
                  </div>
                {/if}
                {#if card.zodiac_sign_name}
                  <div class="detail-item">
                    <span class="detail-label">Sign:</span>
                    <span class="detail-value">{card.zodiac_sign_name}</span>
                  </div>
                {/if}
                {#if card.zodiac_quality}
                  <div class="detail-item">
                    <span class="detail-label">Quality:</span>
                    <span class="detail-value">{card.zodiac_quality}</span>
                  </div>
                {/if}
                {#if card.keywords}
                  <div class="detail-item">
                    <span class="detail-label">Keywords:</span>
                    <span class="detail-value">{card.keywords}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

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
          <button class="modal-close" on:click={closeNukeConfirm}
            ><span class="material-symbols-outlined">close</span></button
          >
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
  <div class="modal-overlay" on:click={closeDeploymentInfo}>
    <div class="modal-content deployment-modal" on:click|stopPropagation>
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
          <div class="loading">Loading deployment info...</div>
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

  .back-button {
    background: none;
    border: none;
    color: var(--color-primary);
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
    color: var(--color-text-primary);
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid var(--color-border);
    margin-bottom: 2rem;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    color: var(--color-text-secondary);
    border: none;
    border-bottom: 3px solid transparent;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: var(--transition-fast);
    margin-bottom: -2px;
  }

  .tab:hover {
    color: var(--color-text-primary);
    background: var(--color-bg-hover);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .tab:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

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

  .loading {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
  }

  .users-table-container {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow-x: auto;
    container-type: inline-size;
  }

  /* Default: hide cards, show table */
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

  .admin-header-buttons {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
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

  .deployment-modal .loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  /* Container query: show cards on narrow screens, hide table */
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

    .user-display-name {
      color: var(--color-text-secondary);
      font-size: 0.9rem;
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

  /* Cards Section Styles */
  .cards-section {
    margin-top: 2rem;
  }

  .cards-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .cards-count {
    margin-bottom: 1rem;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .cards-table-container {
    overflow-x: auto;
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .cards-table {
    width: 100%;
    border-collapse: collapse;
  }

  .cards-table thead {
    background: var(--color-bg-section);
    border-bottom: 2px solid var(--color-border);
  }

  .cards-table th {
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-heading);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  .cards-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .card-image-cell {
    width: 50px;
    padding: 0.5rem;
  }

  .card-thumbnail {
    width: 40px;
    height: 66px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: var(--shadow-sm);
  }

  .card-placeholder {
    width: 40px;
    height: 66px;
    background: linear-gradient(
      135deg,
      var(--color-bg-section) 0%,
      var(--color-border) 100%
    );
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-light);
    font-size: 0.75rem;
  }

  .cards-table tbody tr:hover {
    background-color: var(--color-bg-section);
  }

  .card-name-cell {
    font-weight: 600;
    color: var(--color-primary);
    white-space: nowrap;
  }

  .center-cell {
    text-align: center;
  }

  .keywords-cell {
    max-width: 300px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    white-space: normal;
  }

  .cards-mobile {
    display: none;
  }

  .card-mobile-item {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .card-mobile-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-thumbnail-mobile {
    width: 35px;
    height: 58px;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
  }

  .card-mobile-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .detail-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .detail-value {
    color: var(--color-text-primary);
    text-align: right;
  }

  /* Mobile view for cards */
  @media (max-width: 768px) {
    .cards-table-container {
      display: none;
    }

    .cards-mobile {
      display: block;
    }
  }
</style>
