import sequelize from '../config/database.js';

async function ensureAvatarMediumText() {
    try {
        const dialect = sequelize.getDialect();
        console.log('Detected dialect:', dialect);

        if (dialect === 'mysql' || dialect === 'mariadb') {
            // Check current column type
            const [rows] = await sequelize.query("SHOW FULL COLUMNS FROM `Users` LIKE 'avatar'");
            if (!rows || rows.length === 0) {
                console.log('Could not find avatar column in Users table');
                process.exit(1);
            }
            const type = rows[0].Type;
            console.log('Current avatar column type:', type);

            if (!/text/i.test(type) || /varchar/i.test(type)) {
                console.log('Altering avatar column to MEDIUMTEXT...');
                await sequelize.query('ALTER TABLE `Users` MODIFY COLUMN `avatar` MEDIUMTEXT NULL');
                console.log('✅ avatar column changed to MEDIUMTEXT');
            } else {
                console.log('avatar column already a TEXT type, no action needed');
            }
        } else if (dialect === 'postgres') {
            const [rows] = await sequelize.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'Users' AND column_name = 'avatar'");
            console.log('Query result:', rows);
            // Postgres TEXT is unbounded; nothing to change
            console.log('Postgres detected — TEXT supports large values, no change required');
        } else if (dialect === 'sqlite') {
            console.log('SQLite detected. ALTER COLUMN not supported directly.');
            console.log('If avatar column is VARCHAR, consider recreating table with avatar as TEXT.');
        } else {
            console.log('Unsupported dialect for automated migration:', dialect);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error ensuring avatar column type:', err);
        process.exit(1);
    }
}

ensureAvatarMediumText();
