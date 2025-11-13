import bcrypt from 'bcrypt';
import User from '../models/User.js';
// Optional image processing. sharp is an optional dependency; if it's not installed we will skip resizing.
let sharp;
try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    sharp = await import('sharp');
    // sharp imported as module namespace; use default if present
    sharp = sharp.default || sharp;
} catch (err) {
    console.warn('sharp not installed — uploaded avatars will not be resized. Run `npm install sharp` to enable resizing.');
    sharp = null;
}
/**
 * Resize and compress a base64 data URL image to a reasonable size for DB storage.
 * Returns a data URL (jpeg) string.
 */
const processBase64Image = async (dataUrl, maxWidth = 512) => {
    if (!dataUrl || typeof dataUrl !== 'string') return dataUrl;
    if (!dataUrl.startsWith('data:')) return dataUrl; // probably a URL

    if (!sharp) return dataUrl; // no sharp available

    try {
        const matches = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
        if (!matches) return dataUrl;

        const mime = matches[1];
        const base64Data = matches[3];
        const buffer = Buffer.from(base64Data, 'base64');

        // Use sharp to resize and convert to jpeg for consistent smaller size
        const image = sharp(buffer);
        const metadata = await image.metadata();

        const width = metadata.width || maxWidth;
        const resizeWidth = Math.min(width, maxWidth);

        const outputBuffer = await image
            .resize({ width: resizeWidth })
            .jpeg({ quality: 75 })
            .toBuffer();

        const outBase64 = outputBuffer.toString('base64');
        return `data:image/jpeg;base64,${outBase64}`;
    } catch (err) {
        console.warn('Error processing base64 image:', err.message || err);
        return dataUrl; // fallback to original
    }
};
import { Permission, Folder } from '../models/index.js';

export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            where: {
                is_active: true  // Hanya tampilkan user yang aktif
            }
        });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
};

export const getUser = async (req, res) => {
    try {
        // If called from /profile route, use logged-in user's ID from token
        // If called from /:id route, use params (admin only)
        const userId = req.params.id || req.user.id;
        
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ message: 'Error fetching user', error: err.message });
    }
};

export const createUser = async (req, res) => {
    try {
        const { name, email, password, role = 'user', avatar } = req.body;

        let processedAvatar = null;
        if (avatar) {
            // If avatar looks like a data URL, attempt to resize/compress it.
            if (typeof avatar === 'string' && avatar.startsWith('data:')) {
                processedAvatar = await processBase64Image(avatar);
            } else {
                processedAvatar = avatar;
            }
        }

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with is_active = true. Accept avatar if provided.
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            is_active: true,
            avatar: processedAvatar || null
        });

        // Remove password from response
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { name, email, password, role, avatar } = req.body;
        // Debug logging to help identify avatar update issues
        console.log('>>> updateUser called. user param id:', req.params.id, 'auth user id:', req.user && req.user.id);
        console.log('>>> Payload preview (avatar length if set):', avatar ? (typeof avatar === 'string' ? avatar.length : typeof avatar) : 'undefined');
        // If called from /profile route, use logged-in user's ID from token
        // If called from /:id route, use params (admin only)
        const userId = req.params.id || req.user.id;

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent non-admin from changing their own role
        if (!req.params.id && role && role !== user.role) {
            return res.status(403).json({ message: 'You cannot change your own role' });
        }

        // Update user data
        const updateData = {
            name: name || user.name,
            email: email || user.email
        };

        // Only admin can change role
        if (req.params.id && role) {
            updateData.role = role;
        }

        // Update avatar if provided. Treat empty string or null as removal (set to NULL)
        if (avatar !== undefined) {
            if (avatar === '' || avatar === null) {
                updateData.avatar = null;
            } else {
                // If avatar is a data URL, process it (resize/compress) before saving.
                if (typeof avatar === 'string' && avatar.startsWith('data:')) {
                    try {
                        const processed = await processBase64Image(avatar);
                        updateData.avatar = processed;
                    } catch (err) {
                        console.warn('Failed to process avatar image, saving original:', err.message || err);
                        updateData.avatar = avatar;
                    }
                } else {
                    updateData.avatar = avatar;
                }
            }
        }

        // If password is provided, hash it
        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

    // Update user
    await user.update(updateData);

    console.log('>>> updateUser - updateData applied keys:', Object.keys(updateData));

        // Get updated user without password
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password'] }
        });

        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is already inactive
        if (!user.is_active) {
            return res.status(400).json({ message: 'User is already inactive' });
        }

        // Prevent deleting the last active admin
        if (user.role === 'admin') {
            const adminCount = await User.count({ 
                where: { 
                    role: 'admin',
                    is_active: true 
                } 
            });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last active admin user' });
            }
        }

        // Soft delete: set is_active to false instead of destroying
        await user.update({ is_active: false });
        
        res.json({ 
            message: 'User deactivated successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                is_active: false
            }
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};

