<script lang="ts">
  import ConfirmModal from "./ConfirmModal.svelte";

  export let isOpen = false;
  export let onClose: () => void;
  export let onDeckAdded: (deckName: string) => void;

  let newDeckName = "";
  let newDeckNotes = "";
  let showValidationModal = false;
  let validationMessage = "";

  $: if (isOpen) {
    // Reset form when modal opens
    newDeckName = "";
    newDeckNotes = "";
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
        const addedDeckName = newDeckName.trim();
        newDeckName = "";
        newDeckNotes = "";
        onDeckAdded(addedDeckName);
        onClose();
      } else {
        const error = await response.text();
        validationMessage = `Failed to add deck: ${error}`;
        showValidationModal = true;
      }
    } catch (error) {
      console.error("Error adding deck:", error);
      validationMessage = "Error adding deck. Please try again.";
      showValidationModal = true;
    }
  }

  function handleBackdropClick() {
    onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="modal-overlay"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
  >
    <div
      class="modal-content"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-deck-modal-title"
      tabindex="-1"
    >
      <div class="modal-header">
        <h3 id="add-deck-modal-title">Add New Deck</h3>
        <button type="button" class="btn-close" on:click={onClose}
          ><span class="material-symbols-outlined">close</span></button
        >
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="newDeckName"
            >Deck Name<span class="required">*</span></label
          >
          <input
            type="text"
            id="newDeckName"
            bind:value={newDeckName}
            placeholder="Enter deck name..."
          />
        </div>

        <div class="form-group">
          <label for="newDeckNotes">Notes (optional)</label>
          <textarea
            id="newDeckNotes"
            bind:value={newDeckNotes}
            placeholder="Add notes about this deck..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" on:click={onClose}
          >Cancel</button
        >
        <button type="button" class="btn btn-primary" on:click={handleAddDeck}
          >Add Deck</button
        >
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
