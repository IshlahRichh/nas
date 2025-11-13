import { exec } from 'child_process';
import { promisify } from 'util';
import { RaidConfiguration } from '../models/index.js';

const execPromise = promisify(exec);

// Get available disks
export const getAvailableDisks = async (req, res) => {
    try {
        // List block devices
        const { stdout } = await execPromise('lsblk -ndo NAME,SIZE,TYPE,MOUNTPOINT -J');
        const diskData = JSON.parse(stdout);

        // Filter only disk and partition types, exclude loop devices
        const disks = diskData.blockdevices
            .filter(device =>
                (device.type === 'disk' || device.type === 'part') &&
                !device.name.startsWith('loop') &&
                !device.name.startsWith('mmcblk0') // Exclude SD card if running from SD
            )
            .map(device => ({
                name: device.name,
                path: `/dev/${device.name}`,
                size: device.size,
                type: device.type,
                mountpoint: device.mountpoint || null,
                available: !device.mountpoint // Available if not mounted
            }));

        res.json({ disks });
    } catch (error) {
        console.error('Error getting disks:', error);
        res.status(500).json({
            message: 'Error retrieving disk information',
            error: error.message
        });
    }
};

// Get RAID status
export const getRaidStatus = async (req, res) => {
    try {
        // Get RAID configurations from database
        const raidConfigs = await RaidConfiguration.findAll();

        // Get mdadm status if available
        let mdadmStatus = null;
        try {
            const { stdout } = await execPromise('cat /proc/mdstat');
            mdadmStatus = stdout;
        } catch (error) {
            console.log('mdadm not available or no RAID configured');
        }

        res.json({
            configurations: raidConfigs,
            mdstat: mdadmStatus
        });
    } catch (error) {
        console.error('Error getting RAID status:', error);
        res.status(500).json({
            message: 'Error retrieving RAID status',
            error: error.message
        });
    }
};

// Check if mdadm is installed
export const checkMdadm = async (req, res) => {
    try {
        await execPromise('which mdadm');
        res.json({ installed: true, message: 'mdadm is installed' });
    } catch (error) {
        res.json({
            installed: false,
            message: 'mdadm is not installed. Please install with: sudo apt-get install mdadm'
        });
    }
};

