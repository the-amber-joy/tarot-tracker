<script lang="ts">
  export let isOpen = false;
  export let cardName = "";
  export let onClose: () => void;

  type CardDetails = {
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

  let card: CardDetails | null = null;
  let loading = false;
  let error = "";

  // Element colors and icons
  const elementStyles: Record<
    string,
    { color: string; bg: string; icon: string }
  > = {
    Fire: { color: "#dc2626", bg: "rgba(220, 38, 38, 0.1)", icon: "🔥" },
    Water: { color: "#2563eb", bg: "rgba(37, 99, 235, 0.1)", icon: "💧" },
    Air: { color: "#7c3aed", bg: "rgba(124, 58, 237, 0.1)", icon: "💨" },
    Earth: { color: "#16a34a", bg: "rgba(22, 163, 74, 0.1)", icon: "🌿" },
  };

  // Planet icons
  const planetIcons: Record<string, string> = {
    Sun: "☀️",
    Moon: "🌙",
    Mercury: "☿️",
    Venus: "♀️",
    Mars: "♂️",
    Jupiter: "♃",
    Saturn: "♄",
    Uranus: "⛢",
    Neptune: "♆",
    Pluto: "♇",
  };

  // Zodiac icons
  const zodiacIcons: Record<string, string> = {
    Aries: "♈",
    Taurus: "♉",
    Gemini: "♊",
    Cancer: "♋",
    Leo: "♌",
    Virgo: "♍",
    Libra: "♎",
    Scorpio: "♏",
    Sagittarius: "♐",
    Capricorn: "♑",
    Aquarius: "♒",
    Pisces: "♓",
  };

  $: elementStyle = card?.element_name
    ? elementStyles[card.element_name]
    : null;

  $: if (isOpen && cardName) {
    fetchCardDetails();
  }

  // Prevent body scroll when modal is open
  $: if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  async function fetchCardDetails() {
    loading = true;
    error = "";
    try {
      const response = await fetch(
        `/api/cards/${encodeURIComponent(cardName)}`,
      );
      if (!response.ok) {
        throw new Error("Card not found");
      }
      card = await response.json();
    } catch (err) {
      error = "Failed to load card details";
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click={handleBackdropClick}>
    <div
      class="modal-content"
      style={elementStyle
        ? `--accent-color: ${elementStyle.color}; --accent-bg: ${elementStyle.bg}`
        : ""}
    >
      {#if elementStyle}
        <div class="accent-bar" style="background: {elementStyle.color}"></div>
      {/if}
      <button class="btn-close" on:click={onClose}
        ><span class="material-symbols-outlined">close</span></button
      >

      {#if loading}
        <div class="loading">
          <div class="loading-spinner"></div>
        </div>
      {:else if error}
        <div class="error">{error}</div>
      {:else if card}
        <div class="card-details">
          <div class="card-header">
            <h2>{card.name}</h2>
          </div>

          <div class="card-body">
            <div class="card-image-section">
              {#if card.image_filename}
                <img
                  src="/tarot-images/{card.image_filename}"
                  alt={card.name}
                  class="card-image"
                />
              {:else}
                <div class="card-placeholder">
                  <span>No Image</span>
                </div>
              {/if}
            </div>

            <div class="card-info-section">
              {#if card.planet_name}
                <div class="info-badge">
                  <span class="badge-icon"
                    >{planetIcons[card.planet_name] || "🪐"}</span
                  >
                  <div class="badge-content">
                    <span class="badge-label">Planet</span>
                    <span class="badge-value">{card.planet_name}</span>
                  </div>
                </div>
              {/if}

              {#if card.element_name && elementStyle}
                <div class="info-badge">
                  <span class="badge-icon">{elementStyle.icon}</span>
                  <div class="badge-content">
                    <span class="badge-label">Element</span>
                    <span class="badge-value">{card.element_name}</span>
                  </div>
                </div>
              {/if}

              {#if card.element_polarity}
                <div class="info-badge">
                  <span class="badge-icon"
                    >{card.element_polarity === "Active" ? "⚡" : "🌊"}</span
                  >
                  <div class="badge-content">
                    <span class="badge-label">Polarity</span>
                    <span class="badge-value">{card.element_polarity}</span>
                  </div>
                </div>
              {/if}

              {#if card.zodiac_sign_name}
                <div class="info-badge">
                  <span class="badge-icon"
                    >{zodiacIcons[card.zodiac_sign_name] || "✨"}</span
                  >
                  <div class="badge-content">
                    <span class="badge-label">Sign</span>
                    <span class="badge-value">{card.zodiac_sign_name}</span>
                  </div>
                </div>
              {/if}

              {#if card.zodiac_quality}
                <div class="info-badge">
                  <span class="badge-icon">◈</span>
                  <div class="badge-content">
                    <span class="badge-label">Quality</span>
                    <span class="badge-value">{card.zodiac_quality}</span>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          {#if card.keywords}
            <div class="keywords-section">
              <span
                class="keywords-label"
                style={elementStyle ? `color: ${elementStyle.color}` : ""}
                >🔮 Keywords</span
              >
              <div class="keywords-tags">
                {#each card.keywords.split(",").map((k) => k.trim()) as keyword}
                  <span class="keyword-tag">{keyword}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    background: var(--color-bg-white);
    border-radius: var(--radius-lg);
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    animation: modalSlideIn 0.3s ease-out;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .btn-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }

  .error {
    text-align: center;
    padding: 2rem;
    color: var(--color-danger);
  }

  .card-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .card-header {
    text-align: center;
    padding-bottom: 1rem;
  }

  .card-header h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1.6rem;
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .card-body {
    display: flex;
    gap: 1.5rem;
  }

  .card-image-section {
    flex-shrink: 0;
  }

  .card-image {
    width: 150px;
    height: auto;
    border-radius: var(--radius-md);
    box-shadow:
      0 10px 30px -5px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;
  }

  .card-image:hover {
    transform: scale(1.02);
  }

  .card-placeholder {
    width: 150px;
    height: 250px;
    background: linear-gradient(
      135deg,
      var(--color-bg-section) 0%,
      var(--color-border) 100%
    );
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-light);
  }

  .card-info-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .info-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.85rem;
    background: var(--color-bg-section);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    transition: var(--transition-fast);
  }

  .info-badge:hover {
    border-color: var(--color-text-light);
  }

  .badge-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  .badge-content {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .badge-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-light);
    font-weight: 600;
  }

  .badge-value {
    font-size: 0.95rem;
    color: var(--color-text-primary);
    font-weight: 500;
  }

  .keywords-section {
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  .keywords-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-light);
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .keywords-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .keyword-tag {
    display: inline-block;
    padding: 0.35rem 0.75rem;
    background: linear-gradient(
      135deg,
      var(--accent-bg, var(--color-bg-section)) 0%,
      var(--color-bg-section) 100%
    );
    border: 1px solid var(--accent-color, var(--color-border));
    border-radius: 999px;
    font-size: 0.8rem;
    color: var(--accent-color, var(--color-text-secondary));
    font-weight: 500;
    transition: var(--transition-fast);
  }

  .keyword-tag:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 480px) {
    .modal-content {
      padding: 1.5rem;
      padding-top: 2rem;
    }

    .card-body {
      flex-direction: column;
      align-items: center;
    }

    .card-image {
      width: 140px;
    }

    .card-placeholder {
      width: 140px;
      height: 230px;
    }

    .card-info-section {
      width: 100%;
    }
  }
</style>
