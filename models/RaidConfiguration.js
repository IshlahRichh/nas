import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const RaidConfiguration = sequelize.define('RaidConfiguration', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    raid_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    raid_type: {
        type: DataTypes.ENUM('RAID0', 'RAID1'),
        allowNull: false
    },
    disks: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of disk paths: ["/dev/sda", "/dev/sdb"]'
    },
    raid_device: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'RAID device path: /dev/md0'
    },
    mount_point: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'degraded', 'failed', 'creating'),
        defaultValue: 'inactive'
    },
    capacity: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Total capacity in human readable format'
    },
    is_mounted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    config_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional configuration data'
    }
}, {
    timestamps: true,
    tableName: 'raid_configurations'
});

export default RaidConfiguration;
