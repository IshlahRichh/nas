import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Permission = sequelize.define('Permission', {
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
    access_level: {
        type: DataTypes.STRING,
        defaultValue: 'read'
    }
}, {
    timestamps: true
});

export default Permission;