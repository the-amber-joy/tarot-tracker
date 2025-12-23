// State management
let currentView = "summary";
let currentReadingId = null;
let editMode = false;
let tarotCards = [];
let sortDateDescending = true; // true = newest first, false = oldest first
let allReadings = [];
let allDecks = [];
let spreadTemplates = [];
let currentSpreadTemplate = null;
let spreadCards = {}; // { positionIndex: { card_name, interpretation, position_x, position_y } }
let focusTrapHandler = null;
let preventCanvasClick = false; // Prevent canvas clicks after drag/rotate

// Focus trap utility functions
function trapFocus(modalElement) {
  focusTrapHandler = function (e) {
    if (e.key !== "Tab") return;

    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  document.addEventListener("keydown", focusTrapHandler);
}

function removeFocusTrap(modalElement) {
  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
    focusTrapHandler = null;
  }
}

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  await loadTarotCards();
  await loadDecks();
  await loadSpreadTemplates();
  setupEventListeners();
  populateCardDatalist();
  loadReadings();
});

// Load all tarot cards from the server
async function loadTarotCards() {
  try {
    const response = await fetch("/api/cards");
    tarotCards = await response.json();
  } catch (error) {
    console.error("Error loading cards:", error);
  }
}

// Load spread templates from the server
async function loadSpreadTemplates() {
  try {
    const response = await fetch("/api/spreads");
    spreadTemplates = await response.json();
    populateSpreadTemplates();
  } catch (error) {
    console.error("Error loading spread templates:", error);
  }
}

// Populate spread template dropdown
function populateSpreadTemplates() {
  const select = document.getElementById("spreadTemplate");
  select.innerHTML =
    '<option value="" disabled selected>Select a template...</option>';

  spreadTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.name;
    select.appendChild(option);
  });
}

// Populate card datalist for autocomplete
function populateCardDatalist() {
  const datalist = document.getElementById("cardList");
  datalist.innerHTML = "";

  tarotCards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.name;
    datalist.appendChild(option);
  });
}

// Setup event listeners
function setupEventListeners() {
  // Navigation
  document
    .getElementById("newReadingBtn")
    .addEventListener("click", () => showFormView());
  document
    .getElementById("backToSummaryBtn")
    .addEventListener("click", () => showSummaryView());
  document
    .getElementById("backFromDetailBtn")
    .addEventListener("click", () => showSummaryView());
  document
    .getElementById("editBtn")
    .addEventListener("click", () => editReading());
  document.getElementById("deleteBtn").addEventListener("click", deleteReading);
  document
    .getElementById("sortDateBtn")
    .addEventListener("click", toggleDateSort);

  // Form controls
  document.getElementById("setTodayBtn").addEventListener("click", setToday);
  document.getElementById("setNowBtn").addEventListener("click", setNow);
  document
    .getElementById("spreadTemplate")
    .addEventListener("change", onSpreadTemplateChange);
  document
    .getElementById("cancelBtn")
    .addEventListener("click", () => showSummaryView());
  document
    .getElementById("readingForm")
    .addEventListener("submit", saveReading);

  // Card modal
  document
    .getElementById("closeCardModal")
    .addEventListener("click", hideCardModal);
  document
    .getElementById("cancelCardBtn")
    .addEventListener("click", hideCardModal);
  document
    .getElementById("removeCardBtn")
    .addEventListener("click", removeCard);
  document.getElementById("cardForm").addEventListener("submit", saveCard);

  // Deck management
  document
    .getElementById("manageDeckBtn")
    .addEventListener("click", showDeckModal);
  document
    .getElementById("closeDeckModal")
    .addEventListener("click", hideDeckModal);
  document.getElementById("addDeckBtn").addEventListener("click", addNewDeck);
  document.getElementById("newDeckName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewDeck();
    }
  });
}

// View management
function showSummaryView() {
  document.getElementById("summaryView").classList.remove("hidden");
  document.getElementById("formView").classList.add("hidden");
  document.getElementById("detailView").classList.add("hidden");
  currentView = "summary";
  currentReadingId = null;
  editMode = false;
  loadReadings();
}

function showFormView(readingId = null) {
  document.getElementById("summaryView").classList.add("hidden");
  document.getElementById("formView").classList.remove("hidden");
  document.getElementById("detailView").classList.add("hidden");
  currentView = "form";
  currentReadingId = readingId;

  if (readingId) {
    document.getElementById("formTitle").textContent = "Edit Reading";
    loadReadingForEdit(readingId);
  } else {
    document.getElementById("formTitle").textContent = "New Reading";
    resetForm();
  }
}

function showDetailView(readingId) {
  document.getElementById("summaryView").classList.add("hidden");
  document.getElementById("formView").classList.add("hidden");
  document.getElementById("detailView").classList.remove("hidden");
  currentView = "detail";
  currentReadingId = readingId;
  loadReadingDetails(readingId);
}

// Date/Time helpers
function setToday() {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("readingDate").value = today;
}