// Create RAID array (simulation mode available)
export const createRaid = async (req, res) => {
    try {
        const { raid_name, raid_type, disks, mount_point, simulate = false, wipe_partitions = false } = req.body;

        // Validation
        if (!raid_name || !raid_type || !disks || disks.length < 2) {
            return res.status(400).json({
                message: 'Invalid input. Need raid_name, raid_type, and at least 2 disks'
            });
        }

        if (!['RAID0', 'RAID1'].includes(raid_type)) {
            return res.status(400).json({
                message: 'Only RAID0 and RAID1 are supported'
            });
        }

        // Check if RAID name already exists
        const existing = await RaidConfiguration.findOne({ where: { raid_name } });
        if (existing) {
            return res.status(400).json({
                message: 'RAID configuration with this name already exists'
            });
        }

        if (simulate) {
            // Simulation mode - just save to database without executing
            const newRaid = await RaidConfiguration.create({
                raid_name,
                raid_type,
                disks,
                mount_point: mount_point || `/mnt/${raid_name}`,
                status: 'inactive',
                raid_device: '/dev/md0', // Placeholder
                is_mounted: false,
                config_data: {
                    simulated: true,
                    created_at: new Date()
                }
            });

            return res.json({
                success: true,
                simulated: true,
                message: 'RAID configuration saved (simulation mode)',
                raid: newRaid
            });
        }

        // Real execution mode
        // Find next available md device
        let mdDevice = '/dev/md0';
        try {
            const { stdout } = await execPromise('cat /proc/mdstat');
            // Parse to find next available md number
            const mdNumbers = [...stdout.matchAll(/md(\d+)/g)].map(m => parseInt(m[1]));
            const nextMd = mdNumbers.length > 0 ? Math.max(...mdNumbers) + 1 : 0;
            mdDevice = `/dev/md${nextMd}`;
        } catch (error) {
            // No RAID arrays exist yet, use md0
        }

        // Wipe partitions and create single partition per disk (recommended for RAID stability)
        let raidDevices = []; // Will hold partition paths like /dev/sda1, /dev/sdb1
        
        if (wipe_partitions && !simulate) {
            console.log('Wiping partitions and creating new partition table on selected disks...');
            for (const disk of disks) {
                try {
                    // Remove existing partitions
                    console.log(`Wiping ${disk}...`);

                    // Zero any existing mdadm superblock first
                    await execPromise(`sudo mdadm --zero-superblock --force ${disk}`).catch(() => {});

                    // Use wipefs to remove all signatures
                    await execPromise(`sudo wipefs -a ${disk}`);

                    // Create new GPT partition table + single partition with 1MiB alignment and raid flag
                    await execPromise(`sudo parted -s ${disk} mklabel gpt mkpart primary 1MiB 100% set 1 raid on`);

                    // Determine partition name (e.g. /dev/sda1)
                    const partitionName = disk.match(/\d+$/) ? `${disk}p1` : `${disk}1`;
                    
                    // CRITICAL: Wait for partition to appear and then wipe ALL signatures from the partition itself
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await execPromise(`sudo wipefs -af ${partitionName}`).catch(() => {});
                    await execPromise(`sudo mdadm --zero-superblock --force ${partitionName}`).catch(() => {});
                    
                    console.log(`✓ ${disk} wiped and partitioned successfully`);
                    raidDevices.push(partitionName);
                } catch (error) {
                    console.error(`Warning: Could not fully wipe/partition ${disk}:`, error.message);
                    // Fallback: use whole disk
                    raidDevices.push(disk);
                }
            }

            // Wait for kernel to update partition table
            console.log('Waiting for kernel to recognize new partitions...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Verify partitions exist
            try {
                const { stdout } = await execPromise('lsblk -nlo NAME,TYPE');
                console.log('Current block devices after partitioning:\n', stdout);
            } catch (err) {
                console.warn('Could not list block devices:', err.message);
            }
        } else {
            // No wipe - use disks as provided (could be whole disks or partitions)
            raidDevices = disks;
        }

        // Create RAID array
        const level = raid_type === 'RAID0' ? '0' : '1';
        const diskList = raidDevices.join(' ');

        // IMPORTANT: This requires sudo access
        // Use metadata 1.2 (modern, bootable) and internal bitmap for RAID1 to avoid interactive prompts
        // --run flag forces mdadm to proceed without asking confirmation about existing partition tables
        const metadataOption = '--metadata=1.2';
        const bitmapOption = level === '1' ? '--bitmap=internal' : '';
        const runOption = '--run'; // Non-interactive mode - skip all prompts
        const createCmd = `sudo mdadm --create ${mdDevice} --level=${level} --raid-devices=${raidDevices.length} ${metadataOption} ${bitmapOption} ${runOption} ${diskList} --force`;

        console.log('Executing:', createCmd);

        try {
            // Step 1: Create RAID array (fast, usually < 5 seconds)
            console.log('Step 1/5: Creating RAID array...');
            console.log('RAID devices:', raidDevices);
            
            // Execute mdadm create with detailed error capture
            let createResult;
            try {
                createResult = await execPromise(createCmd, { timeout: 120000 }); // 2 minute timeout
                console.log('mdadm create stdout:', createResult.stdout);
                if (createResult.stderr) {
                    console.log('mdadm create stderr:', createResult.stderr);
                }
            } catch (cmdError) {
                console.error('mdadm create failed:', cmdError.message);
                console.error('stdout:', cmdError.stdout);
                console.error('stderr:', cmdError.stderr);
                throw new Error(`mdadm --create failed: ${cmdError.stderr || cmdError.message}`);
            }

            // Wait a moment for array to initialize
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify array was created
            try {
                const { stdout: mdstatCheck } = await execPromise('cat /proc/mdstat');
                console.log('Current /proc/mdstat after create:\n', mdstatCheck);
                if (!mdstatCheck.includes(mdDevice.replace('/dev/', ''))) {
                    throw new Error(`Array ${mdDevice} not found in /proc/mdstat after creation`);
                }
            } catch (verifyErr) {
                console.error('Array verification failed:', verifyErr.message);
                throw verifyErr;
            }

            // Step 2: Create filesystem (SLOW - can take 5-15 minutes on large disks)
            console.log('Step 2/5: Creating filesystem (this may take 5-15 minutes)...');

            // Use faster options for mkfs.ext4
            // -E lazy_itable_init=0,lazy_journal_init=0 : Don't lazy initialize (faster for immediate use)
            // -O ^has_journal : No journal (faster, but less safe - can be added later)
            const mkfsCmd = `sudo mkfs.ext4 -F -E lazy_itable_init=1,lazy_journal_init=1 ${mdDevice}`;

            // Increase timeout to 30 minutes for large disks
            await execPromise(mkfsCmd, { timeout: 1800000 });

            console.log('Step 3/5: Creating mount point...');
            // Create mount point
            const mountPath = mount_point || `/mnt/${raid_name}`;
            await execPromise(`sudo mkdir -p ${mountPath}`);

            console.log('Step 4/5: Mounting RAID array...');
            // Mount the array
            await execPromise(`sudo mount ${mdDevice} ${mountPath}`);

            // Get capacity
            const { stdout: dfOutput } = await execPromise(`df -h ${mountPath} | tail -1`);
            const capacity = dfOutput.split(/\s+/)[1];

            console.log('Step 5/5: Saving configuration...');
            // Save to database - store actual raid devices (partitions) used
            const newRaid = await RaidConfiguration.create({
                raid_name,
                raid_type,
                disks: raidDevices, // Store partition paths, not original disk paths
                raid_device: mdDevice,
                mount_point: mountPath,
                status: 'active',
                capacity,
                is_mounted: true,
                config_data: {
                    created_at: new Date(),
                    level,
                    metadata: '1.2',
                    original_disks: disks // Keep original request for reference
                }
            });

            // Save mdadm configuration (in background, don't wait)
            console.log('Updating system configuration in background...');
            execPromise('sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf').catch(err =>
                console.error('Warning: Could not update mdadm.conf:', err.message)
            );

            // Skip update-initramfs for now as it's very slow and not critical
            // Can be run manually later with: sudo update-initramfs -u

            console.log('✓ RAID creation completed successfully!');

            res.json({
                success: true,
                message: 'RAID array created successfully',
                raid: newRaid,
                note: 'Run "sudo update-initramfs -u" manually later to update boot image'
            });
        } catch (error) {
            console.error('Error creating RAID:', error);
            throw new Error(`Failed to create RAID: ${error.message}`);
        }
    } catch (error) {
        console.error('Error in createRaid:', error);
        res.status(500).json({
            message: 'Error creating RAID array',
            error: error.message,
            hint: 'Make sure mdadm is installed and you have sudo permissions'
        });
    }
};

// Mount RAID
export const mountRaid = async (req, res) => {
    try {
        const { id } = req.params;

        const raid = await RaidConfiguration.findByPk(id);
        if (!raid) {
            return res.status(404).json({ message: 'RAID configuration not found' });
        }

        if (raid.is_mounted) {
            return res.status(400).json({ message: 'RAID is already mounted' });
        }

        // Mount the RAID
        await execPromise(`sudo mount ${raid.raid_device} ${raid.mount_point}`);

        // Update database
        await raid.update({ is_mounted: true, status: 'active' });

        res.json({
            success: true,
            message: 'RAID mounted successfully',
            raid
        });
    } catch (error) {
        console.error('Error mounting RAID:', error);
        res.status(500).json({
            message: 'Error mounting RAID',
            error: error.message
        });
    }
};

// Unmount RAID
export const unmountRaid = async (req, res) => {
    try {
        const { id } = req.params;

        const raid = await RaidConfiguration.findByPk(id);
        if (!raid) {
            return res.status(404).json({ message: 'RAID configuration not found' });
        }

        if (!raid.is_mounted) {
            return res.status(400).json({ message: 'RAID is not mounted' });
        }

        // Unmount the RAID
        await execPromise(`sudo umount ${raid.mount_point}`);

        // Update database
        await raid.update({ is_mounted: false, status: 'inactive' });

        res.json({
            success: true,
            message: 'RAID unmounted successfully',
            raid
        });
    } catch (error) {
        console.error('Error unmounting RAID:', error);
        res.status(500).json({
            message: 'Error unmounting RAID',
            error: error.message
        });
    }
};

// Delete RAID (with safety confirmation)
export const deleteRaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirm = false } = req.body;

        if (!confirm) {
            return res.status(400).json({
                message: 'Deletion requires confirmation. Send { confirm: true }',
                warning: 'This will destroy all data on the RAID array!'
            });
        }

        const raid = await RaidConfiguration.findByPk(id);
        if (!raid) {
            return res.status(404).json({ message: 'RAID configuration not found' });
        }

        // If simulated, just delete from database
        if (raid.config_data?.simulated) {
            await raid.destroy();
            return res.json({
                success: true,
                message: 'Simulated RAID configuration deleted'
            });
        }

        // Unmount if mounted
        if (raid.is_mounted) {
            try {
                await execPromise(`sudo umount ${raid.mount_point}`);
            } catch (error) {
                console.log('Already unmounted or error unmounting');
            }
        }

        // Stop the RAID array
        await execPromise(`sudo mdadm --stop ${raid.raid_device}`);

        // Parse disks (might be JSON string from database)
        const disks = typeof raid.disks === 'string' ? JSON.parse(raid.disks) : raid.disks;

        // Zero superblock on each disk
        for (const disk of disks) {
            try {
                await execPromise(`sudo mdadm --zero-superblock ${disk}`);
            } catch (error) {
                console.log(`Could not zero superblock on ${disk}`);
            }
        }

        // Remove from database
        await raid.destroy();

        res.json({
            success: true,
            message: 'RAID array destroyed successfully'
        });
    } catch (error) {
        console.error('Error deleting RAID:', error);
        res.status(500).json({
            message: 'Error deleting RAID array',
            error: error.message
        });
    }
};

