<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import { readingsStore } from "../../stores/readingsStore";
  import SpreadCanvas from "../components/SpreadCanvas.svelte";
  import Toast from "../components/Toast.svelte";
  import AddDeckModal from "../modals/AddDeckModal.svelte";
  import ConfirmModal from "../modals/ConfirmModal.svelte";

  export let params: { id?: string } = {};

  $: readingId = params.id ? parseInt(params.id) : null;
  $: isEditMode = readingId !== null;

  type Deck = {
    id: number;
    name: string;
  };

  type SpreadTemplate = {
    id: string;
    name: string;
    description: string; // TODO: create descriptions
    positions: any[];
  };

  let decks: Deck[] = [];
  let spreadTemplates: SpreadTemplate[] = [];

  let date = new Date().toISOString().split("T")[0];
  let time = new Date().toTimeString().slice(0, 5);
  let deckName = "";
  let deckSelectElement: HTMLSelectElement;
  let spreadTemplate = "";
  let previousSpreadTemplate = "";
  let title = "";
  let notes = "";
  let spreadCards: Record<number, any> = {};
  let showDeckModal = false;

  let showTemplateChangeModal = false;
  let pendingTemplateChange: string | null = null;
  let templateSelectElement: HTMLSelectElement | null = null;

  let toastMessage = "";
  let showToast = false;
  let toastType: "success" | "error" | "info" = "success";

  onMount(async () => {
    await Promise.all([loadDecks(), loadSpreadTemplates()]);
    if (isEditMode) {
      await loadReadingData();
    }
  });

  async function loadReadingData() {
    if (!readingId) return;

    try {
      const response = await fetch(`/api/readings/${readingId}`);
      const reading = await response.json();

      // Populate form fields
      date = reading.date;
      time = reading.time;
      deckName =
        reading.deck_name === "No Deck Specified" ? "" : reading.deck_name;
      spreadTemplate = reading.spread_template_id || "custom";
      previousSpreadTemplate = reading.spread_template_id || "custom";
      title = reading.title;
      notes = reading.notes || "";

      // Transform cards into spreadCards format using card_order as the key
      spreadCards = reading.cards.reduce(
        (acc: Record<number, any>, card: any) => {
          const cardIndex = card.card_order;
          acc[cardIndex] = {
            card_name: card.card_name,
            position_label: card.position,
            interpretation: card.interpretation,
            position_x: card.position_x,
            position_y: card.position_y,
            rotation: card.rotation,
          };
          return acc;
        },
        {},
      );
    } catch (error) {
      console.error("Error loading reading:", error);
      toastMessage = "Error loading reading data.";
      toastType = "error";
      showToast = true;
    }
  }

  export async function loadDecks() {
    try {
      const response = await fetch("/api/decks");
      const updatedDecks = await response.json();

      // Save current selection
      const currentDeckName = deckName;

      // Check if the deck still exists
      const deckStillExists =
        currentDeckName &&
        updatedDecks.find((d: Deck) => d.name === currentDeckName);

      // Update the decks array
      decks = updatedDecks;

      // Manually restore the select value after DOM update
      if (deckSelectElement && deckStillExists) {
        deckSelectElement.value = currentDeckName;
        deckName = currentDeckName;
      } else if (currentDeckName && !deckStillExists) {
        deckName = "";
      }
    } catch (error) {
      console.error("Error loading decks:", error);
    }
  }

  async function loadSpreadTemplates() {
    try {
      const response = await fetch("/api/spreads");
      spreadTemplates = await response.json();
    } catch (error) {
      console.error("Error loading spread templates:", error);
    }
  }

  function setToday() {
    date = new Date().toISOString().split("T")[0];
  }

  function setNow() {
    time = new Date().toTimeString().slice(0, 5);
  }

  function handleCardsUpdate(cards: Record<number, any>) {
    spreadCards = cards;
  }

  function handleSpreadTemplateChange(event: Event) {
    const newTemplate = (event.target as HTMLSelectElement).value;

    // Check if there are any cards and if template is actually changing
    const hasCards = Object.keys(spreadCards).length > 0;
    const isChanging = previousSpreadTemplate !== newTemplate;

    if (hasCards && isChanging && previousSpreadTemplate) {
      // Store the pending change and show modal
      pendingTemplateChange = newTemplate;
      templateSelectElement = event.target as HTMLSelectElement;
      showTemplateChangeModal = true;
      // Revert the select temporarily
      (event.target as HTMLSelectElement).value = previousSpreadTemplate;
    } else if (isChanging) {
      spreadCards = {};
      spreadTemplate = newTemplate;
      previousSpreadTemplate = newTemplate;
    }
  }

  function confirmTemplateChange() {
    if (pendingTemplateChange !== null) {
      // Clear all cards
      spreadCards = {};
      spreadTemplate = pendingTemplateChange;
      previousSpreadTemplate = pendingTemplateChange;
      if (templateSelectElement) {
        templateSelectElement.value = pendingTemplateChange;
      }
    }
    showTemplateChangeModal = false;
    pendingTemplateChange = null;
    templateSelectElement = null;
  }

  function cancelTemplateChange() {
    // Keep the previous template selected
    if (templateSelectElement && previousSpreadTemplate) {
      templateSelectElement.value = previousSpreadTemplate;
    }
    showTemplateChangeModal = false;
    pendingTemplateChange = null;
    templateSelectElement = null;
  }

  function handleTemplateAutoSelected(event: CustomEvent) {
    spreadTemplate = event.detail;
    previousSpreadTemplate = event.detail;
  }

  function handleDeckSelectChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    if (value === "__add_new__") {
      showDeckModal = true;
      // Reset select to current deck
      if (deckSelectElement) {
        deckSelectElement.value = deckName;
      }
    } else {
      deckName = value;
    }
  }

  async function handleDeckAdded(addedDeckName: string) {
    await loadDecks();
    deckName = addedDeckName;
  }

  function closeDeckModal() {
    showDeckModal = false;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    await submitForm();
  }

  // Export this function so parent can trigger save via FAB
  export async function submitForm() {
    const readingData = {
      date: date,
      time: time,
      deck_name: deckName || "No Deck Specified",
      spread_template_id: spreadTemplate || "custom",
      title:
        title ||
        (spreadTemplate === "celtic-cross" ? "Celtic Cross" : "Custom Spread"),
      notes: notes,
      cards: Object.entries(spreadCards).map(([indexStr, card]) => ({
        card_order: parseInt(indexStr),
        position: card.position_label,
        card_name: card.card_name || "",
        interpretation: card.interpretation || "",
        position_x: card.position_x,
        position_y: card.position_y,
        rotation: card.rotation || 0,
      })),
    };

    try {
      const url = isEditMode ? `/api/readings/${readingId}` : "/api/readings";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(readingData),
      });

      if (response.ok) {
        await readingsStore.refresh();
        navigate("/");
      } else {
        const error = await response.text();
        toastMessage = `Failed to save reading: ${error}`;
        toastType = "error";
        showToast = true;
      }
    } catch (error) {
      console.error("Error saving reading:", error);
      toastMessage = "Error saving reading. Please try again.";
      toastType = "error";
      showToast = true;
    }
  }
