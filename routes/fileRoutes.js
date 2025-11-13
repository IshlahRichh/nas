import express from 'express';
import * as fileController from '../controllers/fileController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get user's accessible folders with files
router.get('/my-folders', fileController.getUserAccessibleFolders);

// Get files in a specific folder
router.get('/folder/:folderId', fileController.getFilesInFolder);

// Create subfolder
router.post('/folder/:folderId/create-folder', fileController.createSubfolder);

// Upload file (with multer middleware)
router.post('/folder/:folderId/upload', fileController.upload.single('file'), fileController.uploadFile);

// Download file
router.get('/folder/:folderId/download', fileController.downloadFile);

// Preview file - stream file content for inline display
router.get('/folder/:folderId/preview/:filename', fileController.previewFile);

// Rename file or folder
router.put('/folder/:folderId/rename', fileController.renameFileOrFolder);

// Delete file or folder
router.delete('/folder/:folderId/delete', fileController.deleteFileOrFolder);

export default router;
