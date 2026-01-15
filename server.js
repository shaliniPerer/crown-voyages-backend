import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import resortRoutes from './routes/resortRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { initializeScheduler } from './utils/scheduler.js';

// Load environment variables
dotenv.config();

// Connect to Database
connectDB().then(() => {
  // Initialize scheduled tasks once DB is connected
  initializeScheduler();
});

// Initialize Express
const app = express();

/* -------------------- Security Middleware -------------------- */
app.use(helmet());

/* -------------------- CORS Configuration -------------------- */
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,
  'https://crown-voyages-frontend.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

/* -------------------- Body Parser -------------------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- Logging -------------------- */
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

/* -------------------- Rate Limiting -------------------- */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/* -------------------- Health Check -------------------- */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Resort Management API is running 🚀',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- API Routes -------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/resorts', resortRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);

/* -------------------- 404 Handler -------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* -------------------- Error Handler -------------------- */
app.use(errorHandler);

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode`);
  console.log(`🌐 Port: ${PORT}`);
  console.log(`🔗 Frontend: ${process.env.CLIENT_URL}`);
});
