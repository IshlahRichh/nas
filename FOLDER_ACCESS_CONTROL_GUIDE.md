# Folder Access Control System

## Overview
Sistem kontrol akses folder yang memungkinkan admin untuk memberikan permission kepada user dengan dua level akses:
- **Read Only**: User hanya bisa melihat dan download file
- **Full Control**: User memiliki kontrol penuh (create, upload, rename, delete)

## Features

### 1. Access Levels

#### 📖 Read Only (`access_level: 'read'`)
User dengan akses Read Only dapat:
- ✅ Browse folder dan subfolder
- ✅ View file list
- ✅ Download file
- ✅ Preview file (gambar, PDF, video, audio)
- ❌ Upload file baru
- ❌ Create folder baru
- ❌ Rename file/folder
- ❌ Delete file/folder

#### ✏️ Full Control (`access_level: 'write'`)
User dengan akses Full Control dapat:
- ✅ Semua kemampuan Read Only
- ✅ Upload file
- ✅ Create folder baru
- ✅ Rename file/folder
- ✅ Delete file/folder
- ✅ Kontrol penuh atas isi folder

### 2. Default Permission
**Default: Full Control (`write`)**
- Saat admin assign folder ke user, default access level adalah 'write'
- Ini memberikan user kontrol penuh untuk mengelola file mereka
- Admin bisa mengubah ke 'read' jika hanya ingin user melihat saja

## Technical Implementation

### Database Schema (Permission Table)
```sql
CREATE TABLE permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  folder_id INT NOT NULL,
  access_level ENUM('read', 'write') DEFAULT 'write',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_folder (user_id, folder_id)
);
```

### Backend Implementation

#### Controller (userController.js)
```javascript
export const assignFoldersToUser = async (req, res) => {
    const { userId } = req.params;
    const { folderIds, folderPermissions } = req.body;

    // Delete existing permissions
    await Permission.destroy({ where: { user_id: userId } });

    // Create new permissions with specified access level
    const permissions = folderIds.map(folderId => ({
        user_id: userId,
        folder_id: folderId,
        // Use specific permission or default to 'write'
        access_level: folderPermissions?.[folderId] || 'write'
    }));
    
    await Permission.bulkCreate(permissions);
};
```

#### Request Body
```javascript
POST /api/users/:userId/folders
{
  "folderIds": [1, 2, 3],
  "folderPermissions": {
    "1": "write",  // Full Control
    "2": "read",   // Read Only
    "3": "write"   // Full Control
  }
}
```

### Frontend Implementation

#### State Management (UserManagement.tsx)
```typescript
const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
const [folderPermissions, setFolderPermissions] = useState<{ 
  [key: number]: 'read' | 'write' 
}>({});
```

#### Toggle Folder Selection
```typescript
const toggleFolderSelection = (folderId: number) => {
    setSelectedFolders(prev => {
        if (prev.includes(folderId)) {
            // Remove folder and its permission
            const newPermissions = { ...folderPermissions };
            delete newPermissions[folderId];
            setFolderPermissions(newPermissions);
            return prev.filter(id => id !== folderId);
        } else {
            // Add folder with default 'write' permission
            setFolderPermissions(prev => ({ 
              ...prev, 
              [folderId]: 'write' 
            }));
            return [...prev, folderId];
        }
    });
};
```

#### Change Permission
```typescript
const changeFolderPermission = (
  folderId: number, 
  permission: 'read' | 'write'
) => {
    setFolderPermissions(prev => ({ 
      ...prev, 
      [folderId]: permission 
    }));
};
```

#### Modal UI
```tsx
<div className="folder-item">
  <input
    type="checkbox"
    checked={selectedFolders.includes(folder.id)}
    onChange={() => toggleFolderSelection(folder.id)}
  />
  <div className="folder-info">
    <div>{folder.folder_name}</div>
    <div>{folder.path}</div>
  </div>
  {selectedFolders.includes(folder.id) && (
    <select
      value={folderPermissions[folder.id] || 'write'}
      onChange={(e) => changeFolderPermission(
        folder.id, 
        e.target.value as 'read' | 'write'
      )}
    >
      <option value="read">📖 Read Only</option>
      <option value="write">✏️ Full Control</option>
    </select>
  )}
</div>
```

