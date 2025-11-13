import { Folder, User } from '../models/index.js';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
const rmdir = promisify(fs.rmdir);
const rename = promisify(fs.rename);
const execPromise = promisify(exec);

// Helper function to create folder with sudo if needed
const createFolderWithSudo = async (folderPath) => {
    try {
        // First try without sudo - with 777 permission for full access
        await mkdir(folderPath, { recursive: true, mode: 0o777 });
        console.log(`Created folder without sudo: ${folderPath} (mode: 777)`);
        return { success: true, method: 'normal' };
    } catch (normalError) {
        console.log(`Normal mkdir failed: ${normalError.message}, trying with sudo...`);
        
        // If normal mkdir fails, try with sudo - using 777 for full access
        try {
            const { stdout, stderr } = await execPromise(`sudo mkdir -p -m 777 "${folderPath}"`);
            if (stderr && !stderr.includes('created')) {
                console.error('Sudo mkdir stderr:', stderr);
            }
            console.log(`Created folder with sudo: ${folderPath} (mode: 777)`);
            
            // Set ownership to current user
            try {
                await execPromise(`sudo chown ${process.env.USER || 'pi'}:${process.env.USER || 'pi'} "${folderPath}"`);
                console.log(`Changed ownership of ${folderPath}`);
            } catch (chownError) {
                console.warn('Could not change ownership:', chownError.message);
            }
            
            // Ensure all users can read, write, and execute
            try {
                await execPromise(`sudo chmod 777 "${folderPath}"`);
                console.log(`Set full permissions (777) on ${folderPath}`);
            } catch (chmodError) {
                console.warn('Could not set permissions:', chmodError.message);
            }
            
            return { success: true, method: 'sudo' };
        } catch (sudoError) {
            console.error('Sudo mkdir failed:', sudoError.message);
            throw sudoError;
        }
    }
};

