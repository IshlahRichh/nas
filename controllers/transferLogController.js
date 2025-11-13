import { TransferLog, User, Folder } from '../models/index.js';
import { Op } from 'sequelize';

// Create transfer log
export const createTransferLog = async (req, res) => {
    try {
        const {
            folder_id,
            transfer_type,
            file_name,
            file_size,
            file_path,
            duration,
            status,
            error_message,
            session_id,
            bytes_transferred,
            retries
        } = req.body;

        const user_id = req.user.id;
        const client_ip = req.ip || req.connection.remoteAddress;
        const user_agent = req.headers['user-agent'];

        // Calculate throughput in MB/s
        const throughput = duration > 0 
            ? ((bytes_transferred || file_size) / (1024 * 1024)) / (duration / 1000)
            : 0;

        const log = await TransferLog.create({
            user_id,
            folder_id,
            transfer_type,
            file_name,
            file_size,
            file_path,
            duration,
            throughput,
            status,
            error_message,
            client_ip,
            user_agent,
            session_id,
            bytes_transferred: bytes_transferred || file_size,
            retries: retries || 0
        });

        res.json({ 
            message: 'Transfer log created',
            log 
        });
    } catch (error) {
        console.error('Error creating transfer log:', error);
        res.status(500).json({ 
            message: 'Error creating transfer log', 
            error: error.message 
        });
    }
};

// Get all transfer logs (admin only)
export const getAllTransferLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            transfer_type,
            status,
            user_id,
            folder_id,
            start_date,
            end_date,
            session_id
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where clause
        const where = {};
        if (transfer_type) where.transfer_type = transfer_type;
        if (status) where.status = status;
        if (user_id) where.user_id = user_id;
        if (folder_id) where.folder_id = folder_id;
        if (session_id) where.session_id = session_id;

        if (start_date || end_date) {
            where.createdAt = {};
            if (start_date) where.createdAt[Op.gte] = new Date(start_date);
            if (end_date) where.createdAt[Op.lte] = new Date(end_date);
        }

        const { rows: logs, count } = await TransferLog.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Folder,
                    as: 'folder',
                    attributes: ['id', 'folder_name', 'path']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            logs,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching transfer logs:', error);
        res.status(500).json({ 
            message: 'Error fetching transfer logs', 
            error: error.message 
        });
    }
};

