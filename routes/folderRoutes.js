import express from 'express';
import * as folderController from '../controllers/folderController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Folder routes
router.get('/', folderController.getAllFolders);
router.get('/:id', folderController.getFolderById);
router.post('/', folderController.createFolder);
router.put('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);
router.post('/:id/permissions', folderController.setFolderPermissions);

export default router;
