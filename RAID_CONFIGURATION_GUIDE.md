# RAID Configuration Guide

## Prerequisites

### 1. Install mdadm
```bash
sudo apt-get update
sudo apt-get install mdadm -y
```

### 2. Configure sudo permissions (Important!)
The Node.js server needs sudo access to run RAID commands. Add the following to your sudoers file:

```bash
sudo visudo
```

Add this line (replace `pi` with your username):
```
pi ALL=(ALL) NOPASSWD: /sbin/mdadm, /bin/mount, /bin/umount, /bin/mkdir, /sbin/mkfs.ext4, /usr/sbin/update-initramfs
```

### 3. Check available disks
```bash
lsblk
```

Make sure you have at least 2 available disks/partitions for RAID configuration.

## Safety First! ⚠️

**IMPORTANT WARNINGS:**
- Creating a RAID array will **ERASE ALL DATA** on the selected disks
- Always **BACKUP** your data before configuring RAID
- Use **Simulation Mode** first to test your configuration
- Only use **Real Execution Mode** when you are absolutely sure

## Using the RAID Configuration Interface

### 1. Access the Interface
- Navigate to: **NAS Settings → RAID Configuration**
- Only **Admin users** can access this feature

### 2. Simulation Mode (Recommended First)
- ✅ **Safe**: Saves configuration to database without executing commands
- ✅ **Testing**: Verify your configuration before real execution
- ✅ **No risk**: No data will be lost

Steps:
1. Click "Create RAID Array"
2. Enter RAID name (e.g., `raid_storage`)
3. Select RAID type:
   - **RAID 0**: High performance, no redundancy (all capacity)
   - **RAID 1**: High redundancy, mirrored (50% capacity)
4. Select at least 2 available disks
5. **Optional**: Check "Wipe Existing Partitions" if disks have old partitions
   - ⚠️ This will delete all existing partitions on selected disks
   - Recommended for clean RAID setup
   - Disabled in simulation mode
6. Keep "Simulation Mode" **checked**
7. Click "Create (Simulate)"

### 3. Real Execution Mode (Use with Caution!)
After testing with simulation mode:

1. Delete the simulated configuration
2. Create a new RAID array
3. Select disks
4. **Check "Wipe Existing Partitions"** if:
   - Disks have old partition tables
   - Previous RAID configurations exist
   - You want a completely clean setup
   - ⚠️ **WARNING**: This will delete ALL partitions and data!
5. **Uncheck** "Simulation Mode"
6. Confirm all settings are correct
7. Click "Create (Execute)"
8. The system will:
   - (Optional) Wipe existing partitions with wipefs
   - (Optional) Create new GPT partition table
   - Create RAID array with mdadm
   - Format with ext4 filesystem
   - Create mount point
   - Mount the array
   - Save configuration to /etc/mdadm/mdadm.conf

## RAID Types Explained

### RAID 0 (Striping)
- **Performance**: ⭐⭐⭐⭐⭐ (Excellent)
- **Redundancy**: ❌ (None)
- **Capacity**: 100% (all disks combined)
- **Use case**: High-speed storage, temporary data
- **Risk**: If 1 disk fails, ALL data is lost

Example with 2x 1TB disks:
- Total capacity: 2TB
- If one disk fails: All data lost

### RAID 1 (Mirroring)
- **Performance**: ⭐⭐⭐ (Good)
- **Redundancy**: ⭐⭐⭐⭐⭐ (Excellent)
- **Capacity**: 50% (mirrored)
- **Use case**: Important data, high availability
- **Risk**: Can survive 1 disk failure

Example with 2x 1TB disks:
- Total capacity: 1TB
- If one disk fails: Data still safe on other disk

## Managing RAID Arrays

### Mounting/Unmounting
- Click "Mount" to make RAID accessible
- Click "Unmount" before removing disks
- Always unmount before system shutdown

### Monitoring Status
- **Active**: RAID is working normally
- **Degraded**: One disk failed, RAID still working (RAID 1)
- **Failed**: RAID array has failed
- **Creating**: RAID is being created

### Deleting RAID Arrays
⚠️ **DANGER**: This will destroy all data!

1. Unmount the array first
2. Click the delete button
3. Confirm by checking the checkbox
4. All data will be permanently lost

## Troubleshooting

### mdadm not found
```bash
# Check if mdadm is installed
which mdadm

# If not found, install it
sudo apt-get install mdadm -y
```

### Permission denied errors
Check sudo configuration:
```bash
# Test sudo access
sudo mdadm --version

# Should return mdadm version without asking for password
```

### RAID not showing up
```bash
# Check RAID status
cat /proc/mdstat

# Check RAID details
sudo mdadm --detail /dev/md0

# Scan for arrays
sudo mdadm --assemble --scan
```

### Disk is busy/mounted
```bash
# Check what's mounted
df -h

# Unmount if needed
sudo umount /dev/sdX

# Check if disk is part of existing RAID
sudo mdadm --examine /dev/sdX
```

## Best Practices

1. **Always backup** before creating RAID
2. **Test with simulation** mode first
3. **Use RAID 1** for important data
4. **Monitor disk health** regularly
5. **Keep spare disks** for RAID 1
6. **Document** your RAID configuration
7. **Test recovery** procedures

## Manual RAID Commands (Advanced)

### Create RAID 1 manually
```bash
# Create array
sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sda /dev/sdb

# Format
sudo mkfs.ext4 /dev/md0

# Mount
sudo mkdir -p /mnt/raid1
sudo mount /dev/md0 /mnt/raid1

# Save configuration
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u
```

### Check RAID status
```bash
# Quick status
cat /proc/mdstat

# Detailed info
sudo mdadm --detail /dev/md0

# Monitor in real-time
watch -n 1 cat /proc/mdstat
```

### Remove RAID array
```bash
# Unmount
sudo umount /mnt/raid1

# Stop array
sudo mdadm --stop /dev/md0

# Zero superblock
sudo mdadm --zero-superblock /dev/sda /dev/sdb
```

## Emergency Recovery

### RAID 1 disk failure
1. Check status: `cat /proc/mdstat`
2. Remove failed disk: `sudo mdadm /dev/md0 --remove /dev/sdX`
3. Replace physical disk
4. Add new disk: `sudo mdadm /dev/md0 --add /dev/sdY`
5. Wait for rebuild: `watch -n 1 cat /proc/mdstat`

### RAID won't start after reboot
```bash
# Scan and assemble
sudo mdadm --assemble --scan

# Check config
cat /etc/mdadm/mdadm.conf

# Update config if needed
sudo mdadm --detail --scan | sudo tee /etc/mdadm/mdadm.conf
sudo update-initramfs -u
```

## Support

For issues or questions:
1. Check this documentation first
2. Review server logs: `tail -f /tmp/server.log`
3. Check system logs: `sudo journalctl -xe`
4. Contact your system administrator

---

**Remember**: RAID is not a backup solution! Always maintain separate backups of important data.
