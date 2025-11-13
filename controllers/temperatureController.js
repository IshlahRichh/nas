import { exec } from 'child_process';
import { promisify } from 'util';
import { TemperatureLog } from '../models/index.js';

const execPromise = promisify(exec);

// Get current Raspberry Pi temperature
export const getCurrentTemperature = async (req, res) => {
    try {
        // Try to read temperature from Raspberry Pi
        let temperature = 0;
        
        try {
            const { stdout } = await execPromise('cat /sys/class/thermal/thermal_zone0/temp');
            temperature = parseFloat(stdout.trim()) / 1000; // Convert from millidegrees to degrees
        } catch (error) {
            // If not on Raspberry Pi or can't read temperature, generate realistic mock data
            const baseTemp = 45;
            const variation = Math.random() * 10 - 5; // Random variation between -5 and +5
            temperature = baseTemp + variation;
            console.log('Using mock temperature data (not on Raspberry Pi)');
        }

        // Save to database
        await TemperatureLog.create({
            temperature: temperature,
            timestamp: new Date()
        });

        res.json({
            temperature: temperature,
            timestamp: new Date(),
            unit: 'celsius'
        });
    } catch (error) {
        console.error('Error getting temperature:', error);
        res.status(500).json({ message: 'Error reading temperature', error: error.message });
    }
};

// Get temperature history
export const getTemperatureHistory = async (req, res) => {
    try {
        const { limit = 100 } = req.query;
        
        const logs = await TemperatureLog.findAll({
            order: [['timestamp', 'DESC']],
            limit: parseInt(limit)
        });

        res.json(logs);
    } catch (error) {
        console.error('Error getting temperature history:', error);
        res.status(500).json({ message: 'Error fetching temperature history', error: error.message });
    }
};

// Get temperature statistics
export const getTemperatureStats = async (req, res) => {
    try {
        const logs = await TemperatureLog.findAll({
            order: [['timestamp', 'DESC']],
            limit: 100
        });

        if (logs.length === 0) {
            return res.json({
                average: 0,
                min: 0,
                max: 0,
                current: 0
            });
        }

        const temperatures = logs.map(log => log.temperature);
        const average = temperatures.reduce((a, b) => a + b, 0) / temperatures.length;
        const min = Math.min(...temperatures);
        const max = Math.max(...temperatures);
        const current = temperatures[0];

        res.json({
            average: parseFloat(average.toFixed(2)),
            min: parseFloat(min.toFixed(2)),
            max: parseFloat(max.toFixed(2)),
            current: parseFloat(current.toFixed(2))
        });
    } catch (error) {
        console.error('Error getting temperature stats:', error);
        res.status(500).json({ message: 'Error calculating statistics', error: error.message });
    }
};
