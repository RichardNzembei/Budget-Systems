const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const stockRoutes = require('./routes/stocks');
const orderRoutes = require('./routes/orders');
require('./db'); // Test MySQL connection on startup

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
        "https://budget-hair-supply-chain.vercel.app",
      "http://localhost:3000",
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(
    cors({
      origin: [
          "https://budget-hair-supply-chain.vercel.app",
        "http://localhost:3000",
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    })
);

// Attach Socket.IO to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/stock', stockRoutes);
app.use('/api/orders', orderRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('✅ WebSocket client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('❌ WebSocket client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});