#### Statistics Display
```tsx
<span>
  Selected: {selectedFolders.length} folder(s) | 
  Full Control: {Object.values(folderPermissions)
    .filter(p => p === 'write').length} | 
  Read Only: {Object.values(folderPermissions)
    .filter(p => p === 'read').length}
</span>
```

### File Controller Access Check

#### Read Access Check
```javascript
// fileController.js - getFilesInFolder
const permission = await Permission.findOne({
    where: { 
        user_id: userId,
        folder_id: folderId
    }
});

if (!permission) {
    return res.status(403).json({ 
      message: 'Access denied to this folder' 
    });
}

// Both 'read' and 'write' can view files
const folder = permission.folder;
```

#### Write Access Check
```javascript
// fileController.js - uploadFile, createSubfolder, deleteFile, rename
const permission = await Permission.findOne({
    where: { 
        user_id: userId,
        folder_id: folderId
    }
});

if (!permission) {
    return res.status(403).json({ 
      message: 'Access denied to this folder' 
    });
}

// Check for write permission
if (permission.access_level === 'read') {
    return res.status(403).json({ 
      message: 'You only have read access to this folder' 
    });
}

// Proceed with write operation
```

### FolderView UI Conditional Rendering

```tsx
// FolderView.tsx
{folder.access_level !== 'read' && (
    <div className="action-buttons">
        <button onClick={handleCreateFolder}>
            New Folder
        </button>
        <button onClick={handleUploadFile}>
            Upload File
        </button>
    </div>
)}

// File actions in grid/list view
{folder.access_level !== 'read' && (
    <>
        <button onClick={handleRename}>Rename</button>
        <button onClick={handleDelete}>Delete</button>
    </>
)}
```

## Usage Flow

### 1. Admin Assigns Folder to User

```
Admin → User Management → 
Click "Manage Folders" icon on user → 
Select folders (checkbox) → 
Choose access level (dropdown):
  - 📖 Read Only
  - ✏️ Full Control (default)
→ Click "Assign Folders" → 
Permissions saved to database
```

### 2. User Accesses Folder

```
User login → Dashboard → 
View assigned folders → 
Click folder → 
System checks permission:
  - Has 'read': Show view/download only
  - Has 'write': Show all controls
```

### 3. User Attempts Write Operation

```
User clicks "Upload File" → 
Frontend checks folder.access_level:
  - If 'read': Button hidden/disabled
  - If 'write': Show upload dialog
→ Backend verifies permission →
  - If 'read': Return 403 Forbidden
  - If 'write': Process upload
```

## Security Considerations

### 1. Frontend Validation
- Hide buttons for read-only users
- Prevent UI interaction attempts
- Show appropriate error messages

### 2. Backend Validation
```javascript
// Always verify on backend - frontend can be bypassed
const permission = await Permission.findOne({
    where: { user_id: userId, folder_id: folderId }
});

if (!permission) {
    return res.status(403).json({ message: 'Access denied' });
}

if (permission.access_level === 'read' && isWriteOperation) {
    return res.status(403).json({ 
      message: 'Read-only access' 
    });
}
```

### 3. Path Traversal Prevention
```javascript
// Ensure user can't access files outside their folder
const fullPath = path.join(folder.path, subPath, filename);
if (!fullPath.startsWith(folder.path)) {
    return res.status(403).json({ message: 'Invalid path' });
}
```

### 4. SQL Injection Prevention
- Use Sequelize ORM with parameterized queries
- Never concatenate user input into SQL

## User Experience

### Visual Indicators

#### Folder Assignment Modal
```
┌─────────────────────────────────────────────┐
│ Assign Folders to John Doe                  │
├─────────────────────────────────────────────┤
│ ℹ️ Access Levels:                           │
│ 📖 Read Only: View and download files only  │
│ ✏️ Full Control: Create, upload, rename,   │
│                  and delete files/folders   │
├─────────────────────────────────────────────┤
│ ☑️ Marketing Files                          │
│    /mnt/RAID-ONE/marketing                  │
│    [✏️ Full Control ▼]                      │
├─────────────────────────────────────────────┤
│ ☑️ Project Docs                             │
│    /mnt/RAID-ONE/projects                   │
│    [📖 Read Only ▼]                         │
├─────────────────────────────────────────────┤
│ Selected: 2 folder(s) |                     │
│ Full Control: 1 | Read Only: 1             │
├─────────────────────────────────────────────┤
│              [Cancel] [Assign Folders]      │
└─────────────────────────────────────────────┘
```

