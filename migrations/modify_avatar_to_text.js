import sequelize from '../config/database.js';

async function modifyAvatarColumn() {
    try {
        const dialect = sequelize.getDialect();
        console.log('Database dialect detected:', dialect);

        if (dialect === 'mysql' || dialect === 'mariadb') {
            await sequelize.query(`ALTER TABLE Users MODIFY COLUMN avatar TEXT NULL`);
        } else if (dialect === 'postgres') {
            await sequelize.query(`ALTER TABLE "Users" ALTER COLUMN avatar TYPE TEXT`);
        } else if (dialect === 'sqlite') {
            console.log('SQLite detected. ALTER COLUMN is not supported directly.');
            console.log('Please run a manual migration: create new table with avatar TEXT, copy rows, drop old table, rename new table.');
            process.exit(0);
        } else {
            console.log('Unsupported dialect for automated migration:', dialect);
            process.exit(1);
        }

        console.log('✅ avatar column modified to TEXT successfully');
        process.exit(0);
    } catch (error) {
        if (error.message && (error.message.includes('Duplicate column name') || error.message.includes('already exists'))) {
            console.log('⚠️ avatar column already modified or exists as TEXT');
            process.exit(0);
        }
        console.error('❌ Error modifying avatar column:', error);
        process.exit(1);
    }
}

modifyAvatarColumn();
