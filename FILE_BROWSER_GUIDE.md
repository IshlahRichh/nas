# File Browser - Google Drive Style Interface

## Overview
Sistem file browser dengan tampilan seperti Google Drive yang memungkinkan pengguna untuk:
- Browse file dan folder dengan visual yang menarik
- Preview file langsung di browser (gambar, PDF, video, audio, text)
- Upload file dengan progress bar
- Create folder baru
- Rename dan delete file/folder
- Navigasi dengan breadcrumb yang intuitif

## Features

### 1. Visual File Icons
File ditampilkan dengan emoji icon berdasarkan tipe:
- 🖼️ **Images**: jpg, jpeg, png, gif, bmp, webp
- 📄 **Documents**: pdf, doc, docx
- 🎥 **Videos**: mp4, webm, avi, mov, mkv
- 🎵 **Audio**: mp3, wav, ogg, m4a
- 📦 **Archives**: zip, rar, 7z, tar, gz
- 💻 **Code**: js, ts, jsx, tsx, py, java, cpp
- 📋 **Text**: txt, md, json, xml, csv, log
- 📂 **Folders**: Folder icon kuning

### 2. File Preview
Click pada file untuk preview:
- **Images**: Display langsung dalam modal
- **PDF**: Embedded PDF viewer
- **Videos**: HTML5 video player dengan controls
- **Audio**: HTML5 audio player
- **Text Files**: Display content sebagai text

File yang tidak bisa di-preview akan otomatis trigger download.

### 3. View Modes
- **Grid View**: Card-style layout seperti Google Drive
- **List View**: Table layout dengan detail lengkap (nama, tipe, ukuran, tanggal modifikasi)

### 4. Breadcrumb Navigation
- Click pada segment path untuk navigate ke folder parent
- Format: Folder Name / subfolder1 / subfolder2

### 5. File Operations
- **Upload**: Drag & drop atau click button dengan progress bar
- **Create Folder**: Dialog untuk create subfolder
- **Rename**: Ubah nama file/folder (write access required)
- **Delete**: Hapus file/folder (write access required)
- **Download**: Download file ke local

## Technical Implementation

### Frontend (FolderView.tsx)

#### State Management
```typescript
const [showPreview, setShowPreview] = useState(false);
const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
const [currentPath, setCurrentPath] = useState('');
const [uploadProgress, setUploadProgress] = useState(0);
```

#### Helper Functions

**getFileIcon(fileName: string)**
- Returns emoji icon based on file extension
- Fallback to 📄 for unknown types

**canPreview(fileName: string)**
- Checks if file type supports in-browser preview
- Returns boolean

**handlePreview(file: FileItem)**
- Opens preview modal for previewable files
- Triggers download for non-previewable files

**getPreviewUrl(file: FileItem)**
- Constructs API URL for file preview
- Format: `/api/files/folder/:folderId/preview/:filename?path=subfolder`

#### Grid View
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
  {files.map(file => (
    <div onClick={() => handlePreview(file)}>
      {file.type === 'folder' ? <IconFolder /> : getFileIcon(file.name)}
      <div>{file.name}</div>
      {/* Action buttons on hover */}
    </div>
  ))}
</div>
```

#### List View
```tsx
<table>
  <tbody>
    {files.map(file => (
      <tr onClick={() => handlePreview(file)}>
        <td>
          {file.type === 'folder' ? <IconFolder /> : getFileIcon(file.name)}
          {file.name}
        </td>
        <td>{file.type}</td>
        <td>{formatFileSize(file.size)}</td>
        <td>{formatDate(file.modified)}</td>
        <td>{/* Action buttons */}</td>
      </tr>
    ))}
  </tbody>
</table>
```

#### Preview Modal
```tsx
{showPreview && previewFile && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-75">
    <div className="w-full h-full flex flex-col">
      {/* Header with filename and actions */}
      <div className="flex justify-between p-4">
        <h2>{previewFile.name}</h2>
        <button onClick={handleDownload}>Download</button>
        <button onClick={() => setShowPreview(false)}>Close</button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderPreviewContent()}
      </div>
    </div>
  </div>
)}
```

### Backend (fileController.js)

#### Preview Endpoint
```javascript
export const previewFile = async (req, res) => {
  const { folderId, filename } = req.params;
  const subPath = req.query.path || '';
  
  // 1. Verify user has access to folder
  const permission = await Permission.findOne({
    where: { user_id: userId, folder_id: folderId }
  });
  
  // 2. Construct full file path
  const fullPath = path.join(folder.path, subPath, filename);
  
  // 3. Security check: ensure path is within folder
  if (!fullPath.startsWith(folder.path)) {
    return res.status(403).json({ message: 'Invalid path' });
  }
  
  // 4. Get MIME type based on extension
  const mimeType = getMimeType(ext);
  
  // 5. Set headers for inline display
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', 'inline');
  
  // 6. Stream file
  const readStream = createReadStream(fullPath);
  readStream.pipe(res);
};
```

#### Supported MIME Types
```javascript
const mimeTypes = {
  // Images
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  
  // Documents
  '.pdf': 'application/pdf',
  
  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  
  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  
  // Text
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};
```

#### Route
```javascript
// routes/fileRoutes.js
router.get('/folder/:folderId/preview/:filename', fileController.previewFile);
```

## Usage Flow

### 1. User Opens Folder
```
User clicks folder → Navigate to FolderView → 
fetchFolderContents() → Display files in grid/list
```

### 2. User Clicks File
```
Click file → handlePreview(file) →
Check canPreview() →
  If YES: Open preview modal with file content
  If NO: Trigger download
