import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db.js';

// Load routes
import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import widgetRoutes from './routes/widget.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all requests (important for iframe/embedded widget requests)
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/admin', adminRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date() });
});

// Optionally serve static assets if deployed as a single combined application
const distPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(distPath));

// Catch-all route to serve the Single Page App for front-end routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // If client is not built, return a friendly message
      res.status(200).send('SaaS Chatbot Server is running. Client is not compiled yet.');
    }
  });
});

// Initialize DB and start listening
async function startServer() {
  try {
    console.log('Initializing database...');
    await initDB();
    console.log('Database initialized successfully.');
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
