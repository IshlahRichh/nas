#!/bin/bash

echo "=============================================="
echo "RAID Recovery - Disk Detection Fix"
echo "=============================================="
echo ""

echo "🔍 Stopping any RAID arrays..."
sudo mdadm --stop --scan 2>/dev/null

echo "🧹 Cleaning up RAID metadata..."
if [ -f /etc/mdadm/mdadm.conf ]; then
    sudo cp /etc/mdadm/mdadm.conf /etc/mdadm/mdadm.conf.backup
    sudo sh -c 'echo "# Cleared by RAID recovery script" > /etc/mdadm/mdadm.conf'
    echo "✅ Cleared mdadm.conf"
fi

echo ""
echo "🔌 Current USB storage devices:"
lsusb | grep -i "storage\|mass\|disk" || echo "No USB storage devices found in lsusb"

echo ""
echo "💾 Current block devices:"
lsblk | grep -v "loop"

echo ""
echo "🔄 Rescanning SCSI bus..."
for host in /sys/class/scsi_host/host*; do
    echo "- - -" | sudo tee $host/scan > /dev/null 2>&1
done

echo ""
echo "⏳ Waiting for devices to settle..."
sleep 3

echo ""
echo "💾 Block devices after rescan:"
lsblk | grep -v "loop"

echo ""
echo "=============================================="
echo "📋 Diagnosis:"
echo "=============================================="

DISK_COUNT=$(lsblk -ndo NAME | grep -E "^sd[a-z]$" | wc -l)
echo "Detected $DISK_COUNT SATA/USB disk(s)"

if [ "$DISK_COUNT" -ge 2 ]; then
    echo "✅ Good! Multiple disks detected."
    echo ""
    echo "Next steps:"
    echo "1. Check if disks have RAID superblocks"
    echo "2. Clear them if present"
    for disk in $(lsblk -ndo NAME | grep -E "^sd[a-z]$"); do
        echo ""
        echo "Checking /dev/$disk:"
        sudo mdadm --examine /dev/$disk 2>&1 | head -5
    done
elif [ "$DISK_COUNT" -eq 1 ]; then
    echo "⚠️  Only 1 disk detected."
    echo ""
    echo "The second disk might be:"
    echo "1. Held by a stuck RAID process"
    echo "2. In an error state"
    echo "3. Disconnected physically"
    echo ""
    echo "🔧 Recommended actions:"
    echo "   sudo reboot"
    echo ""
    echo "After reboot, run this script again."
else
    echo "❌ No USB/SATA disks detected!"
    echo ""
    echo "Please check:"
    echo "1. USB cables are connected"
    echo "2. USB hub has power (if using one)"
    echo "3. Try different USB ports"
fi

echo ""
echo "=============================================="
echo "🛠️  Recovery Options:"
echo "=============================================="
echo ""
echo "Option 1: Reboot system (Recommended)"
echo "   sudo reboot"
echo ""
echo "Option 2: Clean RAID superblocks (if disks detected)"
echo "   sudo mdadm --zero-superblock /dev/sdX"
echo ""
echo "Option 3: Check kernel logs"
echo "   sudo dmesg | grep -i 'sd[a-z]' | tail -50"
echo ""
