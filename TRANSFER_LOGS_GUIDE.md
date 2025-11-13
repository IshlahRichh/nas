# Transfer Logs System - Comprehensive Guide

## Overview

The Transfer Logs system provides comprehensive monitoring and analysis of file upload/download operations in your NAS system. It's designed to help analyze throughput, packet loss, and overall transfer performance.

## Features

### 📊 Real-Time Monitoring
- **Upload/Download Tracking**: Every file transfer is logged with detailed metrics
- **Performance Metrics**: Duration, throughput (MB/s), file size, bytes transferred
- **Session Grouping**: Multiple transfers can be grouped using session IDs
- **Status Tracking**: Success, failed, or partial transfers with error logging

### 📈 Statistics Dashboard
The Transfer Logs page displays comprehensive statistics:

1. **Summary Cards**:
   - Total Transfers
   - Average Throughput (MB/s)
   - Total Data Transferred
   - Success Rate (%)

2. **Detailed Analysis Grid**:
   - Upload Count
   - Download Count
   - Successful Transfers
   - Failed Transfers
   - Maximum Throughput
   - Minimum Throughput
   - Packet Loss Rate (%)
   - Total Retries

### 🔍 Filtering & Search
- Filter by transfer type (upload/download)
- Filter by status (success/failed/partial)
- Date range filtering (start date to end date)
- User filtering (admin only)
- Folder filtering (admin only)

### 👥 Role-Based Access
- **Admin Users**: View all transfer logs from all users
- **Regular Users**: View only their own transfer logs

## Database Schema

The `transfer_logs` table includes:

```sql
CREATE TABLE transfer_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    folder_id INT NOT NULL,
    transfer_type ENUM('upload', 'download') NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL COMMENT 'Size in bytes',
    file_path VARCHAR(255),
    duration INT NOT NULL COMMENT 'Duration in milliseconds',
    throughput FLOAT COMMENT 'Throughput in MB/s',
    status ENUM('success', 'failed', 'partial') NOT NULL DEFAULT 'success',
    error_message TEXT,
    client_ip VARCHAR(45) COMMENT 'IPv4 or IPv6',
    user_agent TEXT,
    session_id VARCHAR(255) COMMENT 'Group multiple transfers in one session',
    bytes_transferred BIGINT COMMENT 'Actual bytes transferred (for packet loss calculation)',
    retries INT DEFAULT 0 COMMENT 'Number of retry attempts',
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_transfer_type (transfer_type),
    INDEX idx_status (status),
    INDEX idx_created_at (createdAt),
    INDEX idx_session_id (session_id)
);
```

## API Endpoints

### GET `/api/transfer-logs/my-logs`
Get transfer logs for the authenticated user.

**Query Parameters**:
- `type`: Filter by transfer type ('upload' or 'download')
- `status`: Filter by status ('success', 'failed', 'partial')
- `start_date`: Start date for filtering
- `end_date`: End date for filtering
- `limit`: Number of records to return (default: 100)

**Response**:
```json
{
    "success": true,
    "logs": [
        {
            "id": 1,
            "transfer_type": "upload",
            "file_name": "example.pdf",
            "file_size": 1048576,
            "duration": 2500,
            "throughput": 0.42,
            "status": "success",
            "createdAt": "2024-01-01T12:00:00.000Z"
        }
    ]
}
```

### GET `/api/transfer-logs/all` (Admin Only)
Get all transfer logs from all users.

**Query Parameters**: Same as `/my-logs` plus:
- `user_id`: Filter by specific user
- `folder_id`: Filter by specific folder

### GET `/api/transfer-logs/statistics`
Get comprehensive statistics for transfer logs.

**Response**:
```json
{
    "success": true,
    "statistics": {
        "total_transfers": 150,
        "total_uploads": 100,
        "total_downloads": 50,
        "successful_transfers": 145,
        "failed_transfers": 5,
        "avg_throughput": 5.25,
        "max_throughput": 12.5,
        "min_throughput": 0.8,
        "total_size": 5368709120,
        "success_rate": 96.67,
        "packet_loss_rate": 0.02,
        "total_retries": 3
    }
}
```

### GET `/api/transfer-logs/session/:sessionId`
Get all transfers in a specific session.

**Response**:
```json
{
    "success": true,
    "session": {
        "session_id": "550e8400-e29b-41d4-a716-446655440000",
        "transfers": [
            // Array of transfer log objects
        ],
        "summary": {
            "total_files": 5,
            "total_size": 10485760,
            "total_duration": 15000,
            "avg_throughput": 0.7,
            "success_count": 5,
            "failed_count": 0
        }
    }
}
```

### POST `/api/transfer-logs`
Create a new transfer log entry (used internally by upload/download controllers).

**Request Body**:
```json
{
    "user_id": 1,
    "folder_id": 1,
    "transfer_type": "upload",
    "file_name": "example.pdf",
    "file_size": 1048576,
    "duration": 2500,
    "throughput": 0.42,
    "status": "success",
    "client_ip": "192.168.1.100",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### DELETE `/api/transfer-logs/cleanup` (Admin Only)
Delete old transfer logs (older than specified days).

**Query Parameters**:
- `days`: Number of days to keep (default: 30)

## Integration with Upload/Download

Transfer logging is automatically integrated into the file upload and download processes:

### Upload Logging
```javascript
// In fileController.js - uploadFile()
const startTime = Date.now();
// ... file upload logic ...
const duration = Date.now() - startTime;
const throughput = (file.size / 1024 / 1024) / (duration / 1000);

