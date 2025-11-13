import { AppSettings } from '../models/index.js';

// Get app settings
export const getAppSettings = async (req, res) => {
    try {
        let settings = await AppSettings.findOne();
        
        // Create default settings if not exists
        if (!settings) {
            settings = await AppSettings.create({
                app_name: 'NAS System',
                app_description: 'Network Attached Storage Management System'
            });
        }
        
        res.json(settings);
    } catch (error) {
        console.error('Error fetching app settings:', error);
        res.status(500).json({ message: 'Error fetching app settings', error: error.message });
    }
};

// Update app settings
export const updateAppSettings = async (req, res) => {
    try {
        const { app_name, app_logo, app_favicon, app_description } = req.body;
        
        let settings = await AppSettings.findOne();
        
        if (!settings) {
            // Create if not exists
            settings = await AppSettings.create({
                app_name,
                app_logo,
                app_favicon,
                app_description
            });
        } else {
            // Update existing
            await settings.update({
                app_name: app_name || settings.app_name,
                app_logo: app_logo !== undefined ? app_logo : settings.app_logo,
                app_favicon: app_favicon !== undefined ? app_favicon : settings.app_favicon,
                app_description: app_description || settings.app_description
            });
        }
        
        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Error updating app settings:', error);
        res.status(500).json({ message: 'Error updating app settings', error: error.message });
    }
};
