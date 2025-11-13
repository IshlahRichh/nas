import express from 'express';
import {
    getAvailableDisks,
    getRaidStatus,
    checkMdadm,
    createRaid,
    mountRaid,
    unmountRaid,
    deleteRaid,
    getRaidDetail,
    getRaidProgress
} from '../controllers/raidController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// All RAID routes require authentication and admin access
router.use(verifyToken);
router.use(isAdmin);

// Get available disks
router.get('/disks', getAvailableDisks);

// Get RAID status/configurations
router.get('/status', getRaidStatus);

// Get RAID progress (rebuild/resync)
router.get('/progress', getRaidProgress);

// Check if mdadm is installed
router.get('/check-mdadm', checkMdadm);

// Get RAID detail by ID
router.get('/:id', getRaidDetail);

// Create RAID array
router.post('/create', createRaid);

// Mount RAID
router.post('/:id/mount', mountRaid);

// Unmount RAID
router.post('/:id/unmount', unmountRaid);

// Delete RAID (dangerous operation)
router.delete('/:id', deleteRaid);

export default router;
