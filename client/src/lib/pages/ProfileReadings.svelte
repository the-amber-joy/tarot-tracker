<script lang="ts">
  import { onMount } from "svelte";
  import { navigate } from "svelte-routing";
  import ConfirmModal from "../modals/ConfirmModal.svelte";

  export let onToast: (message: string, type?: string) => void = () => {};

  interface Reading {
    id: number;
    date: string;
    time: string;
    title: string;
    spread_template_id?: string;
    deck_name: string;
    is_incomplete?: boolean;
  }

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

  let readings: Reading[] = [];
  let loading = true;

  // Delete confirmation modal state
  let showDeleteReadingModal = false;
  let readingToDelete: { id: number; name: string } | null = null;

  onMount(() => {
    loadReadings();
  });

  async function loadReadings() {
    try {
      loading = true;
      const response = await fetch("/api/readings");
      if (response.ok) {
        const allReadings = await response.json();
        readings = allReadings.sort((a: Reading, b: Reading) => {
          const dateA = new Date(a.date + " " + a.time);
          const dateB = new Date(b.date + " " + b.time);
          return dateB.getTime() - dateA.getTime();
        });
      }
    } catch (error) {
      console.error("Error loading readings:", error);
    } finally {
      loading = false;
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
        onToast(`"${readingToDelete.name}" deleted`, "success");
      } else {
        const error = await response.text();
        onToast(`Failed to delete reading: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error deleting reading:", error);
      onToast("Error deleting reading. Please try again.", "error");
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
</script>

<section class="profile-section">
  <h3>All Readings ({readings.length})</h3>

  {#if loading}
    <div class="skeleton-container">
      {#each [1, 2, 3] as _}
        <div class="skeleton-reading">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-text"></div>
          <div class="skeleton-line skeleton-short"></div>
        </div>
      {/each}
    </div>
  {:else if readings.length === 0}
    <p class="empty-message">
      No readings yet. Tap the + button below to get started!
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
                  <span class="incomplete-icon" title="Incomplete">⚠️</span>
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
              on:click={() => handleDeleteReading(reading.id, reading.title)}
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

<ConfirmModal
  isOpen={showDeleteReadingModal}
  title="Delete Reading"
  message="Are you sure you want to delete <strong>{readingToDelete?.name}</strong>?"
  confirmText="Delete"
  cancelText="Cancel"
  isDanger={true}
  onConfirm={confirmDeleteReading}
  onCancel={cancelDeleteReading}
/>

<style>
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

  .skeleton-reading {
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
    width: 30%;
    height: 1.2rem;
    margin-bottom: 0.5rem;
  }

  .skeleton-text {
    width: 50%;
    height: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .skeleton-short {
    width: 25%;
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

  @media (max-width: 768px) {
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
