import User from './User.js';
import Folder from './Folder.js';
import Permission from './Permission.js';
import TemperatureLog from './TemperatureLog.js';
import AppSettings from './AppSettings.js';
import RaidConfiguration from './RaidConfiguration.js';
import TransferLog from './TransferLog.js';

// Define relationships
User.hasMany(Folder, { foreignKey: 'owner_id', as: 'ownedFolders' });
Folder.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

User.belongsToMany(Folder, { through: Permission, foreignKey: 'user_id', as: 'sharedFolders' });
Folder.belongsToMany(User, { through: Permission, foreignKey: 'folder_id', as: 'sharedWith' });

// Permission relationships
Permission.belongsTo(Folder, { foreignKey: 'folder_id', as: 'folder' });
Permission.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// TransferLog relationships
TransferLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
TransferLog.belongsTo(Folder, { foreignKey: 'folder_id', as: 'folder' });

export {
    User,
    Folder,
    Permission,
    TemperatureLog,
    AppSettings,
    RaidConfiguration,
    TransferLog
};