require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const attachSignaling = require('./signaling');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const collaborationRequestRoutes = require('./routes/collaborationRequestRoutes');
const messageRoutes = require('./routes/messageRoutes');
const dealRoutes = require('./routes/dealRoutes');
const documentRoutes = require('./routes/documentRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Core middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // frontend (5173) and backend (5000) are different origins
})); // sets safer HTTP headers (X-Content-Type-Options, etc.)
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(mongoSanitize()); // strips $ and . from req.body/query/params to block NoSQL injection

// Rate limit auth endpoints specifically — the highest-value target for brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window per IP
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', collaborationRequestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong', error: err.message });
});

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);
attachSignaling(httpServer);
httpServer.listen(PORT, () => console.log(`Nexus server running on port ${PORT} (HTTP + WebRTC signaling)`));