```

### 3. Preview Rendering
```
renderPreviewContent() →
Detect file extension →
Render appropriate element:
  - <img> for images
  - <iframe> for PDF
  - <video> for videos
  - <audio> for audio
  - <pre> for text
```

### 4. File Upload
```
User selects file → Upload via FormData →
Track progress with onUploadProgress →
Update uploadProgress state →
Display progress bar →
Refresh file list on success
```

## Security Considerations

### 1. Path Traversal Prevention
```javascript
// Backend security check
if (!fullPath.startsWith(folder.path)) {
  return res.status(403).json({ message: 'Invalid path' });
}
```

### 2. Access Control
- User must have permission to folder
- Read access: Can view and download
- Write access: Can also upload, rename, delete

### 3. File Sanitization
- Filename encoding: `encodeURIComponent(filename)`
- Path sanitization on backend
- MIME type validation

## Performance Optimization

### 1. File Streaming
- Use `createReadStream()` instead of reading entire file
- Memory efficient for large files

### 2. Caching
```javascript
res.setHeader('Cache-Control', 'public, max-age=31536000');
res.setHeader('Last-Modified', stats.mtime.toUTCString());
```

### 3. Lazy Loading
- Load file list on demand
- Preview content loaded only when modal opens

### 4. Responsive Design
- Grid columns adjust: 2 (mobile) to 6 (desktop)
- Touch-friendly button sizes
- Scrollable breadcrumb on mobile

## Browser Compatibility

### Supported Features
- ✅ File API for uploads
- ✅ HTML5 video/audio players
- ✅ PDF iframe embedding
- ✅ Drag & drop file upload
- ✅ Progress tracking

### Fallbacks
- Non-previewable files → Download
- Old browsers → Basic file list
- No JavaScript → Server-side rendering (future)

## Future Enhancements

### Planned Features
1. **Thumbnails**: Generate and cache thumbnails for images
2. **Video Thumbnails**: Extract frame as preview
3. **Search**: Full-text search in folder
4. **Sorting**: Sort by name, size, date
5. **Bulk Operations**: Select multiple files
6. **Share Links**: Generate temporary share URLs
7. **Zip Download**: Download folder as zip
8. **File Versioning**: Keep file history
9. **Comments**: Add comments to files
10. **Tags**: Tag files for organization

### Performance Improvements
1. **Virtual Scrolling**: For folders with many files
2. **Image Optimization**: Compress on upload
3. **CDN Integration**: Serve static files from CDN
4. **Progressive Loading**: Load preview in chunks

## Troubleshooting

### Preview Not Working
1. Check browser console for errors
2. Verify MIME type is correct
3. Check file permissions on RAID
4. Ensure user has read access to folder

### Upload Fails
1. Check disk space on RAID
2. Verify user has write access
3. Check file size limits (if configured)
4. Ensure folder has 777 permissions

### Slow Performance
1. Check RAID health (mdadm status)
2. Monitor CPU/RAM usage
3. Reduce file list size (pagination)
4. Enable thumbnail caching

## API Reference

### GET /api/files/folder/:folderId
Get files in folder
- Query: `?path=subfolder` for subfolders
- Returns: `{ folder, files[] }`

### GET /api/files/folder/:folderId/preview/:filename
Preview file content
- Query: `?path=subfolder` for files in subfolders
- Returns: File stream with appropriate MIME type

### POST /api/files/folder/:folderId/upload
Upload file
- Body: FormData with 'file' field
- Query: `?path=subfolder` for upload location
- Returns: `{ message, file }`

### POST /api/files/folder/:folderId/create-folder
Create subfolder
- Body: `{ folderName, subPath }`
- Returns: `{ message }`

### PUT /api/files/folder/:folderId/rename
Rename file/folder
- Body: `{ oldPath, newName }`
- Returns: `{ message, newPath }`

### DELETE /api/files/folder/:folderId/delete
Delete file/folder
- Body: `{ path }`
- Returns: `{ message }`

## Conclusion
File browser ini memberikan user experience yang modern dan intuitif, mirip dengan Google Drive. Dengan kombinasi preview langsung, navigasi yang mudah, dan operasi file yang lengkap, sistem ini memudahkan pengelolaan file di NAS RAID.
