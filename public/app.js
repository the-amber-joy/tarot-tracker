// State management
let currentView = "summary";
let currentReadingId = null;
let editMode = false;
let tarotCards = [];
let sortDateDescending = true; // true = newest first, false = oldest first
let allReadings = [];
let allDecks = [];

// Initialize app
document.addEventListener("DOMContentLoaded", async () => {
  await loadTarotCards();
  await loadDecks();
  setupEventListeners();
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
  document.getElementById("addCardBtn").addEventListener("click", addCardField);
  document
    .getElementById("cancelBtn")
    .addEventListener("click", () => showSummaryView());
  document
    .getElementById("readingForm")
    .addEventListener("submit", saveReading);

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
    addCardField(); // Start with one card field
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

// Card field management
let cardFieldCounter = 0;

function addCardField(cardData = null) {
  const container = document.getElementById("cardsContainer");
  const cardId = ++cardFieldCounter;

  const cardDiv = document.createElement("div");
  cardDiv.className = "card-entry";
  cardDiv.dataset.cardId = cardId;

  cardDiv.innerHTML = `
        <div class="card-entry-header">
            <h4>Card ${cardId}</h4>
            <button type="button" class="btn-remove" onclick="removeCard(${cardId})">Remove</button>
        </div>
        <div class="form-group">
            <label>Position/Meaning</label>
            <input type="text" class="card-position" placeholder="e.g., Past, Present, Future" 
                   value="${cardData?.position || ""}" required>
        </div>
        <div class="form-group">
            <label>Card</label>
            <input type="text" class="card-name-input" list="cardsList" 
                   placeholder="Start typing to search..." 
                   value="${cardData?.card_name || ""}" required>
            <datalist id="cardsList">
                ${tarotCards
                  .map((card) => `<option value="${card.name}">`)
                  .join("")}
            </datalist>
        </div>
        <div class="form-group">
            <label>Interpretation</label>
            <textarea class="card-interpretation" rows="3" 
                      placeholder="Your interpretation of this card...">${
                        cardData?.interpretation || ""
                      }</textarea>
        </div>
    `;

  container.appendChild(cardDiv);
}

function removeCard(cardId) {
  const cardEntry = document.querySelector(`[data-card-id="${cardId}"]`);
  if (cardEntry) {
    cardEntry.remove();
  }
}

// Form management
function resetForm() {
  document.getElementById("readingForm").reset();
  document.getElementById("cardsContainer").innerHTML = "";
  cardFieldCounter = 0;
  currentReadingId = null;
}

function getFormData() {
  const cards = [];
  const cardEntries = document.querySelectorAll(".card-entry");

  cardEntries.forEach((entry) => {
    cards.push({
      position: entry.querySelector(".card-position").value,
      card_name: entry.querySelector(".card-name-input").value,
      interpretation: entry.querySelector(".card-interpretation").value,
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

  return {
    date: date,
    time: time,
    spread_name: document.getElementById("spreadName").value,
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

    // Clear and add card fields
    document.getElementById("cardsContainer").innerHTML = "";
    cardFieldCounter = 0;

    reading.cards.forEach((card) => {
      addCardField(card);
    });
  } catch (error) {
    console.error("Error loading reading for edit:", error);
  }
}

async function saveReading(event) {
  event.preventDefault();

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
  document.getElementById("deckModal").classList.remove("hidden");
  displayDeckList();
}

function hideDeckModal() {
  document.getElementById("deckModal").classList.add("hidden");
  document.getElementById("newDeckName").value = "";
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
