import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const AppSettings = sequelize.define('AppSettings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    app_name: {
        type: DataTypes.STRING,
        defaultValue: 'NAS System'
    },
    app_logo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Base64 encoded logo image'
    },
    app_favicon: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Base64 encoded favicon image'
    },
    app_description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'AppSettings'
});

export default AppSettings;
