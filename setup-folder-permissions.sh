#!/bin/bash

# Setup script untuk mengizinkan Node.js membuat folder di RAID tanpa password
# Run with: sudo bash setup-folder-permissions.sh

echo "=== Setup Folder Permissions for NAS System ==="
echo ""

# Get current user
CURRENT_USER=${SUDO_USER:-$(whoami)}
echo "Current user: $CURRENT_USER"

# Create sudoers file for passwordless mkdir/chown
SUDOERS_FILE="/etc/sudoers.d/nas-folder-management"

echo "Creating sudoers configuration..."
cat > "$SUDOERS_FILE" << EOF
# Allow $CURRENT_USER to create folders and change ownership without password
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/mkdir
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/chown
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/chmod
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/rmdir
EOF

# Set proper permissions for sudoers file
chmod 0440 "$SUDOERS_FILE"

echo "✓ Sudoers configuration created at: $SUDOERS_FILE"
echo ""

# Check if RAID is mounted
RAID_MOUNT="/mnt/RAID-ONE"
if [ -d "$RAID_MOUNT" ]; then
    echo "RAID mount point found: $RAID_MOUNT"
    
    # Set proper permissions on RAID mount point
    echo "Setting permissions on RAID mount point..."
    chmod 755 "$RAID_MOUNT"
    chown $CURRENT_USER:$CURRENT_USER "$RAID_MOUNT"
    
    echo "✓ RAID mount point permissions set"
else
    echo "⚠ RAID mount point not found: $RAID_MOUNT"
    echo "  Please create it with: sudo mkdir -p $RAID_MOUNT"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "You can now create folders in RAID without password prompts."
echo "Test with: mkdir /mnt/RAID-ONE/test-folder"
echo ""
