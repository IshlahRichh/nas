#!/bin/bash

# RAID Configuration Setup Script
# This script prepares your system for RAID configuration

echo "=========================================="
echo "NAS System - RAID Configuration Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please do not run as root. Run as normal user with sudo access."
    exit 1
fi

# Install mdadm
echo "📦 Installing mdadm..."
sudo apt-get update
sudo apt-get install -y mdadm

# Check installation
if ! command -v mdadm &> /dev/null; then
    echo "❌ mdadm installation failed!"
    exit 1
fi

echo "✅ mdadm installed successfully"
echo ""

# Configure sudo permissions
echo "🔧 Configuring sudo permissions..."
SUDOERS_LINE="$USER ALL=(ALL) NOPASSWD: /sbin/mdadm, /bin/mount, /bin/umount, /bin/mkdir, /sbin/mkfs.ext4, /usr/sbin/update-initramfs, /sbin/wipefs, /usr/sbin/parted"

# Check if line already exists
if sudo grep -q "$SUDOERS_LINE" /etc/sudoers.d/nas-raid 2>/dev/null; then
    echo "✅ Sudo permissions already configured"
else
    # Create sudoers file
    echo "$SUDOERS_LINE" | sudo tee /etc/sudoers.d/nas-raid > /dev/null
    sudo chmod 0440 /etc/sudoers.d/nas-raid
    echo "✅ Sudo permissions configured"
fi

echo ""

# Test sudo access
echo "🧪 Testing sudo access..."
if sudo -n mdadm --version &> /dev/null; then
    echo "✅ Sudo access working correctly"
else
    echo "⚠️  Sudo access test failed. You may need to log out and log back in."
fi

echo ""

# List available disks
echo "💾 Available disks on your system:"
lsblk -ndo NAME,SIZE,TYPE | grep -E "disk|part" | grep -v "loop"

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "✅ mdadm installed"
echo "✅ Sudo permissions configured"
echo ""
echo "⚠️  IMPORTANT REMINDERS:"
echo "   1. RAID creation will ERASE ALL DATA on selected disks"
echo "   2. Always BACKUP your data first"
echo "   3. Use SIMULATION MODE to test configurations"
echo "   4. Only use REAL EXECUTION when you are sure"
echo ""
echo "📚 Read RAID_CONFIGURATION_GUIDE.md for detailed instructions"
echo ""
echo "🚀 You can now access RAID Configuration in the web interface:"
echo "   NAS Settings → RAID Configuration"
echo ""
