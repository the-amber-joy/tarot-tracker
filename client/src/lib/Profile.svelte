<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { authStore } from "../stores/authStore";

  type Deck = {
    id: number;
    name: string;
    notes?: string;
  };

  let activeTab: "profile" | "decks" = "profile";
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

  let decks: Deck[] = [];
  let newDeckName = "";
  let newDeckNotes = "";
  let editingDeckId: number | null = null;
  let editDeckName = "";
  let editDeckNotes = "";

  onMount(async () => {
    await loadDecks();
  });

  onMount(async () => {
    await loadDecks();
  });

  async function loadDecks() {
    try {
      const response = await fetch("/api/decks");
      decks = await response.json();
    } catch (error) {
      console.error("Error loading decks:", error);
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
    <button class="back-button" on:click={goBack}>← Back</button>
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
      My Decks
    </button>
  </div>

  <div class="profile-content">
    {#if activeTab === "profile"}
      <section class="profile-section">
        <h3>Login & Display Name</h3>
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
            <input
              id="currentPassword"
              type="password"
              bind:value={currentPassword}
              required
              placeholder="Enter current password"
              disabled={passwordLoading}
            />
          </div>

          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              bind:value={newPassword}
              required
              placeholder="At least 6 characters"
              disabled={passwordLoading}
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              required
              placeholder="Re-enter new password"
              disabled={passwordLoading}
            />
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
                          <p class="deck-notes">{deck.notes}</p>
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

  small {
    display: block;
    margin-top: 0.25rem;
    color: #6c757d;
    font-size: 0.875rem;
  }

  .input-with-button {
    display: flex;
    gap: 0.5rem;
  }

  .input-with-button input {
    flex: 1;
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

    .input-with-button {
      flex-direction: column;
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
  }
</style>
