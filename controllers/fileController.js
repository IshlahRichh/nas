import { Folder, Permission, TransferLog } from '../models/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get user's accessible folders with files
export const getUserAccessibleFolders = async (req, res) => {
    try {
        const userId = req.user.id; // From JWT token

        // Get folders user has access to via permissions
        const permissions = await Permission.findAll({
            where: { user_id: userId },
            include: [{
                model: Folder,
                as: 'folder'
            }]
        });

        const folders = [];
        for (const perm of permissions) {
            const folder = perm.folder;
            if (!folder) continue;

            const folderPath = folder.path;
            
            try {
                // Check if folder exists
                await fs.access(folderPath);
                
                // Read folder contents
                const files = await fs.readdir(folderPath, { withFileTypes: true });
                const fileList = await Promise.all(files.map(async (file) => {
                    const filePath = path.join(folderPath, file.name);
                    const stats = await fs.stat(filePath);
                    
                    return {
                        name: file.name,
                        type: file.isDirectory() ? 'folder' : 'file',
                        size: stats.size,
                        modified: stats.mtime,
                        path: filePath
                    };
                }));

                folders.push({
                    id: folder.id,
                    name: folder.folder_name,
                    path: folder.path,
                    access_level: perm.access_level,
                    files: fileList
                });
            } catch (err) {
                console.error(`Error reading folder ${folderPath}:`, err);
                // Folder doesn't exist or not accessible
                folders.push({
                    id: folder.id,
                    name: folder.folder_name,
                    path: folder.path,
                    access_level: perm.access_level,
                    files: [],
                    error: 'Folder not accessible'
                });
            }
        }

        res.json(folders);
    } catch (error) {
        console.error('Error fetching user folders:', error);
        res.status(500).json({ message: 'Error fetching folders', error: error.message });
    }
};

// Get files in a specific folder
export const getFilesInFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check permission
        let permission = null;
        let accessLevel = 'write'; // Default for admin

        if (!isAdmin) {
            permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }
            accessLevel = permission.access_level;
        }

        const subPath = req.query.path || ''; // For navigating subfolders
        const fullPath = path.join(folder.path, subPath);

        console.log('📂 getFilesInFolder:', {
            folderId,
            userId,
            isAdmin,
            folderPath: folder.path,
            subPath,
            fullPath
        });

        // Security check: ensure path is within folder
        if (!fullPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        try {
            await fs.access(fullPath);
            const files = await fs.readdir(fullPath, { withFileTypes: true });
            
            const fileList = await Promise.all(files.map(async (file) => {
                const filePath = path.join(fullPath, file.name);
                const stats = await fs.stat(filePath);
                const relativePath = path.join(subPath, file.name);
                
                return {
                    name: file.name,
                    type: file.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    relativePath: relativePath
                };
            }));

            console.log('✅ Files retrieved:', {
                count: fileList.length,
                files: fileList.map(f => ({
                    name: f.name,
                    type: f.type,
                    relativePath: f.relativePath
                }))
            });

            res.json({
                folder: {
                    id: folder.id,
                    name: folder.folder_name,
                    path: subPath || '/',
                    access_level: accessLevel
                },
                files: fileList
            });
        } catch (err) {
            console.error('❌ Error reading folder:', err);
            res.status(404).json({ message: 'Folder not found or not accessible' });
        }
    } catch (error) {
        console.error('❌ Error fetching files:', error);
        res.status(500).json({ message: 'Error fetching files', error: error.message });
    }
};

// Create subfolder in user's folder
export const createSubfolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { folderName, subPath = '' } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!folderName) {
            return res.status(400).json({ message: 'Folder name is required' });
        }

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check write permission
        if (!isAdmin) {
            const permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }

            if (permission.access_level === 'read') {
                return res.status(403).json({ message: 'You only have read access to this folder' });
            }
        }

        const newFolderPath = path.join(folder.path, subPath, folderName);

        // Security check
        if (!newFolderPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        // Create folder
        await fs.mkdir(newFolderPath, { recursive: true });

        res.json({ 
            message: 'Folder created successfully',
            path: path.join(subPath, folderName)
        });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ message: 'Error creating folder', error: error.message });
    }
};

// Delete file or folder
export const deleteFileOrFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { filePath } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!filePath) {
            return res.status(400).json({ message: 'File path is required' });
        }

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check write permission
        if (!isAdmin) {
            const permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }

            if (permission.access_level === 'read') {
                return res.status(403).json({ message: 'You only have read access to this folder' });
            }
        }

        const fullPath = path.join(folder.path, filePath);

        // Security check
        if (!fullPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        // Check if file/folder exists
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            // Delete folder recursively
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            // Delete file
            await fs.unlink(fullPath);
        }

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting:', error);
        res.status(500).json({ message: 'Error deleting', error: error.message });
    }
};

