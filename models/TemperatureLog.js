import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const TemperatureLog = sequelize.define('TemperatureLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    temperature: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false
});

export default TemperatureLog;