import express from 'express';
import * as transferLogController from '../controllers/transferLogController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create transfer log
router.post('/', transferLogController.createTransferLog);

// Get user's transfer logs
router.get('/my-logs', transferLogController.getUserTransferLogs);

// Get statistics
router.get('/statistics', transferLogController.getTransferStatistics);

// Get session summary
router.get('/session/:session_id', transferLogController.getSessionSummary);

// Admin routes
router.get('/all', isAdmin, transferLogController.getAllTransferLogs);
router.delete('/cleanup', isAdmin, transferLogController.deleteOldLogs);
router.delete('/all', isAdmin, transferLogController.deleteAllLogs);
router.delete('/:id', isAdmin, transferLogController.deleteTransferLog);

export default router;