// Download file
export const downloadFile = async (req, res) => {
    const startTime = Date.now();
    const fileName = req.query.path?.split('/').pop() || 'unknown';
    
    try {
        const { folderId } = req.params;
        const filePath = req.query.path;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!filePath) {
            return res.status(400).json({ message: 'File path is required' });
        }

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check permission
        if (!isAdmin) {
            const permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }
        }

        const fullPath = path.join(folder.path, filePath);

        // Security check
        if (!fullPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        // Check if file exists
        await fs.access(fullPath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            return res.status(400).json({ message: 'Cannot download a folder' });
        }

        // Send file and log on finish
        res.on('finish', async () => {
            const duration = Math.max(Date.now() - startTime, 1); // Minimum 1ms
            const throughput = (stats.size / (1024 * 1024)) / (duration / 1000);
            const validThroughput = (!isFinite(throughput) || isNaN(throughput)) ? 0 : throughput;

            try {
                await TransferLog.create({
                    user_id: userId,
                    folder_id: folderId,
                    transfer_type: 'download',
                    file_name: fileName,
                    file_size: stats.size,
                    file_path: filePath,
                    duration: duration,
                    throughput: validThroughput,
                    status: 'success',
                    client_ip: req.ip || req.connection.remoteAddress,
                    user_agent: req.headers['user-agent'],
                    bytes_transferred: stats.size,
                    retries: 0
                });
                console.log(`✅ Download log created: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB, ${validThroughput.toFixed(2)} MB/s, ${duration}ms)`);
            } catch (logError) {
                console.error('❌ Error creating download log:', logError.message);
            }
        });

        res.download(fullPath);
    } catch (error) {
        const duration = Math.max(Date.now() - startTime, 1);

        // Log failed download
        try {
            await TransferLog.create({
                user_id: req.user.id,
                folder_id: req.params.folderId,
                transfer_type: 'download',
                file_name: fileName,
                file_size: 0,
                file_path: req.query.path || '',
                duration: duration,
                throughput: 0,
                status: 'failed',
                error_message: error.message,
                client_ip: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                bytes_transferred: 0
            });
            console.log(`❌ Failed download logged: ${fileName}`);
        } catch (logError) {
            console.error('Error creating transfer log:', logError.message);
        }

        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file', error: error.message });
    }
};

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Mark upload start time when multer begins processing
            if (!req.uploadStartTime) {
                req.uploadStartTime = Date.now();
            }

            const { folderId } = req.params;
            const subPath = req.body.subPath || '';
            const userId = req.user.id;
            const isAdmin = req.user.role === 'admin';

            // Get folder info
            const folder = await Folder.findByPk(folderId);
            if (!folder) {
                return cb(new Error('Folder not found'));
            }

            // For non-admin users, check write permission
            if (!isAdmin) {
                const permission = await Permission.findOne({
                    where: { 
                        user_id: userId,
                        folder_id: folderId
                    }
                });

                if (!permission || permission.access_level === 'read') {
                    return cb(new Error('Access denied'));
                }
            }

            const uploadPath = path.join(folder.path, subPath);

            // Security check
            if (!uploadPath.startsWith(folder.path)) {
                return cb(new Error('Invalid path'));
            }

            // Create directory if it doesn't exist
            await fs.mkdir(uploadPath, { recursive: true });

            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Use original filename
        cb(null, file.originalname);
    }
});

export const upload = multer({ 
    storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 5 // 5GB max file size
    }
});

