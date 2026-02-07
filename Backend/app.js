const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const stockRoutes = require('./routes/stocks');
const orderRoutes = require('./routes/orders');
require('./db');

const app = express();
const server = http.createServer(app);

// ✅ FIXED CORS Configuration
const allowedOrigins = [
    "https://budget-hair-supply-chain.vercel.app",
    "http://localhost:3000",
];

const io = socketIo(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    },
});

const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());

// ✅ FIXED CORS middleware
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    })
);

// Rest of your code stays the same...
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/stock', stockRoutes);
app.use('/api/orders', orderRoutes);

io.on('connection', (socket) => {
    console.log('✅ WebSocket client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('❌ WebSocket client disconnected:', socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});