<script lang="ts">
  import { onMount } from "svelte";
  import Toast from "./Toast.svelte";
  import ConfirmModal from "./ConfirmModal.svelte";

  export let isOpen = false;
  export let onClose: () => void;
  export let onDeckAdded: () => void;

  type Deck = {
    id: number;
    name: string;
  };

  let decks: Deck[] = [];
  let newDeckName = "";
  let modalElement: HTMLDivElement;

  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";

  let showValidationModal = false;
  let validationMessage = "";

  onMount(async () => {
    if (isOpen) {
      await loadDecks();
    }
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
        body: JSON.stringify({ name: newDeckName.trim() }),
      });

      if (response.ok) {
        newDeckName = "";
        await loadDecks();
        onDeckAdded();
      } else {
        const error = await response.text();
        toastMessage = `Failed to add deck: ${error}`;
        toastType = "error";
        showToast = true;
      }
    } catch (error) {
      console.error("Error adding deck:", error);
      toastMessage = "Error adding deck. Please try again.";
      toastType = "error";
      showToast = true;
    }
  }

  async function handleDeleteDeck(deckId: number, deckName: string) {
    try {
      const response = await fetch(`/api/decks/${deckId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadDecks();
        onDeckAdded();
      } else {
        const error = await response.text();
        toastMessage = `Failed to delete deck: ${error}`;
        toastType = "error";
        showToast = true;
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
      toastMessage = "Error deleting deck. Please try again.";
      toastType = "error";
      showToast = true;
    }
  }

  // Reload decks when modal opens and focus first input
  $: if (isOpen) {
    loadDecks();
    setTimeout(() => {
      const input = modalElement?.querySelector(
        "#newDeckName",
      ) as HTMLInputElement;
      input?.focus();
    }, 50);
  }

  function handleModalKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    }

    // Focus trap
    if (event.key === "Tab" && modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }
</script>

<Toast bind:isVisible={showToast} message={toastMessage} type={toastType} />

{#if isOpen}
  <div
    class="modal"
    bind:this={modalElement}
    on:keydown={handleModalKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="deck-modal-title"
    tabindex="-1"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="deck-modal-title">Manage Decks</h2>
        <button class="btn-close" on:click={onClose} aria-label="Close"
          >&times;</button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="newDeckName">Add New Deck</label>
          <div class="input-with-button">
            <input
              type="text"
              id="newDeckName"
              bind:value={newDeckName}
              placeholder="Enter deck name..."
              on:keydown={(e) => e.key === "Enter" && handleAddDeck()}
            />
            <button class="btn-small" on:click={handleAddDeck}>Add</button>
          </div>
        </div>

        <div class="deck-list">
          <h3>Your Decks</h3>
          <ul>
            {#each decks as deck}
              <li>
                <span>{deck.name}</span>
                <button
                  class="btn-remove-small"
                  on:click={() => handleDeleteDeck(deck.id, deck.name)}
                >
                  Remove
                </button>
              </li>
            {/each}
            {#if decks.length === 0}
              <li style="color: #666; font-style: italic;">
                No decks added yet
              </li>
            {/if}
          </ul>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  bind:isOpen={showValidationModal}
  title="Validation Error"
  message={validationMessage}
  confirmText="OK"
  isAlert={true}
  onConfirm={() => (showValidationModal = false)}
/>
