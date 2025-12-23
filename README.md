# Tarot Tracker

A web application to track and analyze your Tarot readings over time.

## Features

- Record Tarot readings with date, time, deck, and spread information
- Track multiple cards per reading with positions and interpretations
- View all past readings in a summary table
- View detailed information for each reading
- Edit existing readings
- Support for multiple decks
- Full 78-card Tarot deck support with autocomplete

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open your browser to:

```
http://localhost:3000
```

## Development

To run with auto-reload during development:

```bash
npm run dev
```

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: SQLite

## Project Structure

```
tarotStats/
├── server.js           # Express server
├── database.js         # Database initialization
├── cards.js            # Tarot card definitions
├── package.json
├── public/
│   ├── index.html     # Single-page application
│   ├── app.js         # Frontend JavaScript
│   └── style.css      # Styling
└── tarot.db           # SQLite database (created on first run)
```
