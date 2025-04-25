import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import photoRoutes from './routes/photoRoutes';
import identifyRoutes from './routes/identifyRoutes';
import { tier2Queue } from "./services/jobQueue";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // For handling large base64 images

// Debugging: Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request for ${req.url} from ${req.ip}`);
  next();
});

// Routes
app.use('/api/photos', photoRoutes);
app.use('/api/identify', identifyRoutes);

app.get('/api/queues/status', async (req, res) => {
  try {
    const counts = await tier2Queue.getJobCounts();
    res.json({ 
      queue: 'tier2', 
      status: 'ok',
      counts 
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 