function setNow() {
  const now = new Date();
  const timeString = now.toTimeString().slice(0, 5);
  document.getElementById("readingTime").value = timeString;
}

// Spread template management
let pendingCardPosition = null; // Stores click coordinates for custom spread

function convertToCustomSpread() {
  // Before converting, create placeholder entries for all empty positions
  if (currentSpreadTemplate && currentSpreadTemplate.positions) {
    currentSpreadTemplate.positions.forEach((position, index) => {
      if (!spreadCards[index]) {
        // Create an empty placeholder for unfilled positions
        spreadCards[index] = {
          card_name: "",
          position_label: position.label,
          interpretation: "",
          position_x: position.defaultX,
          position_y: position.defaultY,
          rotation: position.rotation || 0,
          isEmpty: true, // Mark as empty so we can render it differently
        };
      }
    });
  }

  const customTemplate = spreadTemplates.find((t) => t.id === "custom");
  if (customTemplate) {
    currentSpreadTemplate = customTemplate;
    document.getElementById("spreadTemplate").value = "custom";
    // Re-render to show all positions including empty ones
    renderSpreadCanvas();
  }
}

function deleteCardFromSpread(cardIndex) {
  // Warn if deleting from predefined spread
  if (currentSpreadTemplate && currentSpreadTemplate.id !== "custom") {
    if (
      !confirm("Deleting cards will convert this to a custom spread. Continue?")
    ) {
      return;
    }
    convertToCustomSpread();
  }

  // Remove the card
  delete spreadCards[cardIndex];

  // Re-number remaining cards
  const sortedKeys = Object.keys(spreadCards)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);
  const renumberedCards = {};

  sortedKeys.forEach((oldKey, newIndex) => {
    renumberedCards[newIndex] = spreadCards[oldKey];
  });

  spreadCards = renumberedCards;
  renderSpreadCanvas();
}

function onSpreadTemplateChange(event) {
  const templateId = event.target.value;
  const newTemplate = spreadTemplates.find((t) => t.id === templateId);

  // Check if we have existing cards
  const existingCardCount = Object.keys(spreadCards).length;

  if (existingCardCount > 0 && newTemplate.id !== "custom") {
    // Check if new template has enough positions
    if (existingCardCount > newTemplate.positions.length) {
      alert(
        `The ${newTemplate.name} spread only has ${
          newTemplate.positions.length
        } positions, but you have ${existingCardCount} cards. Please remove ${
          existingCardCount - newTemplate.positions.length
        } card(s) first.`,
      );
      // Reset the select back to current template
      document.getElementById("spreadTemplate").value =
        currentSpreadTemplate?.id || "";
      return;
    }

    // Remap cards to new template positions
    const remappedCards = {};
    Object.keys(spreadCards)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((key, index) => {
        const card = spreadCards[key];
        const newPosition = newTemplate.positions[index];
        remappedCards[index] = {
          ...card,
          position_x: newPosition.defaultX,
          position_y: newPosition.defaultY,
          rotation: newPosition.rotation || 0,
        };
      });
    spreadCards = remappedCards;
  }

  currentSpreadTemplate = newTemplate;
  renderSpreadCanvas();
}

function renderSpreadCanvas() {
  const canvas = document.getElementById("spreadCanvas");

  // If no template selected, default to custom spread behavior
  if (!currentSpreadTemplate) {
    canvas.innerHTML = "";
    canvas.className = "spread-canvas custom-spread";
    canvas.addEventListener("click", handleCanvasClick);

    // Render any existing cards
    Object.keys(spreadCards).forEach((key) => {
      renderCustomCard(parseInt(key));
    });
    return;
  }

  // Clear existing content
  canvas.innerHTML = "";
  canvas.className = "spread-canvas";

  // For custom spreads, add click-to-add functionality
  if (currentSpreadTemplate.id === "custom") {
    canvas.classList.add("custom-spread");
    canvas.addEventListener("click", handleCanvasClick);

    // Render existing cards
    Object.keys(spreadCards).forEach((key) => {
      renderCustomCard(parseInt(key));
    });

    return;
  }

  // Render pre-defined spread positions
  currentSpreadTemplate.positions.forEach((position, index) => {
    const positionBtn = document.createElement("button");
    positionBtn.type = "button";
    positionBtn.className = "card-position";

    // Check if this position has a card
    const cardData = spreadCards[index];

    // Use stored position if available, otherwise use default
    const xPos = cardData?.position_x ?? position.defaultX;
    const yPos = cardData?.position_y ?? position.defaultY;

    positionBtn.style.left = `${xPos}px`;
    positionBtn.style.top = `${yPos}px`;

    // Apply rotation - use stored rotation if available, otherwise use template rotation
    const rotation = cardData?.rotation ?? position.rotation ?? 0;
    if (rotation) {
      positionBtn.style.transform = `rotate(${rotation}deg)`;
    }

    positionBtn.dataset.positionIndex = index;

    if (cardData) {
      positionBtn.classList.add("filled");
      positionBtn.innerHTML = `
        <button class="delete-card-btn" title="Delete card" aria-label="Delete card">×</button>
        <div class="position-number">${position.order}</div>
        <div class="position-label">${position.label}</div>
        <div class="card-name">${cardData.card_name}</div>
        <div class="rotation-handle" title="Drag to rotate">↻</div>
      `;

      // Make filled cards draggable and rotatable
      positionBtn.style.cursor = "grab";

      // Prevent modal opening after drag
      positionBtn.addEventListener("click", (e) => {
        if (positionBtn.dataset.justDragged) {
          e.stopPropagation();
          return;
        }
        openCardModal(index);
      });

      // Append to canvas first
      canvas.appendChild(positionBtn);

      // Add delete button handler
      const deleteBtn = positionBtn.querySelector(".delete-card-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteCardFromSpread(index);
        });
      }

      // Then make draggable and rotatable
      makeDraggable(positionBtn, index);
      makeRotatable(positionBtn, index);

      return; // Skip the canvas.appendChild at the end
    } else {
      positionBtn.innerHTML = `
        <div class="position-number">${position.order}</div>
        <div class="position-label">${position.label}</div>
        <div class="empty-card">+</div>
      `;

      positionBtn.addEventListener("click", () => openCardModal(index));
    }

    positionBtn.title = position.label;
    positionBtn.setAttribute(
      "aria-label",
      `${position.label} - ${cardData ? cardData.card_name : "Add card"}`,
    );

    canvas.appendChild(positionBtn);
  });
}

