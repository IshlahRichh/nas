#!/usr/bin/env bash
set -euo pipefail

# fix-raid1.sh
# Interactive script to create a RAID1 on /dev/sda and /dev/sdb (recommended: use partitions /dev/sda1 /dev/sdb1)
# WARNING: This script WILL DESTROY ALL DATA on the target disks when it performs the destructive steps.
# Usage:
#   sudo ./fix-raid1.sh          -> interactive mode (asks for confirmation)
#   sudo ./fix-raid1.sh --auto   -> non-interactive: runs destructive steps automatically
#   AUTO=1 sudo ./fix-raid1.sh   -> equivalent to --auto

DEV_A="/dev/sda"
DEV_B="/dev/sdb"
PART_A="${DEV_A}1"
PART_B="${DEV_B}1"
MD_DEVICE="/dev/md0"
FS_TYPE="ext4"
MOUNT_POINT="/mnt/md0"
AUTO=0

if [[ ${AUTO_ENV:=} == "1" ]]; then
  AUTO=1
fi

for arg in "$@"; do
  case "$arg" in
    --auto) AUTO=1 ;;
    --help|-h)
      sed -n '1,200p' "$0"; exit 0 ;;
  esac
done

if [[ $(id -u) -ne 0 ]]; then
  echo "This script must be run as root. Use: sudo $0"
  exit 1
fi

echo "=============================================="
echo "RAID1 Fix Script"
echo "Target disks: ${DEV_A} and ${DEV_B}"
echo "This script will:"
echo "  - show current status (non-destructive checks)"
echo "  - zero any existing mdadm superblocks on the devices"
echo "  - create GPT single partition on each disk (raid flag)"
echo "  - create RAID1 on ${PART_A} and ${PART_B} -> ${MD_DEVICE}"
echo "  - optionally mkfs and mount the array"
echo

echo "!!! IMPORTANT: When proceeding with destructive steps ALL data on ${DEV_A} and ${DEV_B} will be LOST !!!"
echo "=============================================="

# Non-destructive checks
echo
echo "[1/5] Current block devices:"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

echo
echo "[2/5] /proc/mdstat:"
cat /proc/mdstat || true

echo
echo "[3/5] mdadm examines (may show nothing if no superblocks):"
mdadm --examine ${DEV_A} ${DEV_B} ${PART_A} ${PART_B} 2>/dev/null || true

echo
echo "[4/5] Recent kernel log (last 60 lines):"
dmesg | tail -n 60 || true

echo
read -p "Do you want to continue to destructive steps? Type 'CONFIRM' to proceed with checks (destructive steps will still ask) : " confirm_first
if [[ "$confirm_first" != "CONFIRM" ]]; then
  echo "Aborting as requested. No destructive action performed."
  exit 0
fi

# Ask again before destructive
if [[ $AUTO -eq 0 ]]; then
  read -p "READY to zero superblocks and create partitions on ${DEV_A} & ${DEV_B}? Type 'YES' to continue: " final_confirm
  if [[ "$final_confirm" != "YES" ]]; then
    echo "Cancelled by user. No changes made."
    exit 0
  fi
else
  echo "--auto mode: proceeding without interactive confirmation."
fi

# Destructive operations
set +e
echo "[Destructive] Zeroing possible existing mdadm superblocks (may fail harmlessly if none):"
mdadm --zero-superblock --force ${DEV_A} 2>/dev/null || true
mdadm --zero-superblock --force ${DEV_B} 2>/dev/null || true
mdadm --zero-superblock --force ${PART_A} 2>/dev/null || true
mdadm --zero-superblock --force ${PART_B} 2>/dev/null || true
set -e

echo "[Destructive] Clearing partition table and creating GPT + single partition with raid flag..."
parted -s ${DEV_A} mklabel gpt mkpart primary 1MiB 100% set 1 raid on
parted -s ${DEV_B} mklabel gpt mkpart primary 1MiB 100% set 1 raid on

# Wait for kernel to refresh partition table
sleep 2

echo "Partition layouts after creation:"
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT ${DEV_A} ${DEV_B}

# Create RAID1
echo "Creating RAID1 array ${MD_DEVICE} from ${PART_A} and ${PART_B} ..."
mdadm --create ${MD_DEVICE} --level=1 --raid-devices=2 ${PART_A} ${PART_B} --force

# Wait a few seconds and show status
sleep 2

if cat /proc/mdstat | grep -q md; then
  echo "Array appears in /proc/mdstat. Current status:"
  cat /proc/mdstat
else
  echo "Warning: ${MD_DEVICE} not present in /proc/mdstat. Check dmesg for errors and mdadm --examine."
  dmesg | tail -n 60
  echo "Exiting script due to missing md device."
  exit 1
fi

echo
if [[ $AUTO -eq 0 ]]; then
  read -p "Create filesystem on ${MD_DEVICE} now? This will erase array content. Type 'MKFS' to create, anything else to skip: " mkfs_confirm
  if [[ "$mkfs_confirm" == "MKFS" ]]; then
    mkfs.${FS_TYPE} -F ${MD_DEVICE}
    mkdir -p ${MOUNT_POINT}
    mount ${MD_DEVICE} ${MOUNT_POINT}
    echo "Mounted ${MD_DEVICE} on ${MOUNT_POINT}" 
  else
    echo "Skipping mkfs/mount. You can create filesystem after resync completes."
  fi
else
  echo "Auto-mode: not creating filesystem. You can create it after resync finishes."
fi

# Save mdadm config
echo
echo "Saving mdadm config to /etc/mdadm/mdadm.conf (appending)."
mdadm --detail --scan | tee -a /etc/mdadm/mdadm.conf || true

# Suggest update initramfs
if command -v update-initramfs >/dev/null 2>&1; then
  echo "Updating initramfs..."
  update-initramfs -u || true
fi

echo
echo "DONE. Monitor progress with: watch -n 5 cat /proc/mdstat"

exit 0
