# RAID Auto-Mount Configuration Guide

## Problem: RAID Not Mounting After Reboot

### ❌ Symptoms
- Setelah restart Raspberry Pi, folder `/mnt/RAID-ONE` kosong
- File yang sudah diupload "hilang"
- Web aplikasi tidak bisa akses RAID
- Error: "Folder not accessible"

### ✅ Root Cause
RAID array **TIDAK auto-mount** setelah reboot karena:
1. Tidak ada entry di `/etc/fstab` untuk auto-mount
2. RAID array tidak terdaftar di `/etc/mdadm/mdadm.conf`
3. Initramfs tidak di-update setelah create RAID

### 🔍 Diagnosis Steps

#### 1. Check if RAID is mounted
```bash
df -h | grep RAID
# If empty → RAID not mounted

ls -la /mnt/RAID-ONE/
# If only shows . and .. → Empty (not mounted)
```

#### 2. Check RAID array status
```bash
sudo mdadm --detail --scan
# Should show: ARRAY /dev/md0 metadata=1.2 UUID=...

sudo mdadm --detail /dev/md0
# Check State: should be "clean"
# Check Active Devices: should match Raid Devices
```

#### 3. Check if files still exist
```bash
# Manual mount first
sudo mount /dev/md0 /mnt/RAID-ONE

# Check files
ls -la /mnt/RAID-ONE/
# Files should appear! 🎉
```

## Solution: Setup Auto-Mount

### Automatic Setup (Recommended)

Run the provided script:
```bash
cd /home/ishlah/nas-system
sudo bash setup-raid-automount.sh
```

The script will:
1. ✅ Check RAID status
2. ✅ Get RAID UUID
3. ✅ Update `/etc/mdadm/mdadm.conf`
4. ✅ Update initramfs
5. ✅ Add entry to `/etc/fstab`
6. ✅ Create mount point
7. ✅ Test mount
8. ✅ Set permissions (777)

### Manual Setup (Alternative)

If you prefer manual setup:

#### Step 1: Update mdadm.conf
```bash
# Backup current config
sudo cp /etc/mdadm/mdadm.conf /etc/mdadm/mdadm.conf.backup

# Add RAID array
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
```

#### Step 2: Update initramfs
```bash
sudo update-initramfs -u
```

#### Step 3: Get RAID UUID
```bash
sudo blkid /dev/md0
# Output: /dev/md0: UUID="98c01f2a-6a53-4e03-a339-2d91bc866fd2" TYPE="ext4"
```

#### Step 4: Add to /etc/fstab
```bash
# Backup fstab
sudo cp /etc/fstab /etc/fstab.backup

# Add entry (replace UUID with your actual UUID)
echo "UUID=98c01f2a-6a53-4e03-a339-2d91bc866fd2 /mnt/RAID-ONE ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

#### Step 5: Reload and mount
```bash
sudo systemctl daemon-reload
sudo mount -a
```

#### Step 6: Verify
```bash
df -h | grep RAID
ls -la /mnt/RAID-ONE/
```

## Understanding /etc/fstab Entry

```
UUID=98c01f2a-6a53-4e03-a339-2d91bc866fd2 /mnt/RAID-ONE ext4 defaults,nofail 0 2
  ^                                        ^             ^    ^        ^      ^ ^
  |                                        |             |    |        |      | |
  Device UUID                              Mount Point   FS   Options  Dump  Pass
```

### Field Explanations:

1. **UUID**: Unique identifier (lebih reliable dari /dev/md0)
2. **Mount Point**: `/mnt/RAID-ONE`
3. **Filesystem**: `ext4`
4. **Options**: 
   - `defaults`: rw, suid, dev, exec, auto, nouser, async
   - `nofail`: Boot continues even if mount fails (important!)
5. **Dump**: `0` (no backup with dump)
6. **Pass**: `2` (fsck check order, 0=skip, 1=root, 2=other)

### Why `nofail` is Important:
- Jika RAID gagal mount, sistem tetap bisa boot
- Tanpa `nofail`, boot akan stuck jika RAID error
- **CRITICAL** untuk Raspberry Pi yang sering restart

## Verification After Setup

### Test 1: Check mount
```bash
df -h | grep RAID
# Expected output:
# /dev/md0        458G   58M  434G   1% /mnt/RAID-ONE
```

### Test 2: Check files
```bash
ls -la /mnt/RAID-ONE/
# Should show your folders (e.g., DEVISI-1)

ls -la /mnt/RAID-ONE/DEVISI-1/
# Should show your files (images, videos, etc.)
```

### Test 3: Reboot test
```bash
sudo reboot
# Wait for system to restart
# SSH back in
df -h | grep RAID
# Should show RAID mounted automatically!
```

## Troubleshooting

### Problem: "mount: wrong fs type, bad option"
**Solution:**
```bash
# Check filesystem type
sudo blkid /dev/md0
# Use correct type in fstab (ext4, xfs, etc.)
```

### Problem: "mount: special device does not exist"
**Solution:**
```bash
# Check if RAID is assembled
sudo mdadm --detail /dev/md0

