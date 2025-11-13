import sequelize from '../config/database.js';

async function addIsActiveColumn() {
    try {
        await sequelize.query(`
            ALTER TABLE Users 
            ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL
        `);
        console.log('✅ Column is_active added successfully');
        
        // Set semua user yang ada menjadi active
        await sequelize.query(`
            UPDATE Users 
            SET is_active = true 
            WHERE is_active IS NULL
        `);
        console.log('✅ All existing users set to active');
        
        process.exit(0);
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('⚠️ Column is_active already exists');
            process.exit(0);
        }
        console.error('❌ Error adding is_active column:', error);
        process.exit(1);
    }
}

addIsActiveColumn();