// Handle canvas click for custom spreads
function handleCanvasClick(event) {
  // Don't add card if clicking on an existing card
  if (event.target.closest(".card-position")) {
    return;
  }

  const canvas = document.getElementById("spreadCanvas");
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - 50; // Center the card (100px width / 2)
  const y = event.clientY - rect.top - 70; // Center the card (140px height / 2)

  pendingCardPosition = { x, y };

  // Find next available index
  const nextIndex = Object.keys(spreadCards).length;
  openCardModal(nextIndex, true);
}

// Render a custom spread card
function renderCustomCard(index) {
  const canvas = document.getElementById("spreadCanvas");
  const cardData = spreadCards[index];

  if (!cardData) return;

  const cardBtn = document.createElement("button");
  cardBtn.type = "button";

  // Check if this is an empty placeholder (only based on card_name)
  const isEmpty = !cardData.card_name;

  cardBtn.className = isEmpty
    ? "card-position custom-card"
    : "card-position filled custom-card";
  cardBtn.style.left = `${cardData.position_x}px`;
  cardBtn.style.top = `${cardData.position_y}px`;

  // Apply rotation if specified
  if (cardData.rotation) {
    cardBtn.style.transform = `rotate(${cardData.rotation}deg)`;
  }

  cardBtn.dataset.positionIndex = index;

  const positionNumber = index + 1;

  if (isEmpty) {
    // Render as empty placeholder
    cardBtn.innerHTML = `
      <button class="delete-card-btn" title="Delete card" aria-label="Delete card">×</button>
      <div class="position-number">${positionNumber}</div>
      <div class="position-label">${
        cardData.position_label || "Card " + positionNumber
      }</div>
      <div class="empty-card">+</div>
      <div class="rotation-handle" title="Drag to rotate">↻</div>
    `;
  } else {
    // Render as filled card
    cardBtn.innerHTML = `
      <button class="delete-card-btn" title="Delete card" aria-label="Delete card">×</button>
      <div class="position-number">${positionNumber}</div>
      <div class="position-label">${
        cardData.position_label || "Card " + positionNumber
      }</div>
      <div class="card-name">${cardData.card_name}</div>
      <div class="rotation-handle" title="Drag to rotate">↻</div>
    `;
  }

  cardBtn.title = cardData.position_label || `Card ${positionNumber}`;
  cardBtn.setAttribute(
    "aria-label",
    `${cardData.position_label} - ${isEmpty ? "Add card" : cardData.card_name}`,
  );

  cardBtn.addEventListener("click", (e) => {
    // Don't open modal if card was just dragged or rotated
    if (cardBtn.dataset.justDragged) {
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    openCardModal(index, true);
  });

  // Append to canvas first
  canvas.appendChild(cardBtn);

  // Add delete button handler
  const deleteBtn = cardBtn.querySelector(".delete-card-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCardFromSpread(index);
    });
  }

  // Make all cards draggable and rotatable (both empty and filled)
  cardBtn.style.cursor = "grab";
  makeDraggable(cardBtn, index);
  makeRotatable(cardBtn, index);
}