# If not, assemble it
sudo mdadm --assemble --scan
```

### Problem: RAID shows "inactive" after reboot
**Solution:**
```bash
# Assemble RAID manually
sudo mdadm --assemble /dev/md0 /dev/sda1 /dev/sdb1

# Then run auto-mount setup again
sudo bash setup-raid-automount.sh
```

### Problem: Permission denied after mount
**Solution:**
```bash
# Fix permissions
sudo chown -R ishlah:ishlah /mnt/RAID-ONE
sudo chmod -R 777 /mnt/RAID-ONE

# Or run in script
sudo bash setup-folder-permissions.sh
```

## RAID Maintenance

### Check RAID Health
```bash
# Detailed status
sudo mdadm --detail /dev/md0

# Quick status
cat /proc/mdstat

# Check for errors
sudo dmesg | grep -i raid
```

### Monitor RAID
```bash
# Real-time monitoring
watch -n 1 'cat /proc/mdstat'

# Email alerts (setup in /etc/mdadm/mdadm.conf)
MAILADDR your-email@example.com
```

### Emergency: Manual Mount
```bash
# If auto-mount fails, mount manually
sudo mount /dev/md0 /mnt/RAID-ONE

# Check what went wrong
sudo journalctl -xe | grep -i raid
```

## Best Practices

### 1. Regular Backups
Even with RAID-1 (mirroring), you should backup:
```bash
# Backup to external USB
rsync -avh /mnt/RAID-ONE/ /mnt/usb-backup/

# Or to remote server
rsync -avh /mnt/RAID-ONE/ user@server:/backup/
```

### 2. Monitor Disk Health
```bash
# Install smartmontools
sudo apt-get install smartmontools

# Check disk health
sudo smartctl -a /dev/sda
sudo smartctl -a /dev/sdb
```

### 3. Regular RAID Checks
```bash
# Schedule monthly check (add to crontab)
echo "check" | sudo tee /sys/block/md0/md/sync_action

# Check results
cat /sys/block/md0/md/mismatch_cnt
# Should be 0
```

### 4. Document Your Setup
```bash
# Save RAID configuration
sudo mdadm --detail /dev/md0 > ~/raid-config.txt

# Save disk info
sudo fdisk -l > ~/disk-info.txt

# Save fstab
cat /etc/fstab > ~/fstab-backup.txt
```

## Understanding the Fix

### What Happened?
1. ❌ **Before**: RAID created but not configured for auto-mount
2. ✅ **After**: System knows to mount RAID on boot

### Files Modified:
1. `/etc/mdadm/mdadm.conf` - RAID configuration
2. `/etc/fstab` - Filesystem mount table
3. `/boot/initrd.img-*` - Initial ramdisk (updated)

### Boot Process:
```
Power On
   ↓
BIOS/UEFI
   ↓
Load initramfs (contains mdadm config)
   ↓
Assemble RAID arrays (/dev/md0)
   ↓
Read /etc/fstab
   ↓
Mount filesystems (including RAID)
   ↓
System Ready! 🎉
```

## FAQ

### Q: Will my files be safe after reboot now?
**A:** Yes! RAID will auto-mount and all files will be accessible.

### Q: What if one disk fails?
**A:** RAID-1 will continue working with one disk. Replace failed disk ASAP.

### Q: Can I access files during RAID rebuild?
**A:** Yes! RAID-1 remains accessible during rebuild.

### Q: How to add more storage?
**A:** You'll need to:
1. Stop RAID
2. Replace disks with larger ones (one at a time)
3. Wait for rebuild
4. Grow filesystem

### Q: How to remove RAID safely?
**A:** 
```bash
# Backup data first!
# Unmount
sudo umount /mnt/RAID-ONE

# Stop array
sudo mdadm --stop /dev/md0

# Remove superblocks
sudo mdadm --zero-superblock /dev/sda1 /dev/sdb1

# Remove from fstab
sudo nano /etc/fstab  # delete RAID line
```

## Conclusion

**Your data is SAFE!** ✅

The problem was **not data loss**, just **missing auto-mount configuration**. After running `setup-raid-automount.sh`:

1. ✅ RAID will mount automatically on every boot
2. ✅ Files are preserved and accessible
3. ✅ Web application can access folders
4. ✅ No manual mounting needed

**Always remember:** RAID is NOT a backup! Keep separate backups.

## Quick Reference Commands

```bash
# Check if RAID is mounted
df -h | grep RAID

# Mount manually if needed
sudo mount /dev/md0 /mnt/RAID-ONE

# Check RAID status
sudo mdadm --detail /dev/md0

# View RAID activity
cat /proc/mdstat

# Run auto-mount setup
sudo bash /home/ishlah/nas-system/setup-raid-automount.sh

# Test reboot
sudo reboot
```

---

**Last Updated:** 13 November 2025
**System:** Raspberry Pi with RAID-1 (2x 500GB HDDs)
**Mount Point:** /mnt/RAID-ONE
**Filesystem:** ext4