// Get user's transfer logs
export const getUserTransferLogs = async (req, res) => {
    try {
        const user_id = req.user.id;
        const {
            page = 1,
            limit = 50,
            transfer_type,
            status
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { user_id };
        if (transfer_type) where.transfer_type = transfer_type;
        if (status) where.status = status;

        const { rows: logs, count } = await TransferLog.findAndCountAll({
            where,
            include: [
                {
                    model: Folder,
                    as: 'folder',
                    attributes: ['id', 'folder_name', 'path']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        res.json({
            logs,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching user transfer logs:', error);
        res.status(500).json({ 
            message: 'Error fetching transfer logs', 
            error: error.message 
        });
    }
};

// Get transfer statistics
export const getTransferStatistics = async (req, res) => {
    try {
        const { start_date, end_date, user_id, session_id } = req.query;

        const where = {};
        if (user_id) where.user_id = user_id;
        if (session_id) where.session_id = session_id;

        if (start_date || end_date) {
            where.createdAt = {};
            if (start_date) where.createdAt[Op.gte] = new Date(start_date);
            if (end_date) where.createdAt[Op.lte] = new Date(end_date);
        }

        // Get all logs for calculation
        const logs = await TransferLog.findAll({
            where,
            attributes: [
                'transfer_type',
                'status',
                'file_size',
                'duration',
                'throughput',
                'bytes_transferred',
                'retries'
            ]
        });

        // Calculate statistics
        const stats = {
            total_transfers: logs.length,
            uploads: logs.filter(l => l.transfer_type === 'upload').length,
            downloads: logs.filter(l => l.transfer_type === 'download').length,
            successful: logs.filter(l => l.status === 'success').length,
            failed: logs.filter(l => l.status === 'failed').length,
            total_size: logs.reduce((sum, l) => sum + Number(l.file_size), 0),
            total_duration: logs.reduce((sum, l) => sum + Number(l.duration), 0),
            avg_throughput: 0,
            max_throughput: 0,
            min_throughput: 0,
            packet_loss_rate: 0,
            total_retries: logs.reduce((sum, l) => sum + Number(l.retries || 0), 0)
        };

        // Calculate throughput stats
        const validThroughputs = logs
            .map(l => Number(l.throughput))
            .filter(t => t > 0 && isFinite(t));

        if (validThroughputs.length > 0) {
            stats.avg_throughput = validThroughputs.reduce((sum, t) => sum + t, 0) / validThroughputs.length;
            stats.max_throughput = Math.max(...validThroughputs);
            stats.min_throughput = Math.min(...validThroughputs);
        }

        // Calculate packet loss rate
        const totalExpected = logs.reduce((sum, l) => sum + Number(l.file_size), 0);
        const totalActual = logs.reduce((sum, l) => sum + Number(l.bytes_transferred || l.file_size), 0);
        
        if (totalExpected > 0) {
            stats.packet_loss_rate = ((totalExpected - totalActual) / totalExpected) * 100;
        }

        // Success rate
        stats.success_rate = stats.total_transfers > 0 
            ? (stats.successful / stats.total_transfers) * 100 
            : 0;

        res.json(stats);
    } catch (error) {
        console.error('Error calculating transfer statistics:', error);
        res.status(500).json({ 
            message: 'Error calculating statistics', 
            error: error.message 
        });
    }
};

// Get session summary (for grouped transfers)
export const getSessionSummary = async (req, res) => {
    try {
        const { session_id } = req.params;

        const logs = await TransferLog.findAll({
            where: { session_id },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Folder,
                    as: 'folder',
                    attributes: ['id', 'folder_name', 'path']
                }
            ],
            order: [['createdAt', 'ASC']]
        });

        if (logs.length === 0) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const summary = {
            session_id,
            user: logs[0].user,
            folder: logs[0].folder,
            total_files: logs.length,
            total_size: logs.reduce((sum, l) => sum + Number(l.file_size), 0),
            total_duration: logs.reduce((sum, l) => sum + Number(l.duration), 0),
            successful_files: logs.filter(l => l.status === 'success').length,
            failed_files: logs.filter(l => l.status === 'failed').length,
            avg_throughput: 0,
            packet_loss_rate: 0,
            start_time: logs[0].createdAt,
            end_time: logs[logs.length - 1].createdAt,
            files: logs.map(l => ({
                file_name: l.file_name,
                file_size: l.file_size,
                duration: l.duration,
                throughput: l.throughput,
                status: l.status,
                timestamp: l.createdAt
            }))
        };

        // Calculate average throughput
        const validThroughputs = logs
            .map(l => Number(l.throughput))
            .filter(t => t > 0 && isFinite(t));

        if (validThroughputs.length > 0) {
            summary.avg_throughput = validThroughputs.reduce((sum, t) => sum + t, 0) / validThroughputs.length;
        }

        // Calculate packet loss
        const totalExpected = logs.reduce((sum, l) => sum + Number(l.file_size), 0);
        const totalActual = logs.reduce((sum, l) => sum + Number(l.bytes_transferred || l.file_size), 0);
        
        if (totalExpected > 0) {
            summary.packet_loss_rate = ((totalExpected - totalActual) / totalExpected) * 100;
        }

        res.json(summary);
    } catch (error) {
        console.error('Error fetching session summary:', error);
        res.status(500).json({ 
            message: 'Error fetching session summary', 
            error: error.message 
        });
    }
};

// Delete old logs (admin only - for maintenance)
export const deleteOldLogs = async (req, res) => {
    try {
        const { days = 30 } = req.body;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const result = await TransferLog.destroy({
            where: {
                createdAt: {
                    [Op.lt]: cutoffDate
                }
            }
        });

        res.json({ 
            message: `Deleted ${result} logs older than ${days} days`,
            deleted: result
        });
    } catch (error) {
        console.error('Error deleting old logs:', error);
        res.status(500).json({ 
            message: 'Error deleting logs', 
            error: error.message 
        });
    }
};

// Delete single log by ID (admin only)
export const deleteTransferLog = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await TransferLog.findByPk(id);
        if (!log) {
            return res.status(404).json({ message: 'Transfer log not found' });
        }

        await log.destroy();

        res.json({ 
            message: 'Transfer log deleted successfully',
            id: id
        });
    } catch (error) {
        console.error('Error deleting transfer log:', error);
        res.status(500).json({ 
            message: 'Error deleting log', 
            error: error.message 
        });
    }
};

// Delete all logs (admin only - dangerous!)
export const deleteAllLogs = async (req, res) => {
    try {
        const result = await TransferLog.destroy({
            where: {},
            truncate: true // This will reset auto-increment
        });

        res.json({ 
            message: 'All transfer logs deleted successfully',
            deleted: result
        });
    } catch (error) {
        console.error('Error deleting all logs:', error);
        res.status(500).json({ 
            message: 'Error deleting logs', 
            error: error.message 
        });
    }
};
