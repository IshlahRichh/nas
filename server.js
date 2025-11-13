import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sequelize from './config/database.js';
import { User, Folder, Permission, TemperatureLog, RaidConfiguration, TransferLog } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import temperatureRoutes from './routes/temperatureRoutes.js';
import raidRoutes from './routes/raidRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import transferLogRoutes from './routes/transferLogRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.11.46:5173', 'http://192.168.11.47:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limit for base64 images (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Error handling middleware must be after all routes
process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/temperature', temperatureRoutes);
app.use('/api/raid', raidRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/transfer-logs', transferLogRoutes);

// Root route
app.get('/', (req, res) => {
    res.json({ message: 'NAS System API' });
});

// Health check route
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Test database route
app.get('/test-db', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Your existing temperature endpoint
app.get('/temperature', (req, res) => {
    measureTemperature((err, temperature) => {
        if (err) {
            console.error('Error reading temperature data:', err);
            res.status(500).json({ error: 'Could not read temperature data' });
        } else {
            res.set('Access-Control-Allow-Origin', '*');
            res.json({ temperature });
        }
    });
});

// Error handling middleware - should be after all routes
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404s
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Sync database and start server
sequelize.sync()
    .then(() => {
        console.log('✅ All models synchronized');
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`API root: hhttp://192.168.14.73:${PORT}`);
            console.log(`API status: http://192.168.14.73:${PORT}/api/status`);
        });
    })
    .catch(err => {
        console.error('❌ Error syncing database:', err);
        process.exit(1);
    });