// Fungsi untuk restore user yang sudah di-deactivate
export const restoreUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.is_active) {
            return res.status(400).json({ message: 'User is already active' });
        }

        await user.update({ is_active: true });
        
        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({ 
            message: 'User restored successfully',
            user: userResponse
        });
    } catch (err) {
        console.error('Error restoring user:', err);
        res.status(500).json({ message: 'Error restoring user', error: err.message });
    }
};

// Fungsi untuk mendapatkan semua user termasuk yang tidak aktif (untuk admin)
export const getAllUsersIncludingInactive = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
};

// Assign folders to user
export const assignFoldersToUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { folderIds, folderPermissions } = req.body; // Array of folder IDs and optional permissions object

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete existing permissions for this user
        await Permission.destroy({ where: { user_id: userId } });

        // Create new permissions
        if (folderIds && folderIds.length > 0) {
            const permissions = folderIds.map(folderId => ({
                user_id: userId,
                folder_id: folderId,
                // Use specific permission if provided, otherwise default to 'write' for full control
                access_level: folderPermissions?.[folderId] || 'write'
            }));
            await Permission.bulkCreate(permissions);
        }

        res.json({ message: 'Folders assigned successfully' });
    } catch (err) {
        console.error('Error assigning folders:', err);
        res.status(500).json({ message: 'Error assigning folders', error: err.message });
    }
};

// Get user's assigned folders
export const getUserFolders = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            include: [{
                model: Folder,
                as: 'sharedFolders',
                through: { attributes: ['access_level'] }
            }]
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.sharedFolders || []);
    } catch (err) {
        console.error('Error fetching user folders:', err);
        res.status(500).json({ message: 'Error fetching user folders', error: err.message });
    }
};

// Bulk import users from Excel data
export const bulkImportUsers = async (req, res) => {
    try {
        const { users } = req.body; // Array of user objects from Excel

        if (!users || !Array.isArray(users) || users.length === 0) {
            return res.status(400).json({ message: 'No users data provided' });
        }

        const results = {
            success: [],
            failed: []
        };

        for (const userData of users) {
            try {
                const { name, email, password, role } = userData;

                // Validation
                if (!name || !email || !password) {
                    results.failed.push({
                        email: email || 'unknown',
                        reason: 'Missing required fields (name, email, or password)'
                    });
                    continue;
                }

                // Check if user exists
                const existingUser = await User.findOne({ where: { email } });
                if (existingUser) {
                    results.failed.push({
                        email,
                        reason: 'User already exists'
                    });
                    continue;
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Create user
                const newUser = await User.create({
                    name,
                    email,
                    password: hashedPassword,
                    role: role || 'user',
                    is_active: true
                });

                results.success.push({
                    email,
                    name,
                    id: newUser.id
                });
            } catch (err) {
                results.failed.push({
                    email: userData.email || 'unknown',
                    reason: err.message
                });
            }
        }

        res.json({
            message: 'Bulk import completed',
            summary: {
                total: users.length,
                success: results.success.length,
                failed: results.failed.length
            },
            results
        });
    } catch (err) {
        console.error('Error bulk importing users:', err);
        res.status(500).json({ message: 'Error bulk importing users', error: err.message });
    }
};