#### FolderView with Read-Only Access
```
┌─────────────────────────────────────────────┐
│ 📂 Marketing Files                          │
│ 🏠 / Marketing Files / Q4-2024             │
├─────────────────────────────────────────────┤
│ [Grid View] [List View]                    │
│                                             │
│ (No upload/create buttons shown)           │
├─────────────────────────────────────────────┤
│ 📄 Report.pdf                   [Download]  │
│ 🖼️ Logo.png                     [Download]  │
│ 📊 Data.xlsx                    [Download]  │
│                                             │
│ (No rename/delete buttons)                 │
└─────────────────────────────────────────────┘
```

#### FolderView with Full Control
```
┌─────────────────────────────────────────────┐
│ 📂 Marketing Files                          │
│ 🏠 / Marketing Files / Q4-2024             │
├─────────────────────────────────────────────┤
│ [New Folder] [Upload File]                 │
│ [Grid View] [List View]                    │
├─────────────────────────────────────────────┤
│ 📄 Report.pdf    [Download][Rename][Delete] │
│ 🖼️ Logo.png      [Download][Rename][Delete] │
│ 📊 Data.xlsx     [Download][Rename][Delete] │
└─────────────────────────────────────────────┘
```

## Best Practices

### 1. Default to Full Control
- Most users need to manage their files
- 'write' permission is more useful by default
- Admin can downgrade to 'read' if needed

### 2. Clear Communication
- Use icons: 📖 for Read, ✏️ for Write
- Show help text explaining each level
- Display statistics: "Full Control: 3 | Read Only: 1"

### 3. Granular Control
- Assign different permissions per folder
- One user can have 'write' on Folder A and 'read' on Folder B
- Flexible per business needs

### 4. Audit Trail (Future Enhancement)
```javascript
// Log all permission changes
CREATE TABLE permission_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT,
  user_id INT,
  folder_id INT,
  old_access_level VARCHAR(10),
  new_access_level VARCHAR(10),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### User Can't Upload Files
1. Check permission in database:
```sql
SELECT * FROM permissions 
WHERE user_id = ? AND folder_id = ?;
```

2. Verify access_level is 'write'

3. Check folder physical permissions:
```bash
ls -la /mnt/RAID-ONE/folder-name
# Should show drwxrwxrwx (777)
```

### Permission Not Applying
1. Clear browser cache
2. Logout and login again (refresh JWT token)
3. Check backend logs for permission check errors

### User Sees Edit Buttons But Gets Error
- Frontend/backend mismatch
- Old cached folder data
- Solution: Re-fetch folder data with current permissions

## API Reference

### GET /api/users/:userId/folders
Get user's assigned folders with permissions
```json
Response: [
  {
    "id": 1,
    "folder_name": "Marketing",
    "path": "/mnt/RAID-ONE/marketing",
    "Permission": {
      "access_level": "write"
    }
  }
]
```

### POST /api/users/:userId/folders
Assign folders with permissions
```json
Request: {
  "folderIds": [1, 2, 3],
  "folderPermissions": {
    "1": "write",
    "2": "read",
    "3": "write"
  }
}
```

### GET /api/files/folder/:folderId
Get files in folder (checks permission)
```json
Response: {
  "folder": {
    "id": 1,
    "name": "Marketing",
    "path": "/",
    "access_level": "write"  // Important: Used by frontend
  },
  "files": [...]
}
```

## Conclusion
Sistem access control ini memberikan flexibilitas kepada admin untuk mengelola permission user dengan dua level yang jelas:
- **Read Only**: Untuk user yang hanya perlu melihat/download
- **Full Control**: Untuk user yang perlu mengelola file (default)

Dengan default 'write', semua user yang diberi akses folder otomatis memiliki kontrol penuh, sesuai dengan kebutuhan kolaborasi tim yang efektif.
