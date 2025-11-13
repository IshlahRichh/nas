import express from 'express';
import { getCurrentTemperature, getTemperatureHistory, getTemperatureStats } from '../controllers/temperatureController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All temperature routes require authentication
router.use(verifyToken);

// Get current temperature
router.get('/current', getCurrentTemperature);

// Get temperature history
router.get('/history', getTemperatureHistory);

// Get temperature statistics
router.get('/stats', getTemperatureStats);

export default router;
