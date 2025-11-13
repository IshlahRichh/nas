#!/bin/bash

echo "==============================================="
echo "RAID Auto-Mount Setup Script"
echo "==============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run with sudo: sudo bash $0"
    exit 1
fi

echo "1. Checking RAID status..."
if ! mdadm --detail /dev/md0 &>/dev/null; then
    echo "❌ RAID array /dev/md0 not found!"
    echo "Run: sudo mdadm --detail --scan"
    exit 1
fi

echo "✅ RAID array /dev/md0 is active"
echo ""

echo "2. Getting RAID UUID..."
UUID=$(blkid /dev/md0 | grep -oP 'UUID="\K[^"]+')
if [ -z "$UUID" ]; then
    echo "❌ Could not get UUID for /dev/md0"
    exit 1
fi

echo "✅ UUID: $UUID"
echo ""

echo "3. Updating /etc/mdadm/mdadm.conf..."
# Save current mdadm.conf
cp /etc/mdadm/mdadm.conf /etc/mdadm/mdadm.conf.backup.$(date +%Y%m%d_%H%M%S)

# Add RAID array to mdadm.conf if not already there
if ! grep -q "ARRAY /dev/md0" /etc/mdadm/mdadm.conf; then
    mdadm --detail --scan >> /etc/mdadm/mdadm.conf
    echo "✅ Added RAID array to mdadm.conf"
else
    echo "✅ RAID array already in mdadm.conf"
fi

# Update initramfs
echo ""
echo "4. Updating initramfs (this may take a minute)..."
update-initramfs -u
echo "✅ Initramfs updated"
echo ""

echo "5. Adding to /etc/fstab for auto-mount..."
# Backup fstab
cp /etc/fstab /etc/fstab.backup.$(date +%Y%m%d_%H%M%S)

# Check if entry already exists
if grep -q "/mnt/RAID-ONE" /etc/fstab; then
    echo "⚠️  Entry already exists in /etc/fstab, skipping..."
else
    # Add fstab entry
    echo "" >> /etc/fstab
    echo "# RAID-1 Array - Auto-mount on boot" >> /etc/fstab
    echo "UUID=$UUID /mnt/RAID-ONE ext4 defaults,nofail 0 2" >> /etc/fstab
    echo "✅ Added to /etc/fstab"
fi

echo ""
echo "6. Creating mount point..."
mkdir -p /mnt/RAID-ONE
echo "✅ Mount point created"
echo ""

echo "7. Testing mount..."
# Unmount if already mounted
if mountpoint -q /mnt/RAID-ONE; then
    echo "Already mounted, unmounting first..."
    umount /mnt/RAID-ONE
fi

# Test mount
if mount /mnt/RAID-ONE; then
    echo "✅ Mount successful!"
    echo ""
    echo "RAID contents:"
    ls -lh /mnt/RAID-ONE/
else
    echo "❌ Mount failed!"
    exit 1
fi

echo ""
echo "8. Setting permissions..."
chown -R ishlah:ishlah /mnt/RAID-ONE
chmod -R 777 /mnt/RAID-ONE
echo "✅ Permissions set"

echo ""
echo "==============================================="
echo "✅ AUTO-MOUNT SETUP COMPLETE!"
echo "==============================================="
echo ""
echo "RAID will now automatically mount on boot at /mnt/RAID-ONE"
echo ""
echo "To verify:"
echo "  1. Reboot: sudo reboot"
echo "  2. After reboot, check: df -h | grep RAID"
echo "  3. Or check: ls -la /mnt/RAID-ONE/"
echo ""
echo "Backup files created:"
echo "  - /etc/fstab.backup.$(date +%Y%m%d_%H%M%S)"
echo "  - /etc/mdadm/mdadm.conf.backup.$(date +%Y%m%d_%H%M%S)"
echo ""
