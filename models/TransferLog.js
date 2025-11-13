import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TransferLog = sequelize.define('TransferLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    folder_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    transfer_type: {
        type: DataTypes.ENUM('upload', 'download'),
        allowNull: false
    },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Size in bytes'
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Duration in milliseconds'
    },
    throughput: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Throughput in MB/s'
    },
    status: {
        type: DataTypes.ENUM('success', 'failed', 'partial'),
        allowNull: false,
        defaultValue: 'success'
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    client_ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IPv4 or IPv6'
    },
    user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    session_id: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Group multiple transfers in one session'
    },
    bytes_transferred: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Actual bytes transferred (for packet loss calculation)'
    },
    retries: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Number of retry attempts'
    }
}, {
    tableName: 'transfer_logs',
    timestamps: true,
    indexes: [
        {
            fields: ['user_id']
        },
        {
            fields: ['transfer_type']
        },
        {
            fields: ['status']
        },
        {
            fields: ['createdAt']
        },
        {
            fields: ['session_id']
        }
    ]
});

export default TransferLog;
