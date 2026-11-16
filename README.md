# Monopoly Deal: No Mercy — Real-Time Multiplayer Web Game

An authentic, modern, real-time multiplayer implementation of **Monopoly Deal: No Mercy** supporting **2 to 6 players**. Built with React, TypeScript, Vite, Tailwind CSS, Node.js, Express, and Socket.IO.

---

## 🎩 Features

- **Real-Time Multiplayer (2–6 Players)**: Create a room with a 6-character uppercase code or join any active room.
- **Server-Authoritative Game State**: Player hands remain completely private and hidden from opponents. Only public counts, bank totals, debt chips, and laid-down property sets are shared with opponents.
- **Dynamic Host System**: The room creator is assigned as Host with room controls. Automatic host transfer occurs if the host disconnects in the lobby.
- **Live Host Win-Mode Selector**:
  - **Mode 1 — Standard No Mercy**: Win with **3 full property sets of different colors** + at least **$10M in Bank** + **all 3 of your Debt Chips**.
  - **Mode 2 — Extended No Mercy**: Win with **4 full property sets of different colors** + at least **$20M in Bank** + **all 3 of your Debt Chips**.
- **Complete Monopoly Deal: No Mercy Deck (112 cards)**:
  - 28 Property Cards across 10 color groups (Brown, Light Blue, Pink, Orange, Red, Yellow, Green, Dark Blue, Railroad, Utility)
  - 11 Property Wildcards (Dual-color & Rainbow)
  - 20 Money Cards ($1M to $10M)
  - 53 Action & Building Cards including:
    - *Pass Go* (Draw 2 cards)
    - *Double the Rent* (Stackable)
    - *Dual-Color & Wild Rent Cards*
    - *House & Hotel* (+ $3M / + $4M rent)
    - *Just Say No* (Action cancellation & counter)
    - *Super Sly Deal* (Steal complete set)
    - *Sly Deal* & *Forced Deal*
    - *Debt Collector*, *It's My Birthday*, *Yoink!*, *Repossess*, and *Tough Luck*
- **Tabletop Dark-Slate Theme**: Clean slate-900 tabletop aesthetic with vibrant Monopoly color palettes, card hover effects, live action logs, and victory modals.

---

## 📁 Project Structure

```
MONOPOLO DEAL NO MERCY/
├── shared/
│   ├── types.ts           # Shared TypeScript interfaces, enums, & socket events
│   ├── deckConfig.ts      # Complete 112-card deck generator & rent rules
│   ├── package.json
│   └── tsconfig.json
├── server/
│   ├── src/
│   │   ├── index.ts        # Express + Socket.IO server entry point
│   │   ├── roomManager.ts  # Room lifecycle, lobby state & socket events
│   │   ├── gameEngine.ts   # Deck dealing, card playing, turn progression
│   │   └── winCondition.ts # Victory validator for Standard & Extended modes
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── contexts/
│   │   │   └── SocketContext.tsx   # React Socket.IO connection provider
│   │   ├── components/
│   │   │   ├── LandingScreen.tsx   # Display name, Create/Join Room UI
│   │   │   ├── Lobby.tsx           # 2-6 player roster, host mode selector
│   │   │   ├── GameBoard.tsx       # Tabletop, private hand, bank & properties
│   │   │   ├── PlayerCard.tsx      # Player avatar, badges & ready state
│   │   │   ├── CardView.tsx        # Styled card renderer with actions
│   │   │   └── WinModal.tsx        # Victory celebration & breakdown modal
│   │   ├── App.tsx                 # Screen router & socket listener
│   │   ├── main.tsx                # React root mount
│   │   └── index.css               # Tailwind CSS & tabletop styling
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### 1. Install Dependencies

In the root directory, install server and client dependencies:

```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 2. Run in Development Mode

Run the backend and frontend in separate terminals (or with root concurrent script):

```bash
# Terminal 1: Start backend server (runs on http://localhost:3001)
cd server
npm run dev

# Terminal 2: Start frontend client (runs on http://localhost:5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Open multiple browser tabs or incognito windows to test 2 to 6 player multiplayer!
