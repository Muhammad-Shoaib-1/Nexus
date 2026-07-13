const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * This is a SIGNALING server only. It never sees or touches audio/video —
 * it just relays connection-setup messages (offers, answers, ICE candidates)
 * between two browsers so they can establish a direct peer-to-peer WebRTC
 * connection. Once connected, video/audio flows browser-to-browser, not
 * through this server.
 */
function attachSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Require a valid JWT on socket connection, same as REST routes.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // --- Join a call room ---
    // roomId is computed identically on both clients (sorted pair of user
    // IDs), so both participants land in the same room without needing a
    // separate "create meeting link" step.
    socket.on('join-call', ({ roomId }) => {
      if (!roomId) return;

      // Tell the newly-joining socket about anyone already in the room,
      // so it can initiate a connection to them.
      const room = io.sockets.adapter.rooms.get(roomId);
      const existingPeers = [];
      if (room) {
        for (const socketId of room) {
          const other = io.sockets.sockets.get(socketId);
          if (other) existingPeers.push({ socketId: other.id, userId: other.userId });
        }
      }

      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.emit('existing-peers', { peers: existingPeers });

      // Tell everyone else already in the room that a new peer joined.
      socket.to(roomId).emit('peer-joined', { socketId: socket.id, userId: socket.userId });
    });

    // --- Relay WebRTC signaling data (SDP offers/answers, ICE candidates) ---
    // The server never inspects `data` — it's opaque WebRTC negotiation
    // payload, just forwarded to the intended peer.
    socket.on('signal', ({ targetSocketId, data }) => {
      if (!targetSocketId) return;
      io.to(targetSocketId).emit('signal', {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        data
      });
    });

    // --- Leave a call room ---
    socket.on('leave-call', ({ roomId }) => {
      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit('peer-left', { socketId: socket.id, userId: socket.userId });
      }
    });

    socket.on('disconnect', () => {
      if (socket.currentRoom) {
        socket.to(socket.currentRoom).emit('peer-left', { socketId: socket.id, userId: socket.userId });
      }
    });
  });

  return io;
}

module.exports = attachSignaling;