// Make a card draggable
function makeDraggable(cardElement, cardKey) {
  let isDragging = false;
  let hasMoved = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let startX;
  let startY;

  cardElement.addEventListener("mousedown", dragStart);

  function dragStart(e) {
    // Only start drag on left click
    if (e.button !== 0) return;

    e.stopPropagation(); // Prevent canvas click
    startX = e.clientX;
    startY = e.clientY;
    initialX = e.clientX - cardElement.offsetLeft;
    initialY = e.clientY - cardElement.offsetTop;
    hasMoved = false;

    if (e.target === cardElement || cardElement.contains(e.target)) {
      isDragging = true;
      cardElement.style.cursor = "grabbing";
    }

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);
  }

  function drag(e) {
    if (!isDragging) return;

    e.preventDefault();

    // Check if mouse has moved more than 5 pixels (threshold for drag vs click)
    const deltaX = Math.abs(e.clientX - startX);
    const deltaY = Math.abs(e.clientY - startY);
    if (deltaX > 5 || deltaY > 5) {
      // Check if we need to convert to custom spread
      if (
        !hasMoved &&
        currentSpreadTemplate &&
        currentSpreadTemplate.id !== "custom"
      ) {
        if (
          !confirm(
            "Moving cards will convert this to a custom spread. Continue?",
          )
        ) {
          // Cancel the drag
          isDragging = false;
          cardElement.style.cursor = "grab";
          document.removeEventListener("mousemove", drag);
          document.removeEventListener("mouseup", dragEnd);
          return;
        }
        // Convert to custom spread
        convertToCustomSpread();
      }
      hasMoved = true;
    }

    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    cardElement.style.left = `${currentX}px`;
    cardElement.style.top = `${currentY}px`;
  }

  function dragEnd(e) {
    if (!isDragging) return;

    isDragging = false;
    cardElement.style.cursor = "grab";

    // Update position in spreadCards if moved
    if (hasMoved) {
      spreadCards[cardKey].position_x = currentX;
      spreadCards[cardKey].position_y = currentY;

      // Store that we just dragged to prevent click handlers
      cardElement.dataset.justDragged = "true";

      // Clear the flag after a short delay
      setTimeout(() => {
        delete cardElement.dataset.justDragged;
        hasMoved = false;
      }, 200);
    }

    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", dragEnd);
  }
}

// Make a card rotatable via handle
function makeRotatable(cardElement, cardKey) {
  const handle = cardElement.querySelector(".rotation-handle");
  if (!handle) {
    return;
  }

  let isRotating = false;
  let currentRotation = spreadCards[cardKey]?.rotation || 0;

  handle.addEventListener("mousedown", rotateStart);

  function rotateStart(e) {
    // Warn user if this is a predefined spread
    if (currentSpreadTemplate && currentSpreadTemplate.id !== "custom") {
      if (
        !confirm(
          "Rotating cards will convert this to a custom spread. Continue?",
        )
      ) {
        return;
      }
      // Convert to custom spread
      convertToCustomSpread();
    }

    e.preventDefault();
    e.stopPropagation();
    isRotating = true;

    // Prevent dragging and clicking while rotating
    cardElement.dataset.justDragged = "true";

    document.addEventListener("mousemove", rotate);
    document.addEventListener("mouseup", rotateEnd);
  }

  function rotate(e) {
    if (!isRotating) return;

    e.preventDefault();

    // Get card center
    const rect = cardElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate angle from center to mouse
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const degrees = angle * (180 / Math.PI) + 90; // +90 to start from top

    currentRotation = Math.round(degrees);

    // Apply rotation
    const currentTransform = cardElement.style.transform
      .replace(/rotate\([^)]*\)/, "")
      .trim();
    cardElement.style.transform =
      `${currentTransform} rotate(${currentRotation}deg)`.trim();
  }

  function rotateEnd(e) {
    if (!isRotating) return;

    e.preventDefault();
    e.stopPropagation();

    isRotating = false;

    // Store rotation in spreadCards
    spreadCards[cardKey].rotation = currentRotation;

    // Prevent canvas clicks for a moment after rotation
    preventCanvasClick = true;

    // Keep the justDragged flag a bit longer to prevent modal opening
    setTimeout(() => {
      delete cardElement.dataset.justDragged;
      preventCanvasClick = false;
    }, 200);

    document.removeEventListener("mousemove", rotate);
    document.removeEventListener("mouseup", rotateEnd);
  }
}

// Custom spread functions
function handleCanvasClick(event) {
  // Don't add card if we just finished dragging/rotating
  if (preventCanvasClick) {
    return;
  }

  // Don't add card if clicking on an existing card
  if (event.target.closest(".card-position")) {
    return;
  }

  // Auto-select Custom template if none selected
  if (!currentSpreadTemplate) {
    const customTemplate = spreadTemplates.find((t) => t.id === "custom");
    if (customTemplate) {
      currentSpreadTemplate = customTemplate;
      document.getElementById("spreadTemplate").value = "custom";
    }
  }

  const canvas = document.getElementById("spreadCanvas");
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left - 50; // Center the card (100px width / 2)
  const y = event.clientY - rect.top - 70; // Center the card (140px height / 2)

  // Generate a new unique key for this card
  const newKey = Object.keys(spreadCards).length;

  pendingCardPosition = { x, y };

  // Open modal with position set to click location
  openCardModal(newKey, true);
}

