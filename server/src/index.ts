// ============================================================================
// Monopoly Deal: No Mercy — Server Entry Point
// ============================================================================
// Express + Socket.IO server. Handles HTTP health checks, serves static
// client build in production, and delegates real-time game logic to roomManager.
// ============================================================================

import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import { registerRoomEvents } from './roomManager';

// ---------------------------------------------------------------------------
//  Configuration
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

// ---------------------------------------------------------------------------
//  Express App
// ---------------------------------------------------------------------------

const app = express();

// Enable JSON body parsing and CORS
app.use(cors({ origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN }));
app.use(express.json());

/**
 * GET /api/health
 * Simple liveness probe — returns 200 with server metadata.
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Monopoly Deal: No Mercy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
//  Static File Serving (Production Frontend)
// ---------------------------------------------------------------------------

const possibleDistPaths = [
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
];

const clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p));

if (clientDistPath) {
  console.log(`[server] Serving static frontend build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// ---------------------------------------------------------------------------
//  HTTP + Socket.IO Server
// ---------------------------------------------------------------------------

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN === '*' ? true : CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// Register all Socket.IO event handlers (room creation, joining, gameplay, …)
io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);
  registerRoomEvents(io, socket);
});

// ---------------------------------------------------------------------------
//  Start Listening
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  Monopoly Deal: No Mercy — Server                   ║
║  Listening on http://localhost:${PORT}                  ║
║  CORS Origin: ${CLIENT_ORIGIN}                                     ║
╚══════════════════════════════════════════════════════╝
  `);
});
