<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../../stores/authStore";
  import Toast from "../components/Toast.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";

  type Deck = {
    id: number;
    name: string;
    notes?: string;
  };

  type Reading = {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  };

  // Map spread template IDs to display names
  const spreadTemplates: Record<string, string> = {
    "celtic-cross": "Celtic Cross",
    "five-card": "Five Card Spread",
    horseshoe: "Horseshoe Spread",
    relationship: "Relationship Spread",
    "single-card": "Single Card",
    "three-card": "Three Card Spread",
    custom: "Custom Spread",
  };

  function getSpreadLayout(templateId?: string): string {
    if (!templateId) return "-";
    return spreadTemplates[templateId] || "-";
  }

  let activeTab: "profile" | "decks" | "readings" | "reports" = "profile";
  let display_name = $authStore?.display_name || $authStore?.username || "";
  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";

  let profileError = "";
  let profileSuccess = "";
  let passwordError = "";
  let passwordSuccess = "";
  let profileLoading = false;
  let passwordLoading = false;
  let showCurrentPassword = false;
  let showNewPassword = false;
  let showConfirmPassword = false;

  let decks: Deck[] = [];
  let newDeckName = "";
  let newDeckNotes = "";
  let editingDeckId: number | null = null;
  let editDeckName = "";
  let editDeckNotes = "";
  let expandedDeckNotes: Set<number> = new Set();
  let showAddDeckForm = false;

  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";

  let showDeleteModal = false;
  let deckToDelete: { id: number; name: string } | null = null;

  let showDeleteReadingModal = false;
  let readingToDelete: { id: number; name: string } | null = null;

  let showValidationModal = false;
  let validationMessage = "";

  let readings: Reading[] = [];
  let mounted = false;

  // Card frequency data
  type CardFrequency = {
    card_name: string;
    count: number;
    suit?: string;
  };
  let cardFrequency: CardFrequency[] = [];
  let selectedSuit: string = "All";

  // Suit distribution data
  type SuitDistribution = {
    "Major Arcana": number;
    Wands: number;
    Cups: number;
    Swords: number;
    Pentacles: number;
  };
  let suitDistribution: SuitDistribution | null = null;

  // Map card names to suits
  const cardSuits: Record<string, string> = {
    "Major Arcana": "Major Arcana",
  };

  // Initialize card suits mapping
  const tarotCards = ["Wands", "Cups", "Swords", "Pentacles"];

  tarotCards.forEach((suit) => {
    for (let i = 1; i <= 14; i++) {
      const names =
        i === 1
          ? ["Ace"]
          : i === 11
            ? ["Page"]
            : i === 12
              ? ["Knight"]
              : i === 13
                ? ["Queen"]
                : i === 14
                  ? ["King"]
                  : [i.toString()];
      names.forEach((name) => {
        cardSuits[`${name} of ${suit}`] = suit;
      });
    }
  });

  // Major Arcana cards
  const majorArcana = [
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
  ];
  majorArcana.forEach((card) => {
    cardSuits[card] = "Major Arcana";
  });

  $: filteredCardFrequency = cardFrequency
    .map((card) => ({
      ...card,
      suit: cardSuits[card.card_name] || "Unknown",
    }))
    .filter((card) => selectedSuit === "All" || card.suit === selectedSuit)
    .sort((a, b) => b.count - a.count);

  $: totalCards = filteredCardFrequency.reduce(
    (sum, card) => sum + card.count,
    0,
  );

  // Calculate reading statistics
  $: readingStats = (() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisYearReadings = readings.filter((r) => {
      const readingDate = new Date(r.date);
      return readingDate.getFullYear() === currentYear;
    });

    const thisMonthReadings = readings.filter((r) => {
      const readingDate = new Date(r.date);
      return (
        readingDate.getFullYear() === currentYear &&
        readingDate.getMonth() === currentMonth
      );
    });

    // Find most used deck
    const deckCounts: Record<string, number> = {};
    readings.forEach((r) => {
      if (r.deck_name) {
        deckCounts[r.deck_name] = (deckCounts[r.deck_name] || 0) + 1;
      }
    });
    const mostUsedDeck = Object.keys(deckCounts).length
      ? Object.entries(deckCounts).sort((a, b) => b[1] - a[1])[0]
      : null;

    // Calculate average per month (all time)
    let avgPerMonth = 0;
    if (readings.length > 0) {
      const dates = readings.map((r) => new Date(r.date).getTime());
      const earliest = new Date(Math.min(...dates));
      const latest = new Date(Math.max(...dates));
      const monthsDiff =
        (latest.getFullYear() - earliest.getFullYear()) * 12 +
        (latest.getMonth() - earliest.getMonth()) +
        1;
      avgPerMonth = readings.length / monthsDiff;
    }

    return {
      total: readings.length,
      thisYear: thisYearReadings.length,
      thisMonth: thisMonthReadings.length,
      mostUsedDeck: mostUsedDeck
        ? { name: mostUsedDeck[0], count: mostUsedDeck[1] }
        : null,
      avgPerMonth: avgPerMonth,
    };
  })();

  onMount(async () => {
    // Restore the active tab from localStorage
    const savedTab = localStorage.getItem("profileActiveTab");
    if (
      savedTab === "profile" ||
      savedTab === "decks" ||
      savedTab === "readings" ||
      savedTab === "reports"
    ) {
      activeTab = savedTab;
    }

    await Promise.all([loadDecks(), loadReadings(), loadCardFrequency(), loadSuitDistribution()]);
    mounted = true;
  });

  // Save active tab when it changes (only after mount)
  $: if (mounted && activeTab) {
    localStorage.setItem("profileActiveTab", activeTab);
  }

  async function loadDecks() {
    try {
      const response = await fetch("/api/decks");
      decks = await response.json();
    } catch (error) {
      console.error("Error loading decks:", error);
    }
  }

  async function loadCardFrequency() {
    try {
      const response = await fetch("/api/stats/card-frequency");
      cardFrequency = await response.json();
    } catch (error) {
      console.error("Error loading card frequency:", error);
    }
  }

  async function loadSuitDistribution() {
    try {
      const response = await fetch("/api/stats/suit-distribution");
      suitDistribution = await response.json();
    } catch (error) {
      console.error("Error loading suit distribution:", error);
    }
  }

  async function loadReadings() {
    try {
      const response = await fetch("/api/readings");
      const allReadings = await response.json();
      readings = allReadings.sort((a: Reading, b: Reading) => {
        const dateA = new Date(a.date + " " + a.time);
        const dateB = new Date(b.date + " " + b.time);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Error loading readings:", error);
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

  async function handleAddDeck() {
    if (!newDeckName.trim()) {
      validationMessage = "Please enter a deck name.";
      showValidationModal = true;
      return;
    }

    try {
      const response = await fetch("/api/decks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDeckName.trim(),
          notes: newDeckNotes.trim() || null,
        }),
      });

      if (response.ok) {
        const deckName = newDeckName.trim();
        newDeckName = "";
        newDeckNotes = "";
        showAddDeckForm = false;
        await loadDecks();
        displayToast(`${deckName} added!`);
      } else {
        const error = await response.text();
        displayToast(`Failed to add deck: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error adding deck:", error);
      displayToast("Error adding deck. Please try again.", "error");
    }
  }

  async function handleDeleteDeck(deckId: number, deckName: string) {
    deckToDelete = { id: deckId, name: deckName };
    showDeleteModal = true;
  }

  async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
      const response = await fetch(`/api/decks/${deckToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDecks();
        displayToast(`${deckToDelete.name} deleted`);
      } else {
        const error = await response.text();
        displayToast(`Failed to delete deck: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
      displayToast("Error deleting deck. Please try again.", "error");
    } finally {
      showDeleteModal = false;
      deckToDelete = null;
    }
  }

  function cancelDeleteDeck() {
    showDeleteModal = false;
    deckToDelete = null;
  }

  function startEditDeck(deck: Deck) {
    editingDeckId = deck.id;
    editDeckName = deck.name;
    editDeckNotes = deck.notes || "";
  }

  function cancelEditDeck() {
    editingDeckId = null;
    editDeckName = "";
    editDeckNotes = "";
  }

  function toggleDeckNotes(deckId: number) {
    if (expandedDeckNotes.has(deckId)) {
      expandedDeckNotes.delete(deckId);
    } else {
      expandedDeckNotes.add(deckId);
    }
    expandedDeckNotes = expandedDeckNotes; // Trigger reactivity
  }

  async function handleUpdateDeck(deckId: number) {
    if (!editDeckName.trim()) {
      validationMessage = "Please enter a deck name.";
      showValidationModal = true;
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editDeckName.trim(),
          notes: editDeckNotes.trim() || null,
        }),
      });

      if (response.ok) {
        editingDeckId = null;
        editDeckName = "";
        editDeckNotes = "";
        await loadDecks();
      } else {
        const error = await response.text();
        displayToast(`Failed to update deck: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error updating deck:", error);
      displayToast("Error updating deck. Please try again.", "error");
    }
  }

  async function handleDeleteReading(readingId: number, spreadName: string) {
    readingToDelete = { id: readingId, name: spreadName };
    showDeleteReadingModal = true;
  }

  async function confirmDeleteReading() {
    if (!readingToDelete) return;

    try {
      const response = await fetch(`/api/readings/${readingToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadReadings();
        displayToast(`"${readingToDelete.name}" deleted`);
      } else {
        const error = await response.text();
        displayToast(`Failed to delete reading: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting reading:", error);
      displayToast("Error deleting reading. Please try again.", "error");
    } finally {
      showDeleteReadingModal = false;
      readingToDelete = null;
    }
  }

  function cancelDeleteReading() {
    showDeleteReadingModal = false;
    readingToDelete = null;
  }

  function formatDateTime(date: string, time: string): string {
    const dateObj = new Date(date + " " + time);
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dayOfWeek}, ${formattedDate} at ${formattedTime}`;
  }

  async function handleProfileUpdate(e: Event) {
    e.preventDefault();
    profileError = "";
    profileSuccess = "";
    profileLoading = true;

    try {
      await authStore.updateProfile(display_name);
      profileSuccess = "Profile updated successfully!";
      setTimeout(() => (profileSuccess = ""), 3000);
    } catch (e: any) {
      profileError = e.message;
    } finally {
      profileLoading = false;
    }
  }

  async function handlePasswordUpdate(e: Event) {
    e.preventDefault();
    passwordError = "";
    passwordSuccess = "";

    if (newPassword !== confirmPassword) {
      passwordError = "New passwords do not match";
      return;
    }

    if (newPassword.length < 6) {
      passwordError = "Password must be at least 6 characters";
      return;
    }

    passwordLoading = true;

    try {
      await authStore.updatePassword(currentPassword, newPassword);
      passwordSuccess = "Password updated successfully!";
      currentPassword = "";
      newPassword = "";
      confirmPassword = "";
      setTimeout(() => (passwordSuccess = ""), 3000);
    } catch (e: any) {
      passwordError = e.message;
    } finally {
      passwordLoading = false;
    }
  }

  function goBack() {
    navigate("/");
  }
</script>

<Toast bind:isVisible={showToast} message={toastMessage} type={toastType} />

<div class="profile-container">
  <div class="profile-header">
    <button class="back-button" on:click={goBack}>← Back to Home</button>
    <h2>{display_name}'s Profile</h2>
  </div>

  <div class="tabs">
    <button
      class="tab"
      class:active={activeTab === "profile"}
      on:click={() => (activeTab = "profile")}
    >
      Account
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
      class:active={activeTab === "readings"}
      on:click={() => (activeTab = "readings")}
    >
      Readings
    </button>
    <button
      class="tab"
      class:active={activeTab === "reports"}
      on:click={() => (activeTab = "reports")}
    >
      Reports
    </button>
  </div>

  <div class="profile-content">
    {#if activeTab === "profile"}
      <section class="profile-section">
        <h3>Your Name</h3>
        <form on:submit={handleProfileUpdate}>
          <div class="form-group">
            <label for="username">Username (Login)</label>
            <input
              id="username"
              type="text"
              value={$authStore?.username}
              disabled
              class="disabled-input"
            />
            <small>Your username cannot be changed</small>
          </div>

          <div class="form-group">
            <label for="display_name">Display Name</label>
            <input
              id="display_name"
              type="text"
              bind:value={display_name}
              required
              placeholder="Enter display name"
              disabled={profileLoading}
            />
            <small>This is how your name will appear in the app</small>
          </div>

          {#if profileError}
            <div class="message-box error">{profileError}</div>
          {/if}

          {#if profileSuccess}
            <div class="message-box success">{profileSuccess}</div>
          {/if}

          <button
            type="submit"
            class="btn btn-primary"
            disabled={profileLoading}
          >
            {profileLoading ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      <!-- Password Change Section -->
      <section class="profile-section">
        <h3>Change Password</h3>
        <form on:submit={handlePasswordUpdate}>
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <div class="password-input-wrapper">
              <input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                bind:value={currentPassword}
                required
                placeholder="Enter current password"
                disabled={passwordLoading}
              />
              <button
                type="button"
                class="password-toggle-btn"
                on:click={() => (showCurrentPassword = !showCurrentPassword)}
                aria-label={showCurrentPassword
                  ? "Hide password"
                  : "Show password"}
                disabled={passwordLoading}
              >
                <span class="material-symbols-outlined">
                  {showCurrentPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <div class="password-input-wrapper">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                bind:value={newPassword}
                required
                placeholder="At least 6 characters"
                disabled={passwordLoading}
              />
              <button
                type="button"
                class="password-toggle-btn"
                on:click={() => (showNewPassword = !showNewPassword)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                disabled={passwordLoading}
              >
                <span class="material-symbols-outlined">
                  {showNewPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <div class="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                bind:value={confirmPassword}
                required
                placeholder="Re-enter new password"
                disabled={passwordLoading}
              />
              <button
                type="button"
                class="password-toggle-btn"
                on:click={() => (showConfirmPassword = !showConfirmPassword)}
                aria-label={showConfirmPassword
                  ? "Hide password"
                  : "Show password"}
                disabled={passwordLoading}
              >
                <span class="material-symbols-outlined">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {#if passwordError}
            <div class="message-box error">{passwordError}</div>
          {/if}

          {#if passwordSuccess}
            <div class="message-box success">{passwordSuccess}</div>
          {/if}

          <button
            type="submit"
            class="btn btn-primary"
            disabled={passwordLoading}
          >
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    {:else if activeTab === "decks"}
      <!-- Deck Management Section -->
      <section class="profile-section">
        <h3>Manage Your Decks</h3>

        <button
          class="btn-toggle-form"
          on:click={() => (showAddDeckForm = !showAddDeckForm)}
        >
          <span class="material-symbols-outlined"
            >{showAddDeckForm ? "close" : "add"}</span
          >
          {showAddDeckForm ? "Cancel" : "Add New Deck"}
        </button>

        {#if showAddDeckForm}
          <div class="form-group" style="margin-top: 1rem;">
            <label for="newDeckName">Deck Name</label>
            <input
              type="text"
              id="newDeckName"
              bind:value={newDeckName}
              placeholder="Enter deck name..."
              on:keydown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleAddDeck()}
            />
            <label for="newDeckNotes" style="margin-top: 0.75rem;"
              >Notes (optional)</label
            >
            <textarea
              id="newDeckNotes"
              bind:value={newDeckNotes}
              placeholder="Add notes about this deck..."
              rows="2"
            ></textarea>
            <button
              class="btn btn-primary"
              on:click={handleAddDeck}
              style="margin-top: 0.5rem; width: 100%;">Add Deck</button
            >
          </div>
        {/if}

        <div class="deck-list">
          <h4>Your Decks ({decks.length})</h4>
          {#if decks.length === 0}
            <p class="empty-message">
              No decks added yet. Add your first deck above!
            </p>
          {:else}
            <ul>
              {#each decks as deck}
                <li class="deck-item">
                  {#if editingDeckId === deck.id}
                    <div class="deck-edit-form">
                      <input
                        type="text"
                        bind:value={editDeckName}
                        placeholder="Deck name"
                        class="deck-edit-input"
                      />
                      <textarea
                        bind:value={editDeckNotes}
                        placeholder="Notes (optional)"
                        rows="2"
                        class="deck-edit-textarea"
                      ></textarea>
                      <div class="deck-edit-actions">
                        <button
                          class="btn btn-primary"
                          on:click={() => handleUpdateDeck(deck.id)}
                          >Save</button
                        >
                        <button
                          class="btn btn-secondary"
                          on:click={cancelEditDeck}>Cancel</button
                        >
                      </div>
                    </div>
                  {:else}
                    <div class="deck-info">
                      <div>
                        <span class="deck-name">{deck.name}</span>
                        {#if deck.notes}
                          <p
                            class="deck-notes"
                            class:expanded={expandedDeckNotes.has(deck.id)}
                          >
                            {deck.notes}
                          </p>
                          <button
                            class="notes-toggle"
                            on:click={() => toggleDeckNotes(deck.id)}
                            type="button"
                          >
                            {expandedDeckNotes.has(deck.id) ? "Less" : "More"}
                          </button>
                        {/if}
                      </div>
                      <div class="deck-actions">
                        <button
                          class="btn btn-primary"
                          on:click={() => startEditDeck(deck)}
                          aria-label="Edit {deck.name}"
                        >
                          Edit
                        </button>
                        <button
                          class="btn btn-danger"
                          on:click={() => handleDeleteDeck(deck.id, deck.name)}
                          aria-label="Delete {deck.name}"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </section>
    {:else if activeTab === "readings"}
      <!-- Readings List Section -->
      <section class="profile-section">
        <h3>All Readings ({readings.length})</h3>

        {#if readings.length === 0}
          <p class="empty-message">
            No readings yet. Tap the + button to get started!
          </p>
        {:else}
          <ul class="readings-list">
            {#each readings as reading}
              <li class="reading-item">
                <button
                  class="reading-info"
                  on:click={() => navigate(`/reading/${reading.id}`)}
                >
                  <div>
                    <span class="reading-spread">
                      {#if reading.is_incomplete}
                        <span class="incomplete-icon" title="Incomplete"
                          >⚠️</span
                        >
                      {/if}
                      {reading.title}
                    </span>
                    <p class="reading-details">
                      {formatDateTime(reading.date, reading.time)}
                    </p>
                    <p class="reading-spread-layout">
                      {getSpreadLayout(reading.spread_template_id)}
                    </p>
                    <p class="reading-deck">
                      {reading.deck_name || "No Deck Specified"}
                    </p>
                  </div>
                </button>
                <div class="reading-actions">
                  <button
                    class="btn btn-primary"
                    on:click={() => navigate(`/reading/${reading.id}/edit`)}
                    aria-label="Edit {reading.title}"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    class="btn btn-danger"
                    on:click={() =>
                      handleDeleteReading(reading.id, reading.title)}
                    aria-label="Delete {reading.title}"
                  >
                    Delete
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else if activeTab === "reports"}
      <!-- Reports Section -->
      <section class="profile-section">
        <h3>Reading Statistics</h3>

        {#if readings.length === 0}
          <p class="empty-message">
            No readings yet. Create your first reading to see statistics!
          </p>
        {:else}
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{readingStats.total}</div>
              <div class="stat-label">Total Readings</div>
            </div>

            <div class="stat-card">
              <div class="stat-value">{readingStats.thisYear}</div>
              <div class="stat-label">This Year</div>
            </div>

            <div class="stat-card">
              <div class="stat-value">{readingStats.thisMonth}</div>
              <div class="stat-label">This Month</div>
            </div>

            <div class="stat-card">
              <div class="stat-value">
                {readingStats.avgPerMonth.toFixed(1)}
              </div>
              <div class="stat-label">Avg Per Month</div>
            </div>
          </div>

          {#if readingStats.mostUsedDeck}
            <div class="most-used-deck">
              <h4>Most Used Deck</h4>
              <div class="deck-stat">
                <span class="deck-name">{readingStats.mostUsedDeck.name}</span>
                <span class="deck-count"
                  >{readingStats.mostUsedDeck.count}
                  {readingStats.mostUsedDeck.count === 1
                    ? "reading"
                    : "readings"}</span
                >
              </div>
            </div>
          {/if}

          <!-- Card Frequency Section -->
          {#if cardFrequency.length > 0}
            <div class="card-frequency-section">
              <div class="section-header">
                <h4>Card Frequency</h4>
                <div class="suit-filter">
                  <select bind:value={selectedSuit}>
                    <option value="All">All Cards</option>
                    <option value="Major Arcana">Major Arcana</option>
                    <option value="Wands">Wands</option>
                    <option value="Cups">Cups</option>
                    <option value="Swords">Swords</option>
                    <option value="Pentacles">Pentacles</option>
                  </select>
                </div>
              </div>

              <div class="card-frequency-table">
                <table>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Count</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each filteredCardFrequency.slice(0, 20) as card}
                      <tr>
                        <td class="card-name">{card.card_name}</td>
                        <td class="card-count">{card.count}</td>
                        <td class="card-percentage">
                          {((card.count / totalCards) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
                {#if filteredCardFrequency.length > 20}
                  <p class="table-note">
                    Showing top 20 of {filteredCardFrequency.length} cards
                  </p>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Suit Distribution Section -->
          {#if suitDistribution}
            <div class="suit-distribution-section">
              <h4>Suit Distribution</h4>
              <div class="suit-bars">
                {#each Object.entries(suitDistribution) as [suit, count]}
                  {@const total = Object.values(suitDistribution).reduce((sum, val) => sum + val, 0)}
                  {@const percentage = total > 0 ? (count / total) * 100 : 0}
                  <div class="suit-bar-container">
                    <div class="suit-bar-label">
                      <span class="suit-name">{suit}</span>
                      <span class="suit-count">{count}</span>
                    </div>
                    <div class="suit-bar-track">
                      <div 
                        class="suit-bar-fill" 
                        class:major-arcana={suit === "Major Arcana"}
                        class:wands={suit === "Wands"}
                        class:cups={suit === "Cups"}
                        class:swords={suit === "Swords"}
                        class:pentacles={suit === "Pentacles"}
                        style="width: {percentage}%"
                      >
                        <span class="suit-percentage">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </section>
    {/if}
  </div>
</div>

<ConfirmModal
  bind:isOpen={showDeleteModal}
  title="Delete Deck"
  message="Are you sure you want to delete <strong>{deckToDelete?.name}</strong>?"
  confirmText="Delete"
  cancelText="Cancel"
  isDanger={true}
  onConfirm={confirmDeleteDeck}
  onCancel={cancelDeleteDeck}
/>

<ConfirmModal
  bind:isOpen={showDeleteReadingModal}
  title="Delete Reading"
  message="Are you sure you want to delete <strong>{readingToDelete?.name}</strong>?"
  confirmText="Delete"
  cancelText="Cancel"
  isDanger={true}
  onConfirm={confirmDeleteReading}
  onCancel={cancelDeleteReading}
/>

<ConfirmModal
  bind:isOpen={showValidationModal}
  title="Validation Error"
  message={validationMessage}
  confirmText="OK"
  isAlert={true}
  onConfirm={() => (showValidationModal = false)}
/>

<style>
  .profile-container {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .profile-header {
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

  .profile-header h2 {
    margin: 0;
    font-size: 2rem;
    color: #333;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    border-bottom: 2px solid var(--color-border);
    margin-bottom: 0.25rem;
  }

  .tab {
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: var(--transition-normal);
    position: relative;
    top: 2px;
  }

  .tab:hover {
    color: var(--color-primary);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-section {
    background: var(--color-bg-section);
    padding: 1rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .profile-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.4rem;
    color: var(--color-text-secondary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .profile-section h4 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1.1rem;
    color: var(--color-text-secondary);
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
  }

  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
    font-family: inherit;
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  input:disabled,
  .disabled-input {
    background-color: var(--color-bg-disabled);
    cursor: not-allowed;
    color: var(--color-secondary);
  }

  .password-input-wrapper input[type="text"] {
    font-family: ui-monospace, "Cascadia Code", "Courier New", Courier,
      monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }

  .btn-toggle-form {
    padding: 10px 20px;
    background-color: var(--color-bg-section);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-normal);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-toggle-form:hover {
    background-color: var(--color-bg-hover);
    border-color: var(--color-text-secondary);
  }

  .btn-toggle-form .material-symbols-outlined {
    font-size: 20px;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
  }

  .deck-list {
    margin-top: 1.5rem;
  }

  .deck-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .deck-item {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: 0.5rem;
    transition: var(--transition-fast);
  }

  .deck-item:hover {
    box-shadow: var(--shadow-md);
  }

  .deck-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    width: 100%;
  }

  .deck-info > div:first-child {
    flex: 1;
  }

  .deck-name {
    font-size: 1rem;
    color: var(--color-text-primary);
    font-weight: 500;
    display: block;
  }

  .deck-notes {
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    white-space: pre-wrap;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .deck-notes.expanded {
    display: block;
    line-clamp: unset;
    -webkit-line-clamp: unset;
  }

  .notes-toggle {
    background: none;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0;
    margin-top: 0.25rem;
    text-decoration: underline;
    transition: var(--transition-fast);
  }

  .notes-toggle:hover {
    color: var(--color-text-secondary);
  }

  .deck-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .deck-edit-form {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .deck-edit-input,
  .deck-edit-textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
  }

  .deck-edit-textarea {
    font-family: inherit;
    resize: vertical;
  }

  .deck-edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .empty-message {
    color: var(--color-text-secondary);
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }

  .readings-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .reading-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: 0.5rem;
    transition: var(--transition-fast);
    overflow: hidden;
  }

  .reading-item:hover {
    box-shadow: var(--shadow-md);
  }

  .reading-info {
    flex: 1;
    text-align: left;
    padding: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .reading-info:hover {
    background-color: var(--color-bg-hover);
  }

  .reading-spread {
    font-size: 1rem;
    color: var(--color-text-primary);
    font-weight: 500;
    display: block;
    margin-bottom: 0.25rem;
  }

  .incomplete-icon {
    margin-right: 0.25rem;
  }

  .reading-details {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: var(--color-text-secondary);
  }

  .reading-spread-layout {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: var(--color-gradient-end);
    font-weight: 600;
    background: rgba(123, 44, 191, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-pill);
    display: inline-block;
  }

  .reading-deck {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .reading-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    flex-shrink: 0;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    text-align: center;
    transition: var(--transition-fast);
  }

  .stat-card:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .most-used-deck {
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .most-used-deck h4 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
    color: var(--color-text-secondary);
  }

  .deck-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
  }

  .deck-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .deck-count {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    background: var(--color-primary-light);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-pill);
  }

  .card-frequency-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .section-header h4 {
    margin: 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .suit-filter select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-white);
    color: var(--color-text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .suit-filter select:hover {
    border-color: var(--color-primary);
  }

  .suit-filter select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light);
  }

  .card-frequency-table {
    overflow-x: auto;
  }

  .card-frequency-table table {
    width: 100%;
    border-collapse: collapse;
  }

  .card-frequency-table thead {
    background: var(--color-bg-section);
    border-bottom: 2px solid var(--color-border);
  }

  .card-frequency-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .card-frequency-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-frequency-table tbody tr:hover {
    background: var(--color-bg-section);
  }

  .card-name {
    font-weight: 500;
    color: var(--color-text-primary);
  }

  .card-count {
    font-weight: 600;
    color: var(--color-primary);
    text-align: center;
  }

  .card-percentage {
    color: var(--color-text-secondary);
    text-align: right;
  }

  .table-note {
    margin-top: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    font-style: italic;
  }

  .suit-distribution-section {
    margin-top: 2rem;
    background: var(--color-bg-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .suit-distribution-section h4 {
    margin: 0 0 1.5rem 0;
    font-size: 1.2rem;
    color: var(--color-text-primary);
  }

  .suit-bars {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .suit-bar-container {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suit-bar-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suit-name {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .suit-count {
    font-weight: 500;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .suit-bar-track {
    height: 32px;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
    overflow: hidden;
    position: relative;
  }

  .suit-bar-fill {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.75rem;
    transition: width 0.5s ease-out;
    min-width: 50px;
  }

  .suit-bar-fill.major-arcana {
    background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%);
  }

  .suit-bar-fill.wands {
    background: linear-gradient(135deg, #e63946 0%, #f77f00 100%);
  }

  .suit-bar-fill.cups {
    background: linear-gradient(135deg, #2a9d8f 0%, #4ecdc4 100%);
  }

  .suit-bar-fill.swords {
    background: linear-gradient(135deg, #457b9d 0%, #5390d9 100%);
  }

  .suit-bar-fill.pentacles {
    background: linear-gradient(135deg, #e76f51 0%, #f4a261 100%);
  }

  .suit-percentage {
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    .profile-container {
      padding: 1rem;
    }

    .profile-header h2 {
      font-size: 1.5rem;
    }

    .tabs {
      gap: 0;
    }

    .tab {
      flex: 1;
      padding: 0.75rem 0.5rem;
      font-size: 0.9rem;
    }

    .deck-info {
      flex-direction: column;
      align-items: stretch;
    }

    .deck-actions {
      width: 100%;
      margin-top: 0.75rem;
    }

    .deck-actions .btn {
      flex: 1;
    }

    .deck-edit-actions {
      flex-direction: column;
    }

    .deck-edit-actions .btn {
      width: 100%;
    }

    .reading-item {
      flex-direction: column;
      align-items: stretch;
    }

    .reading-info {
      padding: 1rem;
    }

    .reading-actions {
      width: 100%;
      padding: 0.75rem 1rem 1rem 1rem;
      border-top: 1px solid #eee;
    }

    .reading-actions .btn {
      flex: 1;
    }
  }
</style>