function openCustomCardModal(cardKey, x, y, existingCard = null) {
  lastFocusedElement = document.activeElement;

  document.getElementById("cardPositionIndex").value = cardKey;
  document.getElementById("cardPositionName").value =
    existingCard?.position_label || `Card ${cardKey + 1}`;
  document.getElementById("cardModalTitle").textContent = existingCard
    ? "Edit Card"
    : "Add Card";

  if (existingCard) {
    document.getElementById("cardName").value = existingCard.card_name;
    document.getElementById("cardInterpretation").value =
      existingCard.interpretation || "";
    document.getElementById("removeCardBtn").classList.remove("hidden");
  } else {
    document.getElementById("cardName").value = "";
    document.getElementById("cardInterpretation").value = "";
    document.getElementById("removeCardBtn").classList.remove("hidden"); // Show remove for custom cards
  }

  // Store position for later
  document.getElementById("cardPositionIndex").dataset.x = x;
  document.getElementById("cardPositionIndex").dataset.y = y;

  updateAvailableCards(cardKey);

  const modal = document.getElementById("cardModal");
  modal.classList.remove("hidden");
  trapFocus(modal);
  document.getElementById("cardName").focus();
}

// Card modal management
let lastFocusedElement = null;

function openCardModal(positionIndex, isCustomSpread = false) {
  const existingCard = spreadCards[positionIndex];

  // Store currently focused element to restore later
  lastFocusedElement = document.activeElement;

  document.getElementById("cardPositionIndex").value = positionIndex;

  // For custom spreads, use a default or existing position label
  if (isCustomSpread || currentSpreadTemplate.id === "custom") {
    document.getElementById("cardPositionName").value =
      existingCard?.position_label || `Card ${positionIndex + 1}`;
  } else {
    // For pre-defined spreads, use template position
    const position = currentSpreadTemplate.positions[positionIndex];
    document.getElementById("cardPositionName").value =
      existingCard?.position_label || position.label;
  }

  document.getElementById("cardModalTitle").textContent = existingCard
    ? "Edit Card"
    : "Add Card";

  if (existingCard) {
    document.getElementById("cardName").value = existingCard.card_name;
    document.getElementById("cardInterpretation").value =
      existingCard.interpretation || "";
    document.getElementById("removeCardBtn").classList.remove("hidden");
  } else {
    document.getElementById("cardName").value = "";
    document.getElementById("cardInterpretation").value = "";
    document.getElementById("removeCardBtn").classList.add("hidden");
  }

  // Update datalist to exclude already-used cards
  updateAvailableCards(positionIndex);

  const modal = document.getElementById("cardModal");
  modal.classList.remove("hidden");

  // Add focus trap
  trapFocus(modal);

  document.getElementById("cardName").focus();
}

// Update available cards list, excluding already used cards
function updateAvailableCards(currentPositionIndex) {
  const datalist = document.getElementById("cardList");
  datalist.innerHTML = "";

  // Get list of already-used card names (excluding current position)
  const usedCards = new Set();
  Object.keys(spreadCards).forEach((posIndex) => {
    if (parseInt(posIndex) !== currentPositionIndex) {
      usedCards.add(spreadCards[posIndex].card_name);
    }
  });

  // Populate datalist with available cards only
  tarotCards.forEach((card) => {
    if (!usedCards.has(card.name)) {
      const option = document.createElement("option");
      option.value = card.name;
      datalist.appendChild(option);
    }
  });
}