</script>

<Toast bind:isVisible={showToast} message={toastMessage} type={toastType} />

<div class="view">
  <div class="view-header">
    <h2>{isEditMode ? "Edit Reading" : "New Reading"}</h2>
    <button
      type="button"
      class="btn btn-secondary"
      on:click={() => window.history.back()}>Cancel</button
    >
  </div>

  <form on:submit={handleSubmit}>
    <div class="form-section">
      <h3>Reading Details</h3>

      <div class="form-row">
        <div class="form-group">
          <label for="date">Date<span class="required">*</span></label>
          <div class="input-with-button">
            <input type="date" id="date" bind:value={date} required />
            <button type="button" class="btn btn-primary" on:click={setToday}>
              Today
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="time">Time<span class="required">*</span></label>
          <div class="input-with-button">
            <input type="time" id="time" bind:value={time} required />
            <button type="button" class="btn btn-primary" on:click={setNow}>
              Now
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="deckName">Deck Used</label>
        <select
          id="deckName"
          bind:this={deckSelectElement}
          value={deckName}
          on:change={handleDeckSelectChange}
        >
          <option value="">No deck specified</option>
          {#each decks as deck}
            <option value={deck.name}>{deck.name}</option>
          {/each}
          <option value="__add_new__" class="add-option">+ Add New Deck</option>
        </select>
      </div>

      <div class="form-group">
        <label for="spreadTemplate">Spread Template</label>
        <select
          id="spreadTemplate"
          value={spreadTemplate}
          on:change={handleSpreadTemplateChange}
        >
          <option disabled value="">Select one</option>
          {#each spreadTemplates as template}
            <option value={template.id}>{template.name}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label for="title">Reading Title or Question</label>
        <input
          type="text"
          id="title"
          bind:value={title}
          placeholder="e.g., Daily Pull, Should I quit my job?"
        />
      </div>

      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea
          id="notes"
          bind:value={notes}
          placeholder="Summary notes about the reading..."
          rows="4"
        ></textarea>
      </div>
    </div>

    <div class="form-section">
      <h3>Spread Layout</h3>
      <p class="hint">Click on a card position to add a card</p>

      <SpreadCanvas
        bind:spreadTemplate
        {spreadCards}
        onCardsUpdate={handleCardsUpdate}
        on:templateAutoSelected={handleTemplateAutoSelected}
      />
    </div>

    <div class="form-actions">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => window.history.back()}>Cancel</button
      >
      <button type="submit" class="btn btn-primary"
        >{isEditMode ? "Update Reading" : "Save Reading"}</button
      >
    </div>
  </form>
</div>

<AddDeckModal
  bind:isOpen={showDeckModal}
  onClose={closeDeckModal}
  onDeckAdded={handleDeckAdded}
/>

<ConfirmModal
  bind:isOpen={showTemplateChangeModal}
  title="Change Spread Template"
  message="Changing the spread layout will clear all previously selected cards. Are you sure you want to continue?"
  confirmText="Change Template"
  cancelText="Keep Current"
  isDanger={false}
  onConfirm={confirmTemplateChange}
  onCancel={cancelTemplateChange}
/>

<style>
  .add-option {
    font-weight: 600;
    color: var(--color-primary);
    border-top: 1px solid var(--color-border);
  }
</style>