// Get all folders
export const getAllFolders = async (req, res) => {
    try {
        const folders = await Folder.findAll({
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });
        res.json(folders);
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get single folder
export const getFolderById = async (req, res) => {
    try {
        const folder = await Folder.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'owner',
                attributes: ['id', 'name', 'email']
            }]
        });
        
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        
        res.json(folder);
    } catch (error) {
        console.error('Error fetching folder:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Create new folder
export const createFolder = async (req, res) => {
    try {
        const { folder_name, path: folderPath, owner_id } = req.body;

        // Validation
        if (!folder_name || !folderPath) {
            return res.status(400).json({ message: 'Folder name and path are required' });
        }

        // Sanitize path - remove double slashes
        const cleanPath = folderPath.replace(/\/+/g, '/');

        console.log('Creating folder:', {
            folder_name,
            original_path: folderPath,
            clean_path: cleanPath,
            owner_id
        });

        // Check if folder with same path already exists in database
        const existingFolder = await Folder.findOne({ where: { path: cleanPath } });
        if (existingFolder) {
            return res.status(400).json({ message: 'A folder with this path already exists in database' });
        }

        // Check if physical folder already exists
        let folderExists = false;
        try {
            await access(cleanPath, fs.constants.F_OK);
            folderExists = true;
            console.log(`Physical folder already exists: ${cleanPath}`);
        } catch (error) {
            console.log(`Physical folder doesn't exist yet: ${cleanPath}`);
        }

        // Create physical folder if it doesn't exist
        if (!folderExists) {
            try {
                console.log(`Attempting to create physical folder: ${cleanPath}`);
                
                // Try to create folder with sudo fallback
                const createResult = await createFolderWithSudo(cleanPath);
                console.log(`Successfully created physical folder: ${cleanPath} (method: ${createResult.method})`);
                
                // Verify folder was created
                try {
                    await access(cleanPath, fs.constants.F_OK);
                    console.log(`Verified folder exists: ${cleanPath}`);
                } catch (verifyError) {
                    console.error(`Folder creation verification failed: ${cleanPath}`, verifyError);
                    return res.status(500).json({ 
                        message: 'Folder was created but verification failed',
                        error: verifyError.message,
                        path: cleanPath
                    });
                }
            } catch (mkdirError) {
                console.error('Error creating physical folder:', {
                    path: cleanPath,
                    error: mkdirError.message,
                    code: mkdirError.code,
                    errno: mkdirError.errno,
                    syscall: mkdirError.syscall
                });
                
                return res.status(500).json({ 
                    message: 'Failed to create physical folder',
                    error: mkdirError.message,
                    code: mkdirError.code,
                    path: cleanPath,
                    suggestion: mkdirError.code === 'EACCES' 
                        ? 'Permission denied. Make sure RAID is mounted with write permissions or configure sudo passwordless for mkdir.'
                        : mkdirError.code === 'EROFS'
                        ? 'Read-only file system. Please remount RAID with read-write: sudo mount -o remount,rw /dev/md0 /mnt/RAID-ONE'
                        : 'Please check if the parent directory exists and is writable.'
                });
            }
        }

        // Use logged-in user as owner if not specified
        const ownerId = owner_id || req.user?.id || null;

        // Create folder entry in database
        const folder = await Folder.create({
            folder_name,
            path: cleanPath,
            owner_id: ownerId
        });

        console.log('Folder created successfully in database:', folder.id);

        res.status(201).json({
            ...folder.toJSON(),
            message: 'Folder created successfully',
            physical_path: cleanPath
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Update folder
export const updateFolder = async (req, res) => {
    try {
        const { folder_name, path, owner_id } = req.body;
        const folder = await Folder.findByPk(req.params.id);

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Validation
        if (!folder_name || !path) {
            return res.status(400).json({ message: 'Folder name and path are required' });
        }

        // Check if new path conflicts with existing folder
        if (path !== folder.path) {
            const existingFolder = await Folder.findOne({ 
                where: { 
                    path,
                    id: { [Op.ne]: folder.id }
                } 
            });
            if (existingFolder) {
                return res.status(400).json({ message: 'A folder with this path already exists' });
            }

            // Try to rename physical folder if path changed
            try {
                await access(folder.path, fs.constants.F_OK);
                // Old folder exists, try to rename/move it
                try {
                    await rename(folder.path, path);
                    console.log(`Renamed physical folder: ${folder.path} -> ${path}`);
                } catch (renameError) {
                    console.error('Error renaming physical folder:', renameError);
                    return res.status(500).json({ 
                        message: 'Failed to rename physical folder',
                        error: renameError.message 
                    });
                }
            } catch (accessError) {
                // Old folder doesn't exist, create new one
                try {
                    await mkdir(path, { recursive: true, mode: 0o777 });
                    console.log(`Created new physical folder: ${path} (mode: 777)`);
                } catch (mkdirError) {
                    console.error('Error creating new physical folder:', mkdirError);
                    return res.status(500).json({ 
                        message: 'Failed to create new physical folder',
                        error: mkdirError.message 
                    });
                }
            }
        }

        await folder.update({
            folder_name: folder_name || folder.folder_name,
            path: path || folder.path,
            owner_id: owner_id || folder.owner_id
        });

        res.json(folder);
    } catch (error) {
        console.error('Error updating folder:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Delete folder
export const deleteFolder = async (req, res) => {
    try {
        const folder = await Folder.findByPk(req.params.id);

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        const folderPath = folder.path;

        // Try to delete physical folder (only if empty)
        try {
            await access(folderPath, fs.constants.F_OK);
            // Folder exists, try to remove it
            try {
                // Use rmdir which only removes empty directories
                await rmdir(folderPath);
                console.log(`Deleted physical folder: ${folderPath}`);
            } catch (rmdirError) {
                if (rmdirError.code === 'ENOTEMPTY') {
                    console.warn(`Folder not empty, skipping physical deletion: ${folderPath}`);
                } else {
                    console.error('Error deleting physical folder:', rmdirError);
                }
                // Continue with database deletion even if physical deletion fails
            }
        } catch (accessError) {
            // Folder doesn't exist physically, that's okay
            console.log(`Physical folder doesn't exist: ${folderPath}`);
        }

        // Delete from database
        await folder.destroy();
        res.json({ 
            message: 'Folder deleted successfully',
            note: 'Physical folder only deleted if empty'
        });
    } catch (error) {
        console.error('Error deleting folder:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// Set folder permissions to allow all users full access
export const setFolderPermissions = async (req, res) => {
    try {
        const folder = await Folder.findByPk(req.params.id);

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        const folderPath = folder.path;

        try {
            // Check if folder exists
            await access(folderPath, fs.constants.F_OK);
            
            // Set permissions to 777 (rwxrwxrwx) so all users can read, write, execute
            try {
                await execPromise(`sudo chmod -R 777 "${folderPath}"`);
                console.log(`Set full permissions (777) recursively on ${folderPath}`);
                
                res.json({ 
                    message: 'Folder permissions updated successfully',
                    path: folderPath,
                    permissions: '777 (rwxrwxrwx)',
                    note: 'All users now have full read, write, and execute access'
                });
            } catch (chmodError) {
                console.error('Error setting folder permissions:', chmodError);
                return res.status(500).json({ 
                    message: 'Failed to set folder permissions',
                    error: chmodError.message 
                });
            }
        } catch (accessError) {
            return res.status(404).json({ 
                message: 'Physical folder not found',
                path: folderPath
            });
        }
    } catch (error) {
        console.error('Error setting folder permissions:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
