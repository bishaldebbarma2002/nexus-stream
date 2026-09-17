const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS enable taaki local aur hosted dono jagah bina kisi error ke chale
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  } 
});

let waitingSocket = null;

io.on('connection', (socket) => {
  // User tab aayega jab peer ID generate ho jayegi
  socket.on('find-match', (peerId) => {
    socket.peerId = peerId;

    if (waitingSocket && waitingSocket.id !== socket.id) {
      const partnerSocket = waitingSocket;
      waitingSocket = null;

      // Link both users
      socket.partnerId = partnerSocket.id;
      partnerSocket.partnerId = socket.id;

      // Match found event send karein
      socket.emit('match-found', { partnerPeerId: partnerSocket.peerId, initiator: true });
      partnerSocket.emit('match-found', { partnerPeerId: socket.peerId, initiator: false });
    } else {
      waitingSocket = socket;
      socket.emit('waiting');
    }
  });

  // Next/Skip button click hone par
  socket.on('skip', () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('partner-disconnected');
      const partner = io.sockets.sockets.get(socket.partnerId);
      if (partner) partner.partnerId = null;
      socket.partnerId = null;
    }
    
    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
    }
  });

  // Connection close hone par
  socket.on('disconnect', () => {
    if (socket.partnerId) {
      io.to(socket.partnerId).emit('partner-disconnected');
    }
    if (waitingSocket && waitingSocket.id === socket.id) {
      waitingSocket = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`NexusStream Server running on port ${PORT}`));