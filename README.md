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
tarotStats/
├── server.js              # Express server & API routes
├── database.js            # Database schema & initialization
├── cards.js               # 78-card Tarot deck definitions
├── spreads.js             # Spread management
├── auth.js                # Passport authentication config
├── package.json           # Backend dependencies
├── tarot.db              # SQLite database (auto-created)
├── client/               # Svelte frontend application
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.ts    # Vite configuration
│   ├── tsconfig.json     # TypeScript configuration
│   ├── index.html        # HTML entry point
│   └── src/
│       ├── main.ts       # App initialization
│       ├── App.svelte    # Root component with routing
│       ├── app.css       # Global styles
│       ├── lib/          # Svelte components
│       │   ├── Header.svelte
│       │   ├── Login.svelte
│       │   ├── Profile.svelte
│       │   ├── Admin.svelte
│       │   ├── ReadingForm.svelte
│       │   ├── ReadingDetail.svelte
│       │   ├── ReadingsList.svelte
│       │   ├── CardModal.svelte
│       │   ├── DeckModal.svelte
│       │   └── SpreadCanvas.svelte
│       └── stores/       # State management
│           ├── authStore.ts
│           └── readingsStore.ts
└── data/                 # Data directory (if needed)
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
2. The first user to register automatically becomes an admin
3. Log in with your credentials
4. Add your decks from the FAB menu or Profile page
5. Create custom spreads or use built-in ones
6. Start recording readings!

## Database

The SQLite database (`tarot.db`) is created automatically on first run with the following tables:

- `users` - User accounts and authentication
- `sessions` - Session management
- `decks` - User-created Tarot decks
- `spreads` - Custom spread layouts
- `readings` - Reading records
- `reading_cards` - Individual cards in readings

## Environment Variables

- `NODE_ENV` - Set to `production` to disable dangerous admin features
- `SESSION_SECRET` - Secret for session encryption (auto-generated if not set)

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

### Spreads

- `GET /api/spreads` - Get user's spreads
- `POST /api/spreads` - Create spread
- `DELETE /api/spreads/:id` - Delete spread

### Cards

- `GET /api/cards` - Get all Tarot cards

### Admin (requires admin role)

- `GET /api/admin/users` - Get all users with stats
- `PUT /api/admin/users/:id/reset-password` - Reset user password
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/nuke` - Clear all data (dev/test only)

## License

MIT
