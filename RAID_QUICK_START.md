# RAID Configuration - Quick Start

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Setup Script
```bash
cd /home/pi/nas-system
./setup-raid.sh
```

This script will:
- Install mdadm automatically
- Configure sudo permissions
- Show available disks

### Step 2: Access Web Interface
1. Open your NAS web interface
2. Login as **admin**
3. Navigate to: **NAS Settings → RAID Configuration**

### Step 3: Test with Simulation Mode
1. Click "Create RAID Array"
2. Fill in the form:
   - **Name**: `test_raid`
   - **Type**: Choose RAID 0 or RAID 1
   - **Disks**: Select 2+ available disks
   - **Simulation Mode**: ✅ **Keep it CHECKED** (Safe mode)
3. Click "Create (Simulate)"
4. Configuration will be saved without executing real commands

### Step 4: Real Execution (Optional)
⚠️ **WARNING**: This will ERASE all data on selected disks!

Only proceed after:
- ✅ Backing up all important data
- ✅ Testing with simulation mode
- ✅ Confirming disk selection

Steps:
1. Delete simulated configuration
2. Create new RAID array
3. **Uncheck** "Simulation Mode"
4. Confirm settings
5. Click "Create (Execute)"

## 📖 Need More Help?

Read the complete guide: [RAID_CONFIGURATION_GUIDE.md](./RAID_CONFIGURATION_GUIDE.md)

## 🆘 Troubleshooting

### Permission denied
```bash
# Re-run setup script
./setup-raid.sh
```

### mdadm not found
```bash
sudo apt-get install mdadm -y
```

### Can't see disks
```bash
# List all disks
lsblk

# Make sure disks are not mounted
df -h
```

## ⚡ Quick Commands

```bash
# Check RAID status
cat /proc/mdstat

# List available disks
lsblk

# Check if mdadm is installed
which mdadm

# View server logs
tail -f /tmp/server.log
```

## 🎯 Key Features

- ✅ Web-based RAID configuration
- ✅ Simulation mode for safe testing
- ✅ Support for RAID 0 and RAID 1
- ✅ Real-time status monitoring
- ✅ Admin-only access
- ✅ Mount/Unmount management
- ✅ Automatic configuration backup

## ⚠️ Important Notes

1. **RAID is NOT a backup!** Always maintain separate backups
2. **Simulation mode** is recommended for first-time users
3. **RAID 1** provides data redundancy, RAID 0 does not
4. **Backup** everything before real RAID creation
5. Only **admin users** can configure RAID

---

**Created by**: NAS System  
**Documentation**: RAID_CONFIGURATION_GUIDE.md  
**Support**: Check documentation first