await TransferLog.create({
    user_id: req.user.userId,
    folder_id: req.params.folderId,
    transfer_type: 'upload',
    file_name: file.originalname,
    file_size: file.size,
    duration,
    throughput,
    status: 'success',
    client_ip: req.ip,
    user_agent: req.get('user-agent'),
    session_id: req.body.session_id || uuidv4()
});
```

### Download Logging
```javascript
// In fileController.js - downloadFile()
const startTime = Date.now();
let bytesTransferred = 0;

res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const throughput = (fileSize / 1024 / 1024) / (duration / 1000);
    
    await TransferLog.create({
        user_id: req.user.userId,
        folder_id: folderId,
        transfer_type: 'download',
        file_name: fileName,
        file_size: fileSize,
        duration,
        throughput,
        status: 'success',
        bytes_transferred: bytesTransferred,
        client_ip: req.ip,
        user_agent: req.get('user-agent')
    });
});
```

## Frontend Usage

### Accessing Transfer Logs
1. Log in to your NAS system
2. Navigate to **Transfer Logs** from the sidebar menu
3. View statistics dashboard at the top
4. Filter and search through the transfer log table

### Understanding Metrics

**Throughput**: 
- Calculated as: `(file_size_MB) / (duration_seconds)`
- Displayed in MB/s
- Higher is better (indicates faster transfer)

**Packet Loss Rate**:
- Calculated as: `(expected_bytes - actual_bytes) / expected_bytes * 100`
- Displayed as percentage
- Lower is better (0% means perfect transfer)
- Only applicable when bytes_transferred is tracked

**Duration**:
- Time taken for the complete transfer
- Displayed in seconds (converted from milliseconds)
- Includes network latency and processing time

**Success Rate**:
- Percentage of successful transfers vs total transfers
- Formula: `(successful_transfers / total_transfers) * 100`

## Use Cases

### 1. Performance Testing
Monitor throughput during file transfers to:
- Test network performance
- Identify bottlenecks
- Compare performance across different times/conditions
- Generate reports for thesis/research

### 2. Troubleshooting
Identify and diagnose issues:
- Failed transfers with error messages
- Slow transfers (low throughput)
- Packet loss detection
- Retry patterns

### 3. Usage Analysis
Track system usage:
- Most active users
- Peak usage times
- Data transfer trends
- Storage growth patterns

### 4. Research & Testing
For academic purposes:
- Network throughput analysis
- Packet loss rate measurements
- Transfer protocol comparison
- System performance benchmarking

## Configuration

### Auto-Cleanup (Optional)
To automatically delete old logs, you can set up a cron job:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * curl -X DELETE "http://localhost:3001/api/transfer-logs/cleanup?days=30" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Adjust Retention Period
Modify the cleanup days parameter in the API call:
- `days=7`: Keep logs for 1 week
- `days=30`: Keep logs for 1 month (default)
- `days=90`: Keep logs for 3 months

## Best Practices

1. **Regular Monitoring**: Check transfer logs daily to catch issues early
2. **Set Retention Policy**: Delete old logs to maintain database performance
3. **Use Session IDs**: Group related transfers for batch analysis
4. **Filter Effectively**: Use filters to focus on specific issues or patterns
5. **Export Data**: Use statistics for reports and presentations

## Troubleshooting

### No Logs Appearing
1. Check if backend server is running: `sudo systemctl status nas-system`
2. Verify database connection: `sudo mysql -D nasdb -e "SELECT COUNT(*) FROM transfer_logs;"`
3. Check file upload/download is working correctly
4. Look for errors in server logs: `pm2 logs` or `journalctl -u nas-system`

### Incorrect Statistics
1. Verify time zone settings are consistent
2. Check filter settings (may exclude some logs)
3. Ensure all transfers are completing successfully
4. Review error_message field for failed transfers

### Performance Issues
1. Add indexes if table grows large:
   ```sql
   ALTER TABLE transfer_logs ADD INDEX idx_folder_id (folder_id);
   ```
2. Implement regular cleanup of old logs
3. Consider archiving old data to separate table
4. Optimize queries with appropriate WHERE clauses

## Navigation

The Transfer Logs page is accessible from:
- **Sidebar Menu**: Click "Transfer Logs" (chart icon)
- **Direct URL**: `http://your-nas-ip:5173/transfer-logs`

## Future Enhancements

Potential improvements to consider:
- Real-time updates using WebSocket
- Export logs to CSV/Excel
- Advanced charts and visualizations
- Bandwidth throttling detection
- Geolocation mapping of transfers
- Email alerts for failed transfers
- Scheduled reports generation

## Support

For issues or questions:
1. Check server logs for errors
2. Verify API endpoints are accessible
3. Review database schema and relationships
4. Check frontend console for JavaScript errors

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