// Upload file handler
export const uploadFile = async (req, res) => {
    // Use startTime from multer storage (when upload actually started)
    const startTime = req.uploadStartTime || Date.now();
    let uploadedFile = null;
    
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        uploadedFile = req.file;
        
        // Calculate metrics after upload completes (use actual upload duration)
        const duration = Math.max(Date.now() - startTime, 1); // Minimum 1ms to avoid division by zero
        const throughput = (uploadedFile.size / (1024 * 1024)) / (duration / 1000);
        
        // Validate throughput (avoid Infinity or NaN)
        const validThroughput = (!isFinite(throughput) || isNaN(throughput)) ? 0 : throughput;

        console.log(`⏱️ Upload timing: ${uploadedFile.originalname} - Start: ${startTime}, End: ${Date.now()}, Duration: ${duration}ms`);

        // Send success response
        res.json({ 
            message: 'File uploaded successfully',
            file: {
                name: uploadedFile.originalname,
                size: uploadedFile.size,
                path: req.body.subPath || '/',
                duration: duration,
                throughput: validThroughput.toFixed(2) + ' MB/s'
            }
        });

        // Log transfer after response (non-blocking)
        try {
            await TransferLog.create({
                user_id: req.user.id,
                folder_id: req.params.folderId,
                transfer_type: 'upload',
                file_name: uploadedFile.originalname,
                file_size: uploadedFile.size,
                file_path: req.body.subPath || '/',
                duration: duration,
                throughput: validThroughput,
                status: 'success',
                client_ip: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                session_id: req.body.session_id || null,
                bytes_transferred: uploadedFile.size,
                retries: 0
            });
            console.log(`✅ Transfer log created: ${uploadedFile.originalname} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB, ${validThroughput.toFixed(2)} MB/s, ${duration}ms)`);
        } catch (logError) {
            console.error('❌ Error creating transfer log:', logError.message);
            // Don't fail the upload if logging fails
        }
        
    } catch (error) {
        const duration = Math.max(Date.now() - startTime, 1);
        
        // Log failed transfer
        try {
            await TransferLog.create({
                user_id: req.user.id,
                folder_id: req.params.folderId,
                transfer_type: 'upload',
                file_name: uploadedFile?.originalname || 'unknown',
                file_size: uploadedFile?.size || 0,
                file_path: req.body.subPath || '/',
                duration: duration,
                throughput: 0,
                status: 'failed',
                error_message: error.message,
                client_ip: req.ip || req.connection.remoteAddress,
                user_agent: req.headers['user-agent'],
                bytes_transferred: 0
            });
            console.log(`❌ Failed transfer logged: ${uploadedFile?.originalname || 'unknown'}`);
        } catch (logError) {
            console.error('Error creating transfer log:', logError.message);
        }

        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
};

// Rename file or folder
export const renameFileOrFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { oldPath, newName } = req.body;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!oldPath || !newName) {
            return res.status(400).json({ message: 'Old path and new name are required' });
        }

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check write permission
        if (!isAdmin) {
            const permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }

            if (permission.access_level === 'read') {
                return res.status(403).json({ message: 'You only have read access to this folder' });
            }
        }

        const fullOldPath = path.join(folder.path, oldPath);
        const newPath = path.join(path.dirname(fullOldPath), newName);

        // Security check
        if (!fullOldPath.startsWith(folder.path) || !newPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        // Rename
        await fs.rename(fullOldPath, newPath);

        res.json({ 
            message: 'Renamed successfully',
            newPath: path.relative(folder.path, newPath)
        });
    } catch (error) {
        console.error('Error renaming:', error);
        res.status(500).json({ message: 'Error renaming', error: error.message });
    }
};

// Preview file - stream file content with appropriate headers
export const previewFile = async (req, res) => {
    try {
        const { folderId, filename } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const subPath = req.query.path || '';

        // Get folder info
        const folder = await Folder.findByPk(folderId);
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // For non-admin users, check permission
        if (!isAdmin) {
            const permission = await Permission.findOne({
                where: { 
                    user_id: userId,
                    folder_id: folderId
                }
            });

            if (!permission) {
                return res.status(403).json({ message: 'Access denied to this folder' });
            }
        }

        const fullPath = path.join(folder.path, subPath, filename);

        // Security check: ensure path is within folder
        if (!fullPath.startsWith(folder.path)) {
            return res.status(403).json({ message: 'Invalid path' });
        }

        try {
            // Check if file exists
            await fs.access(fullPath);
            const stats = await fs.stat(fullPath);

            if (!stats.isFile()) {
                return res.status(400).json({ message: 'Not a file' });
            }

            // Get file extension for MIME type
            const ext = path.extname(filename).toLowerCase();
            const mimeTypes = {
                // Images
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
                '.ico': 'image/x-icon',
                // Documents
                '.pdf': 'application/pdf',
                // Videos
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.ogg': 'video/ogg',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                // Audio
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.ogg': 'audio/ogg',
                '.m4a': 'audio/mp4',
                // Text
                '.txt': 'text/plain; charset=utf-8',
                '.json': 'application/json; charset=utf-8',
                '.xml': 'application/xml; charset=utf-8',
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'text/javascript; charset=utf-8',
                '.csv': 'text/csv; charset=utf-8',
                '.md': 'text/markdown; charset=utf-8',
                '.log': 'text/plain; charset=utf-8'
            };

            const mimeType = mimeTypes[ext] || 'application/octet-stream';

            // Set headers for inline display (preview)
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
            
            // Add cache headers for better performance
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            res.setHeader('Last-Modified', stats.mtime.toUTCString());

            // Stream the file
            const readStream = (await import('fs')).createReadStream(fullPath);
            readStream.pipe(res);

            readStream.on('error', (err) => {
                console.error('Error streaming file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error streaming file' });
                }
            });

        } catch (err) {
            console.error('Error accessing file:', err);
            res.status(404).json({ message: 'File not found' });
        }
    } catch (error) {
        console.error('Error previewing file:', error);
        res.status(500).json({ message: 'Error previewing file', error: error.message });
    }
};
