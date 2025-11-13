#!/bin/bash

# Script untuk mengupdate permission folder RAID yang sudah ada
# agar semua user bisa read, write, execute (bukan read-only)

echo "=== Update RAID Folder Permissions ==="
echo ""

RAID_PATH="/mnt/RAID-ONE"

if [ ! -d "$RAID_PATH" ]; then
    echo "❌ RAID path not found: $RAID_PATH"
    exit 1
fi

echo "📁 Found RAID path: $RAID_PATH"
echo ""

# Show current permissions
echo "Current permissions:"
ls -la "$RAID_PATH"
echo ""

# Update permissions recursively
echo "Setting permissions to 777 (rwxrwxrwx) for all folders..."
sudo chmod -R 777 "$RAID_PATH"/*

# Update RAID mount point itself
sudo chmod 777 "$RAID_PATH"

echo ""
echo "✅ Permissions updated!"
echo ""

echo "New permissions:"
ls -la "$RAID_PATH"
echo ""

echo "=== Summary ==="
echo "• All folders: rwxrwxrwx (777)"
echo "• Owner: can read, write, execute"
echo "• Group: can read, write, execute"
echo "• Others: can read, write, execute"
echo ""
echo "All users now have FULL ACCESS to edit files in RAID folders! 🎉"
