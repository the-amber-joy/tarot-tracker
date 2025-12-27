/**
 * Maps tarot card names to image filenames
 * Image files use lowercase, no spaces format (e.g., "aceofcups.jpeg")
 */
function getImageFilename(cardName) {
  // Convert to lowercase and remove all spaces
  let filename = cardName.replace(/\s+/g, "").toLowerCase();

  // Handle special case: "The Lovers" has .jpg extension (not .jpeg)
  if (filename === "thelovers") {
    return "thelovers.jpg";
  }

  // All other files use .jpeg extension
  return `${filename}.jpeg`;
}

/**
 * Gets the full URL path for a card image
 */
function getImageUrl(cardName) {
  return `/tarot-images/${getImageFilename(cardName)}`;
}

module.exports = {
  getImageFilename,
  getImageUrl,
};
