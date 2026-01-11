/**
 * Shared JSDoc type definitions for database entities
 * Import with: @typedef {import('./types.js').User} User
 */

// ============================================================================
// User Types
// ============================================================================

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} username
 * @property {string} password_hash
 * @property {string|null} display_name
 * @property {string|null} email
 * @property {0|1} email_verified
 * @property {0|1} is_admin
 * @property {string} created_at - ISO datetime string
 * @property {string|null} last_login - ISO datetime string
 * @property {string|null} verification_token
 * @property {string|null} verification_token_expires
 * @property {string|null} verification_sent_at
 * @property {string|null} reset_token
 * @property {string|null} reset_token_expires
 * @property {number} failed_login_attempts
 * @property {string|null} last_failed_login
 * @property {string|null} account_locked_until
 */

/**
 * Safe user object (without sensitive fields)
 * @typedef {Object} SafeUser
 * @property {number} id
 * @property {string} username
 * @property {string|null} display_name
 * @property {string|null} email
 * @property {boolean} email_verified
 * @property {boolean} is_admin
 */

// ============================================================================
// Reading Types
// ============================================================================

/**
 * @typedef {Object} Reading
 * @property {number} id
 * @property {number} user_id
 * @property {string} date - YYYY-MM-DD format
 * @property {string} time - HH:MM format
 * @property {string} title
 * @property {string|null} spread_template_id
 * @property {string} deck_name
 * @property {string|null} notes
 * @property {string} querent - Person the reading is for
 * @property {string} created_at - ISO datetime string
 */

/**
 * Reading with completion status (from list query)
 * @typedef {Reading & { filled_positions: number, is_incomplete: boolean }} ReadingWithStatus
 */

/**
 * @typedef {Object} ReadingCard
 * @property {number} id
 * @property {number} reading_id
 * @property {number|null} card_id - References cards table
 * @property {string} card_name
 * @property {string} position - Position label in the spread
 * @property {string|null} interpretation
 * @property {number} card_order - Order in the spread (0-indexed)
 * @property {number|null} position_x - Canvas X coordinate
 * @property {number|null} position_y - Canvas Y coordinate
 * @property {number} rotation - Rotation in degrees
 * @property {boolean} reversed - Whether card is reversed
 */

// ============================================================================
// Deck Types
// ============================================================================

/**
 * @typedef {Object} Deck
 * @property {number} id
 * @property {string} name
 * @property {string|null} notes
 * @property {number} user_id
 * @property {string} created_at - ISO datetime string
 */

// ============================================================================
// Card Types (from database, with full details)
// ============================================================================

/**
 * @typedef {Object} CardFromDB
 * @property {number} id
 * @property {string} name
 * @property {number} number
 * @property {string|null} suit
 * @property {string|null} image_filename
 * @property {number|null} element_id
 * @property {number|null} zodiac_sign_id
 * @property {number|null} planet_id
 * @property {string|null} keywords
 */

/**
 * Card with joined reference data
 * @typedef {Object} CardWithDetails
 * @property {number} id
 * @property {string} name
 * @property {number} number
 * @property {string|null} suit
 * @property {string|null} image_filename
 * @property {string|null} element_name
 * @property {string|null} element_polarity
 * @property {string|null} zodiac_sign_name
 * @property {string|null} zodiac_quality
 * @property {string|null} planet_name
 * @property {string|null} keywords
 */

// ============================================================================
// Stats Types
// ============================================================================

/**
 * @typedef {Object} CardFrequency
 * @property {string} card_name
 * @property {string|null} image_filename
 * @property {string|null} suit
 * @property {number} number
 * @property {number} count
 */

/**
 * @typedef {Object} SuitDistribution
 * @property {number} 'Major Arcana'
 * @property {number} Wands
 * @property {number} Cups
 * @property {number} Swords
 * @property {number} Pentacles
 */

export {};
