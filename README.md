# Flashflow

A desktop spaced repetition flashcard app built with Electron, React, and TypeScript. Organise your study material by language, generate AI voices with ElevenLabs, and let the SM-2 algorithm schedule reviews automatically.

---

## Features

- **Language sections** — group decks by language (Swedish, French, etc.) with per-language default TTS voices
- **Spaced repetition** — SM-2 algorithm schedules every card automatically
- **Three study modes** — Flip (reveal & rate), Type (type the answer), Choice (pick from 4)
- **AI voice audio** — generate card audio via ElevenLabs TTS; set a default voice per language
- **Bulk TTS** — generate audio for every card in a deck in one go
- **CSV import** — import cards from a two-column CSV file
- **Streak tracking** — daily study streak with fire badge
- **Dark theme** — deep purple dark UI with Framer Motion animations

---

## Prerequisites

| Tool | Version |
|------|---------|
| [Node.js](https://nodejs.org/) | 18 or later |
| npm | comes with Node.js |
| [ElevenLabs API key](https://elevenlabs.io/) | optional — only needed for AI voice features |

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/ginawelsh/flashflow.git
cd flashflow

# 2. Install dependencies
npm install

# 3. Start the app in development mode
npm run dev
```

The Electron window will open automatically.

---

## Build

To compile a production build (outputs to `out/`):

```bash
npm run build
```

> The build output is not a standalone installer — it produces the compiled JS that Electron runs. To package a distributable `.exe` / `.dmg` / `.AppImage`, add [electron-builder](https://www.electron.build/) and configure it in `package.json`.

---

## Project structure

```
flashflow/
├── src/
│   ├── main/          # Electron main process (IPC, file I/O, ElevenLabs API)
│   ├── preload/       # Context bridge — exposes safe APIs to the renderer
│   └── renderer/
│       └── src/
│           ├── lib/   # Store (React Context + SM-2), TTS constants
│           ├── pages/ # Home, DeckView, Study
│           └── components/  # DeckCard, TtsButton, BulkTtsModal, AudioPlayer
├── electron.vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## ElevenLabs TTS setup

1. Sign up at [elevenlabs.io](https://elevenlabs.io/) and copy your API key.
2. Open any deck → add/edit a card → click **AI Voice**.
3. Paste your API key and click **Load** to fetch your voices.
4. Check **Save API key on this device** so you only need to do this once.

To set a default voice for an entire language:

1. On the home screen, click **Add Language** (or edit an existing one).
2. Expand **Default TTS Voice**, load your API key, and pick a voice.
3. Every card in that language's decks will open TTS with that voice pre-selected.

---

## Data storage

All decks, cards, and study history are saved to a single JSON file in your OS app-data directory:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\flashflow\flashflow-data.json` |
| macOS | `~/Library/Application Support/flashflow/flashflow-data.json` |
| Linux | `~/.config/flashflow/flashflow-data.json` |

Audio files are stored alongside the JSON in an `audio/` subfolder.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 29 |
| Build tool | electron-vite + Vite 5 |
| UI framework | React 18 + TypeScript |
| Routing | React Router v6 |
| Styling | Tailwind CSS 3 |
| Animation | Framer Motion |
| Icons | Lucide React |
| TTS | ElevenLabs API |
| Algorithm | SM-2 (spaced repetition) |

---

## License

MIT
