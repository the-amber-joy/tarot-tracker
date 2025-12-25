<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../stores/authStore";

  type Deck = {
    id: number;
    name: string;
    notes?: string;
  };

  type Reading = {
    id: number;
    date: string;
    time: string;
    spread_name: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  };

  // Map spread template IDs to display names
  const spreadTemplates: Record<string, string> = {
    'celtic-cross': 'Celtic Cross',
    'five-card': 'Five Card Spread',
    'horseshoe': 'Horseshoe Spread',
    'relationship': 'Relationship Spread',
    'single-card': 'Single Card',
    'three-card': 'Three Card Spread',
    'custom': 'Custom Spread'
  };
  
  function getSpreadLayout(templateId?: string): string {
    if (!templateId) return '-';
    return spreadTemplates[templateId] || '-';
  }

  let activeTab: "profile" | "decks" | "readings" = "profile";
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

  let readings: Reading[] = [];

  onMount(async () => {
    await Promise.all([loadDecks(), loadReadings()]);
  });

  async function loadDecks() {
    try {
      const response = await fetch("/api/decks");
      decks = await response.json();
    } catch (error) {
      console.error("Error loading decks:", error);
    }
  }

  async function loadReadings() {
    try {
      const response = await fetch("/api/readings");
      const allReadings = await response.json();
      readings = allReadings.sort((a: Reading, b: Reading) => {
        const dateA = new Date(a.date + ' ' + a.time);
        const dateB = new Date(b.date + ' ' + b.time);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Error loading readings:", error);
    }
  }

  async function handleAddDeck() {
    if (!newDeckName.trim()) {
      alert("Please enter a deck name.");
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
          notes: newDeckNotes.trim() || null
        }),
      });

      if (response.ok) {
        newDeckName = "";
        newDeckNotes = "";
        await loadDecks();
      } else {
        const error = await response.text();
        alert(`Failed to add deck: ${error}`);
      }
    } catch (error) {
      console.error("Error adding deck:", error);
      alert("Error adding deck. Please try again.");
    }
  }

  async function handleDeleteDeck(deckId: number, deckName: string) {
    if (!confirm(`Are you sure you want to delete "${deckName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDecks();
      } else {
        const error = await response.text();
        alert(`Failed to delete deck: ${error}`);
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
      alert("Error deleting deck. Please try again.");
    }
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
      alert("Please enter a deck name.");
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
          notes: editDeckNotes.trim() || null
        }),
      });

      if (response.ok) {
        editingDeckId = null;
        editDeckName = "";
        editDeckNotes = "";
        await loadDecks();
      } else {
        const error = await response.text();
        alert(`Failed to update deck: ${error}`);
      }
    } catch (error) {
      console.error("Error updating deck:", error);
      alert("Error updating deck. Please try again.");
    }
  }

  async function handleDeleteReading(readingId: number, spreadName: string) {
    if (!confirm(`Are you sure you want to delete "${spreadName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/readings/${readingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadReadings();
      } else {
        const error = await response.text();
        alert(`Failed to delete reading: ${error}`);
      }
    } catch (error) {
      console.error("Error deleting reading:", error);
      alert("Error deleting reading. Please try again.");
    }
  }

  function formatDateTime(date: string, time: string): string {
    const dateObj = new Date(date + ' ' + time);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
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
      setTimeout(() => profileSuccess = "", 3000);
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
      setTimeout(() => passwordSuccess = "", 3000);
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

<div class="profile-container">
  <div class="profile-header">
    <button class="back-button" on:click={goBack}>← Back to Home</button>
    <h2>{display_name}'s Profile</h2>
  </div>

  <div class="tabs">
    <button 
      class="tab" 
      class:active={activeTab === "profile"}
      on:click={() => activeTab = "profile"}
    >
      Account
    </button>
    <button 
      class="tab" 
      class:active={activeTab === "decks"}
      on:click={() => activeTab = "decks"}
    >
      Decks
    </button>
    <button 
      class="tab" 
      class:active={activeTab === "readings"}
      on:click={() => activeTab = "readings"}
    >
      Readings
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
            <div class="error-message">{profileError}</div>
          {/if}

          {#if profileSuccess}
            <div class="success-message">{profileSuccess}</div>
          {/if}

          <button type="submit" class="btn-primary" disabled={profileLoading}>
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
                on:click={() => showCurrentPassword = !showCurrentPassword}
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
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
                on:click={() => showNewPassword = !showNewPassword}
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
                on:click={() => showConfirmPassword = !showConfirmPassword}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                disabled={passwordLoading}
              >
                <span class="material-symbols-outlined">
                  {showConfirmPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {#if passwordError}
            <div class="error-message">{passwordError}</div>
          {/if}

          {#if passwordSuccess}
            <div class="success-message">{passwordSuccess}</div>
          {/if}

          <button type="submit" class="btn-primary" disabled={passwordLoading}>
            {passwordLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    {:else if activeTab === "decks"}
      <!-- Deck Management Section -->
      <section class="profile-section">
        <h3>Manage Your Decks</h3>
        
        <div class="form-group">
          <label for="newDeckName">Add New Deck</label>
          <input 
            type="text" 
            id="newDeckName" 
            bind:value={newDeckName}
            placeholder="Enter deck name..."
            on:keydown={(e) => e.key === "Enter" && !e.shiftKey && handleAddDeck()}
          />
          <label for="newDeckNotes" style="margin-top: 0.75rem;">Notes (optional)</label>
          <textarea
            id="newDeckNotes"
            bind:value={newDeckNotes}
            placeholder="Add notes about this deck..."
            rows="2"
          ></textarea>
          <button class="btn-add" on:click={handleAddDeck} style="margin-top: 0.5rem; width: 100%;">Add Deck</button>
        </div>
        
        <div class="deck-list">
          <h4>Your Decks ({decks.length})</h4>
          {#if decks.length === 0}
            <p class="empty-message">No decks added yet. Add your first deck above!</p>
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
                        <button class="btn-save" on:click={() => handleUpdateDeck(deck.id)}>Save</button>
                        <button class="btn-cancel" on:click={cancelEditDeck}>Cancel</button>
                      </div>
                    </div>
                  {:else}
                    <div class="deck-info">
                      <div>
                        <span class="deck-name">{deck.name}</span>
                        {#if deck.notes}
                          <p class="deck-notes" class:expanded={expandedDeckNotes.has(deck.id)}>{deck.notes}</p>
                          <button 
                            class="notes-toggle" 
                            on:click={() => toggleDeckNotes(deck.id)}
                            type="button"
                          >
                            {expandedDeckNotes.has(deck.id) ? 'Less' : 'More'}
                          </button>
                        {/if}
                      </div>
                      <div class="deck-actions">
                        <button 
                          class="btn-edit" 
                          on:click={() => startEditDeck(deck)}
                          aria-label="Edit {deck.name}"
                        >
                          Edit
                        </button>
                        <button 
                          class="btn-remove" 
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
          <p class="empty-message">No readings yet. Tap the + button to get started!</p>
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
                        <span class="incomplete-icon" title="Incomplete">⚠️</span>
                      {/if}
                      {reading.spread_name}
                    </span>
                    <p class="reading-details">{formatDateTime(reading.date, reading.time)}</p>
                    <p class="reading-spread-layout">{getSpreadLayout(reading.spread_template_id)}</p>
                    <p class="reading-deck">{reading.deck_name || 'No Deck Specified'}</p>
                  </div>
                </button>
                <div class="reading-actions">
                  <button 
                    class="btn-edit" 
                    on:click={() => navigate(`/reading/${reading.id}/edit`)}
                    aria-label="Edit {reading.spread_name}"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button 
                    class="btn-remove" 
                    on:click={() => handleDeleteReading(reading.id, reading.spread_name)}
                    aria-label="Delete {reading.spread_name}"
                  >
                    Delete
                  </button>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  </div>
</div>

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
    border-bottom: 2px solid #ddd;
    margin-bottom: 2rem;
  }

  .tab {
    background: none;
    border: none;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    position: relative;
    top: 2px;
  }

  .tab:hover {
    color: #4a90e2;
  }

  .tab.active {
    color: #4a90e2;
    border-bottom-color: #4a90e2;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .profile-section {
    background: #f9f9f9;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .profile-section h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.4rem;
    color: #555;
    border-bottom: 2px solid #ddd;
    padding-bottom: 0.5rem;
  }

  .profile-section h4 {
    margin: 1.5rem 0 1rem 0;
    font-size: 1.1rem;
    color: #666;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #555;
  }

  .password-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
  }

  textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    box-sizing: border-box;
    font-family: inherit;
    resize: vertical;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #4a90e2;
  }

  input:disabled,
  .disabled-input {
    background-color: #e9ecef;
    cursor: not-allowed;
    color: #6c757d;
  }

  .password-input-wrapper input[type="text"] {
    font-family: ui-monospace, 'Cascadia Code', 'Courier New', Courier, monospace;
    letter-spacing: 0.05em;
    height: 42px;
    line-height: 1.5;
  }

  .password-toggle-btn {
    position: absolute;
    right: 10px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    font-size: 1.2rem;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .password-toggle-btn:hover:not(:disabled) {
    opacity: 1;
  }

  .password-toggle-btn:disabled {
    cursor: not-allowed;
    opacity: 0.3;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .btn-add {
    padding: 10px 20px;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.2s;
  }

  .btn-add:hover {
    background-color: #218838;
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #357abd;
  }

  .btn-primary:disabled {
    background-color: #ccc;
    cursor: not-allowed;
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
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    transition: box-shadow 0.2s;
  }

  .deck-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    color: #333;
    font-weight: 500;
    display: block;
  }

  .deck-notes {
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    color: #666;
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
    color: #888;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0;
    margin-top: 0.25rem;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .notes-toggle:hover {
    color: #555;
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
    border: 1px solid #ddd;
    border-radius: 4px;
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

  .btn-save {
    padding: 0.5rem 1rem;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-save:hover {
    background-color: #218838;
  }

  .btn-cancel {
    padding: 0.5rem 1rem;
    background-color: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-cancel:hover {
    background-color: #5a6268;
  }

  .btn-edit {
    padding: 0.5rem 1rem;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-edit:hover {
    background-color: #357abd;
  }

  .btn-remove {
    padding: 0.5rem 1rem;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-remove:hover {
    background-color: #c82333;
  }

  .empty-message {
    color: #666;
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
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    transition: box-shadow 0.2s;
    overflow: hidden;
  }

  .reading-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .reading-info {
    flex: 1;
    text-align: left;
    padding: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .reading-info:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }

  .reading-spread {
    font-size: 1rem;
    color: #333;
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
    color: #666;
  }

  .reading-spread-layout {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: #7b2cbf;
    font-weight: 600;
    background: rgba(123, 44, 191, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    display: inline-block;
  }

  .reading-deck {
    margin: 0.25rem 0 0 0;
    font-size: 0.85rem;
    color: #888;
  }

  .reading-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    flex-shrink: 0;
  }

  .error-message {
    background-color: #fee;
    color: #c33;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 14px;
  }

  .success-message {
    background-color: #d4edda;
    color: #155724;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .profile-container {
      padding: 1rem;
    }

    .profile-section {
      padding: 1.5rem;
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

    .btn-add {
      width: 100%;
    }

    .deck-info {
      flex-direction: column;
      align-items: stretch;
    }

    .deck-actions {
      width: 100%;
      margin-top: 0.75rem;
    }

    .btn-edit,
    .btn-remove {
      flex: 1;
    }

    .deck-edit-actions {
      flex-direction: column;
    }

    .btn-save,
    .btn-cancel {
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

    .btn-edit,
    .btn-remove {
      flex: 1;
    }
  }
</style>