function hideCardModal() {
  const modal = document.getElementById("cardModal");
  modal.classList.add("hidden");
  document.getElementById("cardForm").reset();

  // Remove focus trap
  removeFocusTrap(modal);

  // Restore focus to previously focused element
  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

function saveCard(event) {
  event.preventDefault();

  const cardName = document.getElementById("cardName").value.trim();
  const positionIndex = parseInt(
    document.getElementById("cardPositionIndex").value,
  );

  // Validate card name if provided
  if (cardName) {
    const isValidCard = tarotCards.some((card) => card.name === cardName);
    if (!isValidCard) {
      alert("Please select a valid card name from the list.");
      return;
    }

    // Check if card is already used in another position
    const cardAlreadyUsed = Object.keys(spreadCards).some((posIndex) => {
      return (
        parseInt(posIndex) !== positionIndex &&
        spreadCards[posIndex].card_name === cardName
      );
    });

    if (cardAlreadyUsed) {
      alert(
        `The card "${cardName}" is already used in this reading. Each card can only be used once.`,
      );
      return;
    }
  }

  const positionLabel = document
    .getElementById("cardPositionName")
    .value.trim();
  const interpretation = document.getElementById("cardInterpretation").value;

  // Determine position coordinates
  let x, y;

  if (currentSpreadTemplate.id === "custom") {
    // For custom spreads, preserve existing coordinates or use new click position
    const existingCard = spreadCards[positionIndex];
    if (existingCard) {
      // Editing existing card - keep its position
      x = existingCard.position_x;
      y = existingCard.position_y;
    } else if (pendingCardPosition) {
      // New card from click
      x = pendingCardPosition.x;
      y = pendingCardPosition.y;
    } else {
      // Fallback (shouldn't happen)
      x = 0;
      y = 0;
    }
    pendingCardPosition = null; // Clear pending position
  } else {
    // For predefined spreads, use existing position or default from template
    const existingCard = spreadCards[positionIndex];
    const position = currentSpreadTemplate.positions[positionIndex];
    x = existingCard?.position_x ?? position.defaultX;
    y = existingCard?.position_y ?? position.defaultY;
  }

  // Preserve existing rotation if editing, otherwise default to 0 (or template rotation for predefined)
  const existingRotation = spreadCards[positionIndex]?.rotation;
  let rotation;

  if (existingRotation !== undefined) {
    rotation = existingRotation;
  } else if (currentSpreadTemplate.id !== "custom") {
    // For predefined spreads, use template rotation as default
    const position = currentSpreadTemplate.positions[positionIndex];
    rotation = position?.rotation || 0;
  } else {
    rotation = 0;
  }

  spreadCards[positionIndex] = {
    card_name: cardName,
    position_label: positionLabel,
    interpretation: interpretation,
    position_x: x,
    position_y: y,
    rotation: rotation,
    isEmpty: !cardName, // Mark as empty if no card name provided
  };

  renderSpreadCanvas();
  hideCardModal();

  // Focus next position button (for predefined spreads)
  if (currentSpreadTemplate.id !== "custom") {
    focusNextPosition(positionIndex);
  }
}

function focusNextPosition(currentIndex) {
  // Find the next position in order
  const nextIndex = currentIndex + 1;
  if (nextIndex < currentSpreadTemplate.positions.length) {
    // Wait for render to complete, then focus the next button
    setTimeout(() => {
      const nextButton = document.querySelector(
        `[data-position-index="${nextIndex}"]`,
      );
      if (nextButton) {
        nextButton.focus();
      }
    }, 100);
  }
}

function removeCard() {
  const positionIndex = parseInt(
    document.getElementById("cardPositionIndex").value,
  );
  // Only clear the card name, keep the position
  if (spreadCards[positionIndex]) {
    spreadCards[positionIndex].card_name = "";
    spreadCards[positionIndex].interpretation = "";
    spreadCards[positionIndex].isEmpty = true;
  }
  renderSpreadCanvas();
  hideCardModal();
}

// Form management
function resetForm() {
  document.getElementById("readingForm").reset();
  spreadCards = {};
  currentSpreadTemplate = null;
  currentReadingId = null;
  document.getElementById("spreadCanvas").innerHTML = "";
}

function getFormData() {
  // Convert spreadCards object to array format for API
  const cards = [];
  Object.keys(spreadCards).forEach((positionIndex) => {
    const cardData = spreadCards[positionIndex];
    cards.push({
      position:
        cardData.position_label ||
        currentSpreadTemplate.positions[positionIndex].label,
      card_name: cardData.card_name,
      interpretation: cardData.interpretation || "",
      position_x: cardData.position_x,
      position_y: cardData.position_y,
    });
  });

  // Get date/time values, use current if not provided
  let date = document.getElementById("readingDate").value;
  let time = document.getElementById("readingTime").value;

  if (!date) {
    date = new Date().toISOString().split("T")[0];
  }

  if (!time) {
    const now = new Date();
    time = now.toTimeString().slice(0, 5);
  }

  // Get spread name, use template name if not provided
  let spreadName = document.getElementById("spreadName").value.trim();
  if (!spreadName && currentSpreadTemplate) {
    spreadName = currentSpreadTemplate.name;
  }

  return {
    date: date,
    time: time,
    spread_name: spreadName,
    spread_template_id: currentSpreadTemplate?.id || null,
    deck_name: document.getElementById("deckName").value,
    notes: document.getElementById("notes").value,
    cards: cards,
  };
}

// API calls
async function loadReadings() {
  try {
    const response = await fetch("/api/readings");
    allReadings = await response.json();
    displayReadingsTable(allReadings);
  } catch (error) {
    console.error("Error loading readings:", error);
  }
}

function getDayOfWeek(dateString) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const date = new Date(dateString);
  return days[date.getDay()];
}

function toggleDateSort() {
  sortDateDescending = !sortDateDescending;
  const sortBtn = document.getElementById("sortDateBtn");
  sortBtn.textContent = sortDateDescending ? "↓" : "↑";

  const sortedReadings = [...allReadings].sort((a, b) => {
    const dateA = new Date(a.date + " " + a.time);
    const dateB = new Date(b.date + " " + b.time);
    return sortDateDescending ? dateB - dateA : dateA - dateB;
  });

  displayReadingsTable(sortedReadings);
}

