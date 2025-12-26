# Tarot Tracker

A web application to track and analyze your Tarot readings over time.

## Features

### Reading Management

- Create and track Tarot readings with date, time, deck, and custom spreads
- Record multiple cards per reading with positions and interpretations
- Visual spread canvas for card placement
- Edit existing readings
- View reading history with sortable list
- Incomplete readings are flagged

### Deck Management

- Create and manage multiple Tarot decks
- Add notes to your decks
- Edit deck information

### Spread Management

- Create custom spreads
- Define card positions with labels and coordinates
- Reuse spreads across multiple readings
- Built-in spread templates

### User Features

- User authentication with sessions
- Personal profile management
- Change display name and password
- View reading history by user
- User-specific decks and readings

### Admin Panel

- Manage all users
- Reset user passwords
- Delete users and their data
- View user statistics (deck count, reading count, storage)
- Sort users by various metrics
- Nuclear option for clearing all data (dev/test only)

## Tech Stack

**Backend:**

- Node.js with Express
- SQLite database (better-sqlite3)
- Passport.js for authentication
- Session-based auth with express-session

**Frontend:**

- Svelte 5 with TypeScript
- Svelte Routing for navigation
- Reactive stores for state management
- Vite for build tooling

## Project Structure

```
tarot-tracker/
├── server.js              # Express server & API routes
├── database.js            # Database schema & initialization
├── cards.js               # 78-card Tarot deck definitions
├── spreads.js             # Spread management
├── auth.js                # Passport authentication config
├── data/                  # SQLite database files
└── client/                # Svelte frontend application
    └── src/
        ├── main.ts        # App initialization
        ├── App.svelte     # Root component with routing
        ├── lib/           # Components organized by type
        │   ├── pages/     # Page-level components (6)
        │   ├── modals/    # Modal dialogs (4)
        │   └── components/ # Reusable UI components (3)
        └── stores/        # State management
```

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/the-amber-joy/tarot-tracker.git
cd tarot-tracker
```

2. **Install backend dependencies:**

```bash
npm install
```

3. **Install frontend dependencies:**

```bash
cd client
npm install
cd ..
```

### Running the Application

**Development mode with auto-reload:**

Backend (from root directory):

```bash
npm run dev
```

Server runs on http://localhost:3000

Frontend (in a separate terminal):

```bash
cd client
npm run dev
```

Vite dev server runs on http://localhost:5173

**Production mode:**

Build the frontend:

```bash
cd client
npm run build
cd ..
```

Start the server:

```bash
npm start
```

Visit http://localhost:3000

## First Time Setup

1. Start the application
2. Register a new account
3. **Optional:** Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` environment variables before first run to create an admin account
4. Log in with your credentials
5. Add your Tarot decks from the Deck Manager (accessible via FAB menu or Profile page)
6. Create your first reading using the + button
7. Choose from built-in spread templates or create a custom layout

## Database

The SQLite database (`tarot.db`) is created automatically on first run with the following tables:

- `users` - User accounts and authentication
- `sessions` - Session management
- `decks` - User-created Tarot decks
- `readings` - Reading records
- `reading_cards` - Individual cards in readings

## Environment Variables

- `NODE_ENV` - Set to `production` for production mode
- `SESSION_SECRET` - Secret for session encryption (required in production)
- `ADMIN_USERNAME` - Optional: Pre-seed admin user on first run
- `ADMIN_PASSWORD` - Optional: Password for pre-seeded admin user
- `DB_PATH` - Optional: Custom path for database files (defaults to `./data`)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/check` - Check auth status

### Readings

- `GET /api/readings` - Get all user's readings
- `GET /api/readings/:id` - Get specific reading
- `POST /api/readings` - Create new reading
- `PUT /api/readings/:id` - Update reading
- `DELETE /api/readings/:id` - Delete reading

### Decks

- `GET /api/decks` - Get user's decks
- `POST /api/decks` - Create deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck

### Cards

- `GET /api/cards` - Get all Tarot cards

### Admin (requires admin role)

- `GET /api/admin/users` - Get all users with stats
- `PUT /api/admin/users/:id/reset-password` - Reset user password
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/nuke` - Clear all data (dev/test only)

## License

MIT
