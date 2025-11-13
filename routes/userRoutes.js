import express from 'express';
import { 
    getAllUsers, 
    getUser, 
    createUser, 
    updateUser, 
    deleteUser, 
    restoreUser, 
    getAllUsersIncludingInactive,
    assignFoldersToUser,
    getUserFolders,
    bulkImportUsers
} from '../controllers/userController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes (require authentication only)
router.get('/profile', verifyToken, getUser); // Get current user profile
router.put('/profile', verifyToken, updateUser); // Update current user profile

// Protected routes (require admin)
router.use(verifyToken, isAdmin);

router.get('/', getAllUsers);
router.get('/all', getAllUsersIncludingInactive); // Semua user termasuk yang tidak aktif
router.get('/:id', getUser);
router.get('/:userId/folders', getUserFolders); // Get user's folders
router.post('/', createUser);
router.post('/bulk-import', bulkImportUsers); // Bulk import users from Excel
router.post('/:userId/folders', assignFoldersToUser); // Assign folders to user
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/restore', restoreUser); // Restore user yang tidak aktif

export default router;