function displayReadingsTable(readings) {
  const tbody = document.getElementById("readingsTableBody");

  if (readings.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-message">No readings yet. Click "New Reading" to get started!</td></tr>';
    return;
  }

  tbody.innerHTML = readings
    .map((reading) => {
      const dateObj = new Date(reading.date + " " + reading.time);
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
      const timestamp = `${formattedDate} at ${formattedTime}`;

      return `
        <tr onclick="showDetailView(${reading.id})" style="cursor: pointer;">
            <td>${timestamp}</td>
            <td>${getDayOfWeek(reading.date)}</td>
            <td>${reading.spread_name}</td>
            <td>${reading.card_count}</td>
        </tr>
    `;
    })
    .join("");
}

async function loadReadingDetails(id) {
  try {
    const response = await fetch(`/api/readings/${id}`);
    const reading = await response.json();
    displayReadingDetails(reading);
  } catch (error) {
    console.error("Error loading reading details:", error);
  }
}

function displayReadingDetails(reading) {
  const container = document.getElementById("readingDetails");

  // Check if reading has a spread template
  const hasSpreadTemplate =
    reading.spread_template_id &&
    spreadTemplates.find((t) => t.id === reading.spread_template_id);

  container.innerHTML = `
        <div class="detail-section">
            <h3>Reading Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <strong>Date:</strong> ${reading.date}
                </div>
                <div class="detail-item">
                    <strong>Time:</strong> ${reading.time}
                </div>
                <div class="detail-item">
                    <strong>Deck:</strong> ${reading.deck_name}
                </div>
                <div class="detail-item">
                    <strong>Spread:</strong> ${reading.spread_name}
                </div>
            </div>
            ${
              reading.notes
                ? `<div class="detail-item"><strong>Notes:</strong><p>${reading.notes}</p></div>`
                : ""
            }
        </div>
        
        ${
          hasSpreadTemplate
            ? `
        <div class="detail-section">
            <h3>Spread Layout</h3>
            <div id="detailSpreadCanvas" class="spread-canvas-readonly"></div>
        </div>
        `
            : ""
        }
        
        <div class="detail-section">
            <h3>Cards (${reading.cards.length})</h3>
            ${reading.cards
              .map(
                (card, index) => `
                <div class="card-detail">
                    <h4>Card ${index + 1}: ${card.position}</h4>
                    <p class="card-name">${card.card_name}</p>
                    ${
                      card.interpretation
                        ? `<p class="card-interpretation">${card.interpretation}</p>`
                        : ""
                    }
                </div>
            `,
              )
              .join("")}
        </div>
    `;

  // Render spread layout if available
  if (hasSpreadTemplate) {
    renderDetailSpreadLayout(reading);
  }
}

// Render spread layout in detail view (read-only)
function renderDetailSpreadLayout(reading) {
  const canvas = document.getElementById("detailSpreadCanvas");
  const template = spreadTemplates.find(
    (t) => t.id === reading.spread_template_id,
  );

  if (!template || !canvas) return;

  canvas.innerHTML = "";
  canvas.className = "spread-canvas-readonly";

  // Create a map of cards by position label
  const cardsByPosition = {};
  reading.cards.forEach((card) => {
    cardsByPosition[card.position] = card;
  });

  // Render each position
  template.positions.forEach((position, index) => {
    const positionDiv = document.createElement("div");
    positionDiv.className = "card-position readonly";
    positionDiv.style.left = `${position.defaultX}px`;
    positionDiv.style.top = `${position.defaultY}px`;

    // Apply rotation if specified
    if (position.rotation) {
      positionDiv.style.transform = `rotate(${position.rotation}deg)`;
    }

    const cardData = cardsByPosition[position.label];

    if (cardData) {
      positionDiv.classList.add("filled");
      positionDiv.innerHTML = `
        <div class="position-number">${position.order}</div>
        <div class="position-label">${position.label}</div>
        <div class="card-name">${cardData.card_name}</div>
      `;

      // Add interpretation tooltip if available
      if (cardData.interpretation) {
        positionDiv.title = `${position.label}\n${cardData.card_name}\n\n${cardData.interpretation}`;
      } else {
        positionDiv.title = `${position.label}\n${cardData.card_name}`;
      }
    } else {
      positionDiv.innerHTML = `
        <div class="position-number">${position.order}</div>
        <div class="position-label">${position.label}</div>
        <div class="empty-card">—</div>
      `;
      positionDiv.title = position.label;
    }

    canvas.appendChild(positionDiv);
  });
}

