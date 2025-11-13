import express from 'express';
import { getAppSettings, updateAppSettings } from '../controllers/settingsController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route - anyone can get settings
router.get('/app', getAppSettings);

// Protected route - only admin can update
router.put('/app', verifyToken, isAdmin, updateAppSettings);

export default router;