// Get detailed RAID info
export const getRaidDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const raid = await RaidConfiguration.findByPk(id);
        if (!raid) {
            return res.status(404).json({ message: 'RAID configuration not found' });
        }

        // Get mdadm detail if not simulated
        let mdadmDetail = null;
        let rebuildProgress = null;
        if (!raid.config_data?.simulated && raid.raid_device) {
            try {
                const { stdout } = await execPromise(`sudo mdadm --detail ${raid.raid_device}`);
                mdadmDetail = stdout;

                // Check for rebuild/resync progress
                const mdstat = await execPromise('cat /proc/mdstat');
                const progressMatch = mdstat.stdout.match(/\[=*>\.+\]\s+(\w+)\s+=\s+([\d.]+)%/);
                if (progressMatch) {
                    rebuildProgress = {
                        operation: progressMatch[1], // resync, recovery, etc
                        percentage: parseFloat(progressMatch[2])
                    };
                }
            } catch (error) {
                console.log('Could not get mdadm detail');
            }
        }

        res.json({
            raid,
            mdadm_detail: mdadmDetail,
            rebuild_progress: rebuildProgress
        });
    } catch (error) {
        console.error('Error getting RAID detail:', error);
        res.status(500).json({
            message: 'Error retrieving RAID details',
            error: error.message
        });
    }
};

