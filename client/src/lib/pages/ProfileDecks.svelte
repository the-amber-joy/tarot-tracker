<script lang="ts">
  import { onMount } from "svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";

  export let onToast: (message: string, type?: string) => void = () => {};

  interface Deck {
    id: number;
    name: string;
    notes: string | null;
    is_default: boolean;
    created_at: string;
  }

  let decks: Deck[] = [];
  let newDeckName = "";
  let newDeckNotes = "";
  let editingDeckId: number | null = null;
  let editDeckName = "";
  let editDeckNotes = "";
  let expandedDeckNotes: Set<number> = new Set();
  let truncatedDeckNotes: Set<number> = new Set();
  let showAddDeckForm = false;
  let loading = true;
  let notesElements: Map<number, HTMLParagraphElement> = new Map();

  // Delete confirmation modal state
  let showDeleteModal = false;
  let deckToDelete: Deck | null = null;

  // Validation modal state
  let showValidationModal = false;
  let validationMessage = "";

  onMount(() => {
    loadDecks();
  });

  async function loadDecks() {
    try {
      loading = true;
      const response = await fetch("/api/decks");
      if (response.ok) {
        decks = await response.json();
      }
    } catch (e) {
      console.error("Failed to load decks:", e);
    } finally {
      loading = false;
    }
  }

  async function handleAddDeck(e: Event) {
    e.preventDefault();
    if (!newDeckName.trim()) return;

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
        newDeckName = "";
        newDeckNotes = "";
        showAddDeckForm = false;
        await loadDecks();
        onToast("Deck added successfully!", "success");
      } else {
        const data = await response.json();
        onToast(data.error || "Failed to add deck", "error");
      }
    } catch (e) {
      onToast("Failed to add deck", "error");
    }
  }

  function handleDeleteDeck(deckId: number, deckName: string) {
    deckToDelete = { id: deckId, name: deckName } as Deck;
    showDeleteModal = true;
  }

  async function confirmDeleteDeck() {
    if (!deckToDelete) return;

    try {
      const response = await fetch(`/api/decks/${deckToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        showDeleteModal = false;
        deckToDelete = null;
        await loadDecks();
        onToast("Deck deleted successfully!", "success");
      } else {
        const data = await response.json();
        if (data.readingCount) {
          showDeleteModal = false;
          validationMessage = `Cannot delete this deck because it is used in ${data.readingCount} reading${data.readingCount > 1 ? "s" : ""}. Please delete or reassign those readings first.`;
          showValidationModal = true;
        } else {
          onToast(data.error || "Failed to delete deck", "error");
        }
      }
    } catch (e) {
      onToast("Failed to delete deck", "error");
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
    expandedDeckNotes = expandedDeckNotes;
  }

  function checkTruncation(node: HTMLParagraphElement, deckId: number) {
    notesElements.set(deckId, node);
    // Check after a tick to ensure styles are applied
    setTimeout(() => {
      if (node.scrollHeight > node.clientHeight) {
        truncatedDeckNotes.add(deckId);
        truncatedDeckNotes = truncatedDeckNotes;
      }
    }, 0);
    return {
      destroy() {
        notesElements.delete(deckId);
        truncatedDeckNotes.delete(deckId);
      },
    };
  }

  async function handleUpdateDeck(deckId: number) {
    if (!editDeckName.trim()) return;

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
        onToast("Deck updated successfully!", "success");
      } else {
        const data = await response.json();
        onToast(data.error || "Failed to update deck", "error");
      }
    } catch (e) {
      onToast("Failed to update deck", "error");
    }
  }
</script>

<section class="profile-section">
  <div class="section-header">
    <h3>Your Decks  ({decks.length})</h3>
    <button
      class="btn btn-small btn-success"
      on:click={() => (showAddDeckForm = !showAddDeckForm)}
    >
      <span class="material-symbols-outlined">
        {showAddDeckForm ? "close" : "add"}
      </span>
      {showAddDeckForm ? "Cancel" : "Add Deck"}
    </button>
  </div>

  {#if showAddDeckForm}
    <form class="add-deck-form" on:submit={handleAddDeck}>
      <input
        type="text"
        bind:value={newDeckName}
        placeholder="Deck name"
        required
      />
      <textarea
        bind:value={newDeckNotes}
        placeholder="Notes (optional)"
        rows="2"
      ></textarea>
      <button type="submit" class="btn btn-primary btn-small">
        Save Deck
      </button>
    </form>
  {/if}

  <div class="deck-list">
    {#if loading}
      <div class="skeleton-container">
        {#each [1, 2, 3] as _}
          <div class="skeleton-deck">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-text"></div>
          </div>
        {/each}
      </div>
    {:else if decks.length === 0}
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
                    on:click={() => handleUpdateDeck(deck.id)}>Save</button
                  >
                  <button class="btn btn-secondary" on:click={cancelEditDeck}
                    >Cancel</button
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
                      use:checkTruncation={deck.id}
                    >
                      {deck.notes}
                    </p>
                    {#if truncatedDeckNotes.has(deck.id) || expandedDeckNotes.has(deck.id)}
                      <button
                        class="notes-toggle"
                        on:click={() => toggleDeckNotes(deck.id)}
                        type="button"
                      >
                        {expandedDeckNotes.has(deck.id) ? "Less" : "More"}
                      </button>
                    {/if}
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

<!-- Delete Deck Confirmation Modal -->
<ConfirmModal
  isOpen={showDeleteModal}
  title="Delete Deck"
  message="Are you sure you want to delete the deck '{deckToDelete?.name}'? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmDeleteDeck}
  onCancel={cancelDeleteDeck}
/>

<!-- Validation Modal (deck in use) -->
<ConfirmModal
  isOpen={showValidationModal}
  title="Cannot Delete Deck"
  message={validationMessage}
  confirmText="OK"
  isAlert={true}
  onConfirm={() => (showValidationModal = false)}
  onCancel={() => (showValidationModal = false)}
/>

<style>
  .profile-section {
    background: var(--color-bg-section);
    padding: 1rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    margin-bottom: 2rem;
  }

  .profile-section h3 {
    margin: 0 0 1rem 0;
    font-size: 1.4rem;
    color: var(--color-text-secondary);
    border-bottom: 2px solid var(--color-border);
    padding-bottom: 0.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--color-border);
  }

  .section-header h3 {
    margin: 0;
    border: none;
    padding: 0;
  }

  .add-deck-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--color-bg-input);
    border-radius: var(--radius-md);
  }

  .add-deck-form input,
  .add-deck-form textarea {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
  }

  .add-deck-form textarea {
    resize: vertical;
    min-height: 60px;
    font-family: inherit;
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
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    margin-bottom: 0.75rem;
    background: var(--color-bg-input);
  }

  .deck-item:last-child {
    margin-bottom: 0;
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
    min-width: 0;
  }

  .deck-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    margin-left: auto;
  }

  .deck-name {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .deck-notes {
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    color: var(--color-secondary);
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .deck-notes.expanded {
    display: block;
    -webkit-line-clamp: unset;
    line-clamp: unset;
  }

  .notes-toggle {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-primary);
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .notes-toggle:hover {
    text-decoration: underline;
  }

  .deck-edit-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .deck-edit-input,
  .deck-edit-textarea {
    width: 100%;
    min-width: 300px;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size: 14px;
    box-sizing: border-box;
    background: var(--color-bg-input);
    color: var(--color-text-primary);
  }

  .deck-edit-textarea {
    resize: vertical;
    min-height: 60px;
    font-family: inherit;
  }

  .deck-edit-actions {
    display: flex;
    gap: 0.5rem;
  }

  .empty-message {
    text-align: center;
    color: var(--color-secondary);
    padding: 2rem;
  }

  /* Skeleton loading */
  .skeleton-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .skeleton-deck {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-bg-input);
  }

  .skeleton-line {
    background: linear-gradient(
      90deg,
      var(--color-border) 25%,
      var(--color-bg-section) 50%,
      var(--color-border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--radius-sm);
  }

  .skeleton-title {
    width: 40%;
    height: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .skeleton-text {
    width: 60%;
    height: 0.9rem;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