async function loadReadingForEdit(id) {
  try {
    const response = await fetch(`/api/readings/${id}`);
    const reading = await response.json();

    // Populate form fields
    document.getElementById("readingDate").value = reading.date;
    document.getElementById("readingTime").value = reading.time;
    document.getElementById("spreadName").value = reading.spread_name;
    document.getElementById("deckName").value = reading.deck_name;
    document.getElementById("notes").value = reading.notes || "";

    // Set spread template if available
    if (reading.spread_template_id) {
      document.getElementById("spreadTemplate").value =
        reading.spread_template_id;
      currentSpreadTemplate = spreadTemplates.find(
        (t) => t.id === reading.spread_template_id,
      );
    }

    // Load cards into spreadCards
    spreadCards = {};
    reading.cards.forEach((card, index) => {
      // Find position index by label
      const positionIndex =
        currentSpreadTemplate?.positions.findIndex(
          (p) => p.label === card.position,
        ) ?? index;

      spreadCards[positionIndex] = {
        card_name: card.card_name,
        position_label: card.position, // Store the saved position label
        interpretation: card.interpretation,
        position_x:
          card.position_x ||
          currentSpreadTemplate?.positions[positionIndex]?.defaultX ||
          0,
        position_y:
          card.position_y ||
          currentSpreadTemplate?.positions[positionIndex]?.defaultY ||
          0,
      };
    });

    renderSpreadCanvas();
  } catch (error) {
    console.error("Error loading reading for edit:", error);
  }
}

async function saveReading(event) {
  event.preventDefault();

  // Validate that at least one card has been added
  if (Object.keys(spreadCards).length === 0) {
    alert("Please add at least one card to the reading.");
    return;
  }

  const formData = getFormData();
  const url = currentReadingId
    ? `/api/readings/${currentReadingId}`
    : "/api/readings";
  const method = currentReadingId ? "PUT" : "POST";

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      showSummaryView();
    } else {
      const error = await response.json();
      alert("Error saving reading: " + error.error);
    }
  } catch (error) {
    console.error("Error saving reading:", error);
    alert("Error saving reading. Please try again.");
  }
}

function editReading() {
  showFormView(currentReadingId);
}

async function deleteReading() {
  if (!currentReadingId) return;

  if (
    !confirm(
      "Are you sure you want to delete this reading? This cannot be undone.",
    )
  ) {
    return;
  }

  try {
    const response = await fetch(`/api/readings/${currentReadingId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showSummaryView();
    } else {
      const error = await response.json();
      alert("Error deleting reading: " + error.error);
    }
  } catch (error) {
    console.error("Error deleting reading:", error);
    alert("Error deleting reading. Please try again.");
  }
}

// Deck management functions
async function loadDecks() {
  try {
    const response = await fetch("/api/decks");
    allDecks = await response.json();
    populateDeckSelect();
  } catch (error) {
    console.error("Error loading decks:", error);
  }
}

function populateDeckSelect() {
  const select = document.getElementById("deckName");
  const currentValue = select.value;

  // Keep the placeholder option
  select.innerHTML =
    '<option value="" disabled selected>Select a deck...</option>';

  allDecks.forEach((deck) => {
    const option = document.createElement("option");
    option.value = deck.name;
    option.textContent = deck.name;
    select.appendChild(option);
  });

  // Restore selected value if it still exists
  if (currentValue && allDecks.some((d) => d.name === currentValue)) {
    select.value = currentValue;
  }
}

function showDeckModal() {
  lastFocusedElement = document.activeElement;

  const modal = document.getElementById("deckModal");
  modal.classList.remove("hidden");
  displayDeckList();

  trapFocus(modal);
  document.getElementById("newDeckName").focus();
}

function hideDeckModal() {
  const modal = document.getElementById("deckModal");
  modal.classList.add("hidden");
  document.getElementById("newDeckName").value = "";

  removeFocusTrap(modal);

  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

function displayDeckList() {
  const deckList = document.getElementById("deckList");

  if (allDecks.length === 0) {
    deckList.innerHTML =
      '<li class="empty-message">No decks yet. Add one above!</li>';
    return;
  }

  deckList.innerHTML = allDecks
    .map(
      (deck) => `
    <li>
      <span>${deck.name}</span>
      <button class="btn-remove-small" onclick="deleteDeck(${deck.id})">Delete</button>
    </li>
  `,
    )
    .join("");
}

async function addNewDeck() {
  const nameInput = document.getElementById("newDeckName");
  const name = nameInput.value.trim();

  if (!name) {
    alert("Please enter a deck name");
    return;
  }

  try {
    const response = await fetch("/api/decks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (response.ok) {
      nameInput.value = "";
      await loadDecks();
      displayDeckList();
    } else {
      const error = await response.json();
      alert(error.error || "Error adding deck");
    }
  } catch (error) {
    console.error("Error adding deck:", error);
    alert("Error adding deck. Please try again.");
  }
}

async function deleteDeck(deckId) {
  if (!confirm("Are you sure you want to delete this deck?")) {
    return;
  }

  try {
    const response = await fetch(`/api/decks/${deckId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await loadDecks();
      displayDeckList();
    } else {
      const error = await response.json();
      alert(error.error || "Error deleting deck");
    }
  } catch (error) {
    console.error("Error deleting deck:", error);
    alert("Error deleting deck. Please try again.");
  }
}