// Get RAID rebuild/resync progress
export const getRaidProgress = async (req, res) => {
    try {
        const { stdout: mdstat } = await execPromise('cat /proc/mdstat');

        // Parse mdstat for any ongoing operations
        const lines = mdstat.split('\n');
        const operations = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Look for md devices
            if (line.startsWith('md')) {
                const mdDevice = line.split(':')[0].trim();

                // Check next lines for progress indicators
                if (i + 1 < lines.length) {
                    const progressLine = lines[i + 1];
                    const progressMatch = progressLine.match(/\[=*>\.+\]\s+(\w+)\s+=\s+([\d.]+)%\s+\(([\d/]+)\)\s+finish=([\d.]+min)/);

                    if (progressMatch) {
                        operations.push({
                            device: `/dev/${mdDevice}`,
                            operation: progressMatch[1], // resync, recovery, reshape, etc
                            percentage: parseFloat(progressMatch[2]),
                            blocks: progressMatch[3],
                            estimated_finish: progressMatch[4]
                        });
                    }
                }
            }
        }

        res.json({
            mdstat: mdstat,
            operations: operations,
            has_operations: operations.length > 0
        });
    } catch (error) {
        console.error('Error getting RAID progress:', error);
        res.status(500).json({
            message: 'Error retrieving RAID progress',
            error: error.message
        });
    }
};
