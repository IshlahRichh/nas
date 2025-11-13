import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { setPageTitle } from '../store/themeConfigSlice';
import { api } from '../services/api';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import IconFolder from '../components/Icon/IconFolder';
import IconFile from '../components/Icon/IconFile';
import IconDownload from '../components/Icon/IconDownload';
import IconTrash from '../components/Icon/IconTrash';
import IconPencil from '../components/Icon/IconPencil';
import IconPlus from '../components/Icon/IconPlus';
import IconLayoutGrid from '../components/Icon/IconLayoutGrid';
import IconListCheck from '../components/Icon/IconListCheck';
import IconFolderPlus from '../components/Icon/IconFolderPlus';
import IconEdit from '../components/Icon/IconEdit';
import IconHome from '../components/Icon/IconHome';
import IconMusic from '../components/Icon/IconMusic';
import IconVideo from '../components/Icon/IconVideo';
import IconArchive from '../components/Icon/IconArchive';
import IconMenuDots from '../components/Icon/IconMenuDots';
import IconImage from '../components/Icon/IconImage';
import IconX from '../components/Icon/IconX';
import IconLink from '../components/Icon/IconLink';
import IconShare from '../components/Icon/IconShare';
import Dropdown from '../components/Dropdown';

interface FileItem {
    name: string;
    type: 'file' | 'folder';
    size: number;
    modified: string;
    relativePath: string;
}

interface FolderData {
    id: number;
    name: string;
    path: string;
    access_level: string;
}

const FolderView = () => {
    const dispatch = useDispatch();
    const { folderId } = useParams<{ folderId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [folder, setFolder] = useState<FolderData | null>(null);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
    const [lastClickTime, setLastClickTime] = useState<number>(0);
    const [lastClickedFile, setLastClickedFile] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const user = authService.getCurrentUser();

    // Get current path from URL
    const currentPath = searchParams.get('path') || '';

    useEffect(() => {
        if (folderId) {
            loadFolder();
        }
    }, [folderId, searchParams]); // Listen to searchParams changes

    const loadFolder = async () => {
        try {
            const path = currentPath;
            console.log('📂 loadFolder called with path:', path);
            setLoading(true);
            const response = await api.get(`/files/folder/${folderId}`, {
                params: { path }
            });
            
            console.log('✅ Folder loaded:', {
                folderName: response.data.folder.name,
                filesCount: response.data.files.length,
                files: response.data.files.map((f: any) => ({
                    name: f.name,
                    type: f.type,
                    relativePath: f.relativePath
                }))
            });
            
            setFolder({
                id: response.data.folder.id,
                name: response.data.folder.name,
                path: response.data.folder.path,
                access_level: response.data.folder.access_level
            });
            setFiles(response.data.files);
            dispatch(setPageTitle(response.data.folder.name));
        } catch (error: any) {
            console.error('❌ Error loading folder:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to load folder'
            });
            // If folder not found or access denied, redirect to dashboard
            if (error.response?.status === 403 || error.response?.status === 404) {
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const navigateToSubfolder = (subfolder: FileItem) => {
        console.log('🔍 navigateToSubfolder called:', {
            name: subfolder.name,
            type: subfolder.type,
            relativePath: subfolder.relativePath,
            currentPath
        });
        if (subfolder.type === 'folder') {
            // Update URL with new path
            navigate(`/folder/${folderId}?path=${encodeURIComponent(subfolder.relativePath)}`);
        }
    };

    const goBack = () => {
        const pathParts = currentPath.split('/').filter(p => p);
        if (pathParts.length > 0) {
            pathParts.pop();
            const newPath = pathParts.join('/');
            navigate(`/folder/${folderId}${newPath ? `?path=${encodeURIComponent(newPath)}` : ''}`);
        }
    };

    const handleCreateFolder = async () => {
        if (!folder) return;

        if (folder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const { value: folderName } = await Swal.fire({
            title: 'Create New Folder',
            input: 'text',
            inputLabel: 'Folder Name',
            inputPlaceholder: 'Enter folder name',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Folder name is required!';
                }
                if (value.includes('/') || value.includes('\\')) {
                    return 'Folder name cannot contain / or \\';
                }
            }
        });

        if (folderName) {
            try {
                await api.post(`/files/folder/${folderId}/create-folder`, {
                    folderName,
                    subPath: currentPath
                });

                Swal.fire('Success', 'Folder created successfully!', 'success');
                // Reload current path - will trigger useEffect
                loadFolder();
            } catch (error: any) {
                console.error('Error creating folder:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to create folder', 'error');
            }
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!folder) return;

        if (folder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        await uploadFiles(Array.from(selectedFiles));
    };

    const uploadFiles = async (filesToUpload: File[]) => {
        if (!folder) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            const totalFiles = filesToUpload.length;
            let completedFiles = 0;

            for (const file of filesToUpload) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('subPath', currentPath);

                await api.post(`/files/folder/${folderId}/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (progressEvent: any) => {
                        if (progressEvent.total) {
                            const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                            const totalProgress = Math.round(((completedFiles + (fileProgress / 100)) / totalFiles) * 100);
                            setUploadProgress(totalProgress);
                        }
                    }
                });

                completedFiles++;
            }

            Swal.fire('Success', `${totalFiles} file(s) uploaded successfully!`, 'success');
            loadFolder(); // Reload current folder
            
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Error uploading file:', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to upload file', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // Drag and Drop handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (folder?.access_level !== 'read') {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (!folder || folder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            await uploadFiles(droppedFiles);
        }
    };

    const handleDownload = async (file: FileItem) => {
        if (!folder) return;

        try {
            const response = await api.get(`/files/folder/${folderId}/download`, {
                params: { path: file.relativePath },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Error downloading file:', error);
            Swal.fire('Error', error.response?.data?.message || 'Failed to download file', 'error');
        }
    };

    const handleDelete = async (file: FileItem) => {
        if (!folder) return;

        if (folder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${file.type === 'folder' ? 'folder' : 'file'} "${file.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/files/folder/${folderId}/delete`, {
                    data: { filePath: file.relativePath }
                });

                Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                loadFolder(); // Reload current folder
            } catch (error: any) {
                console.error('Error deleting:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete item', 'error');
            }
        }
    };

    const handleRename = async (file: FileItem) => {
        if (!folder) return;

        if (folder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const { value: newName } = await Swal.fire({
            title: 'Rename',
            input: 'text',
            inputValue: file.name,
            inputLabel: 'New name',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) {
                    return 'Name is required!';
                }
                if (value.includes('/') || value.includes('\\')) {
                    return 'Name cannot contain / or \\';
                }
            }
        });

        if (newName && newName !== file.name) {
            try {
                await api.put(`/files/folder/${folderId}/rename`, {
                    oldPath: file.relativePath,
                    newName
                });

                Swal.fire('Success', 'Renamed successfully!', 'success');
                loadFolder(); // Reload current folder
            } catch (error: any) {
                console.error('Error renaming:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to rename', 'error');
            }
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const canPreview = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'pdf', 'mp4', 'webm', 'mp3', 'wav', 'txt', 'json', 'xml', 'csv', 'md'].includes(ext || '');
    };

    const handlePreview = async (file: FileItem) => {
        console.log('👆 handlePreview called:', {
            name: file.name,
            type: file.type,
            relativePath: file.relativePath
        });
        if (file.type === 'folder') {
            navigateToSubfolder(file);
            return;
        }
        
        if (canPreview(file.name)) {
            setPreviewFile(file);
            setShowPreview(true);
        } else {
            handleDownload(file);
        }
    };

    const handleFileClick = (file: FileItem, event: React.MouseEvent) => {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastClickTime;
        
        // Double click detection (within 300ms)
        if (timeDiff < 300 && lastClickedFile === file.relativePath) {
            // Double click - open preview
            handlePreview(file);
            setLastClickTime(0);
            setLastClickedFile('');
        } else {
            // Single click - toggle selection
            if (event.ctrlKey || event.metaKey) {
                // Ctrl/Cmd + click: toggle selection
                toggleFileSelection(file);
            } else if (event.shiftKey && selectedFiles.length > 0) {
                // Shift + click: select range
                selectFileRange(file);
            } else {
                // Normal click: select only this file
                setSelectedFiles([file]);
            }
            setLastClickTime(currentTime);
            setLastClickedFile(file.relativePath);
        }
    };

    const toggleFileSelection = (file: FileItem) => {
        setSelectedFiles(prev => {
            const isSelected = prev.some(f => f.relativePath === file.relativePath);
            if (isSelected) {
                return prev.filter(f => f.relativePath !== file.relativePath);
            } else {
                return [...prev, file];
            }
        });
    };

    const selectFileRange = (file: FileItem) => {
        const lastSelected = selectedFiles[selectedFiles.length - 1];
        const startIndex = files.findIndex(f => f.relativePath === lastSelected.relativePath);
        const endIndex = files.findIndex(f => f.relativePath === file.relativePath);
        
        if (startIndex !== -1 && endIndex !== -1) {
            const start = Math.min(startIndex, endIndex);
            const end = Math.max(startIndex, endIndex);
            const rangeFiles = files.slice(start, end + 1);
            
            // Merge with existing selection
            const newSelection = [...selectedFiles];
            rangeFiles.forEach(f => {
                if (!newSelection.some(sf => sf.relativePath === f.relativePath)) {
                    newSelection.push(f);
                }
            });
            setSelectedFiles(newSelection);
        }
    };

    const isFileSelected = (file: FileItem) => {
        return selectedFiles.some(f => f.relativePath === file.relativePath);
    };

    const clearSelection = () => {
        setSelectedFiles([]);
    };

    const handleBulkDownload = async () => {
        for (const file of selectedFiles) {
            if (file.type === 'file') {
                await handleDownload(file);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (folder?.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${selectedFiles.length} selected item(s)?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Yes, delete them!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                for (const file of selectedFiles) {
                    await api.delete(`/files/folder/${folderId}/delete`, {
                        data: { filePath: file.relativePath }
                    });
                }
                Swal.fire('Deleted!', `${selectedFiles.length} item(s) have been deleted.`, 'success');
                clearSelection();
                loadFolder();
            } catch (error: any) {
                console.error('Error deleting:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete items', 'error');
            }
        }
    };

    const handleCopyLink = () => {
        if (selectedFiles.length === 0) return;
        
        const file = selectedFiles[0];
        const link = `${window.location.origin}/folder/${folderId}?path=${encodeURIComponent(file.relativePath)}`;
        
        navigator.clipboard.writeText(link).then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Link Copied!',
                text: 'File link has been copied to clipboard',
                timer: 2000,
                showConfirmButton: false
            });
        });
    };

    const handleShare = () => {
        if (selectedFiles.length === 0) return;
        
        const file = selectedFiles[0];
        Swal.fire({
            title: 'Share File',
            html: `
                <div class="text-left space-y-3">
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Size:</strong> ${file.type === 'file' ? formatFileSize(file.size) : 'Folder'}</p>
                    <p class="text-sm text-gray-500">Share functionality can be implemented based on your requirements (email, generate share link, etc.)</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: 'OK'
        });
    };

    const getPreviewUrl = (file: FileItem) => {
        if (!folder) return '';
        const token = localStorage.getItem('token');
        const pathParam = currentPath ? `path=${encodeURIComponent(currentPath)}&` : '';
        return `${api.defaults.baseURL}/files/folder/${folderId}/preview/${encodeURIComponent(file.name)}?${pathParam}token=${token}`;
    };

    const isImageFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || '');
    };

    const isVideoFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext || '');
    };

    const isAudioFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext || '');
    };

    const isArchiveFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext || '');
    };

    const isDocumentFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext || '');
    };

    const isExcelFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['xls', 'xlsx', 'csv'].includes(ext || '');
    };

    const isWordFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['doc', 'docx'].includes(ext || '');
    };

    const isPowerPointFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['ppt', 'pptx'].includes(ext || '');
    };

    const isPdfFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ext === 'pdf';
    };

    const isTextFile = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        return ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(ext || '');
    };

    const getFileIcon = (fileName: string, size: 'small' | 'large' = 'large') => {
        const iconClass = size === 'large' ? 'w-16 h-16' : 'w-6 h-6';
        
        if (isImageFile(fileName)) {
            return <IconImage className={`${iconClass} text-pink-500`} />;
        }
        if (isVideoFile(fileName)) {
            return <IconVideo className={`${iconClass} text-blue-500`} />;
        }
        if (isAudioFile(fileName)) {
            return <IconMusic className={`${iconClass} text-purple-500`} />;
        }
        if (isArchiveFile(fileName)) {
            return <IconArchive className={`${iconClass} text-orange-500`} />;
        }
        if (isExcelFile(fileName)) {
            return <IconFile className={`${iconClass} text-green-600`} />;
        }
        if (isWordFile(fileName)) {
            return <IconFile className={`${iconClass} text-blue-600`} />;
        }
        if (isPowerPointFile(fileName)) {
            return <IconFile className={`${iconClass} text-orange-600`} />;
        }
        if (isPdfFile(fileName)) {
            return <IconFile className={`${iconClass} text-red-600`} />;
        }
        if (isTextFile(fileName)) {
            return <IconFile className={`${iconClass} text-gray-600`} />;
        }
        if (isDocumentFile(fileName)) {
            return <IconFile className={`${iconClass} text-green-500`} />;
        }
        return <IconFile className={`${iconClass} text-gray-400`} />;
    };

    const getFileThumbnail = (fileName: string, size: 'small' | 'large' = 'large') => {
        const isSmall = size === 'small';
        const baseClass = `w-full h-full flex flex-col items-center justify-center`;
        const iconSize = isSmall ? 'text-2xl' : 'text-5xl';
        const labelSize = isSmall ? 'text-[8px]' : 'text-xs';
        
        if (isExcelFile(fileName)) {
            return (
                <div className={`${baseClass} bg-green-50 dark:bg-green-900`}>
                    <svg className={`${isSmall ? 'w-6 h-6' : 'w-16 h-16'} ${isSmall ? 'mb-0' : 'mb-2'} text-green-600 dark:text-green-300`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                        <path d="M7 12h2v5H7zm4-3h2v8h-2zm4-3h2v11h-2z"/>
                    </svg>
                    {!isSmall && <div className={`${labelSize} font-bold text-green-600 dark:text-green-300`}>EXCEL</div>}
                </div>
            );
        }
        if (isWordFile(fileName)) {
            return (
                <div className={`${baseClass} bg-blue-50 dark:bg-blue-900`}>
                    <svg className={`${isSmall ? 'w-6 h-6' : 'w-16 h-16'} ${isSmall ? 'mb-0' : 'mb-2'} text-blue-600 dark:text-blue-300`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                        <path d="M8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/>
                    </svg>
                    {!isSmall && <div className={`${labelSize} font-bold text-blue-600 dark:text-blue-300`}>WORD</div>}
                </div>
            );
        }
        if (isPowerPointFile(fileName)) {
            return (
                <div className={`${baseClass} bg-orange-50 dark:bg-orange-900`}>
                    <svg className={`${isSmall ? 'w-6 h-6' : 'w-16 h-16'} ${isSmall ? 'mb-0' : 'mb-2'} text-orange-600 dark:text-orange-300`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                        <path d="M10 12l5-3v6z"/>
                    </svg>
                    {!isSmall && <div className={`${labelSize} font-bold text-orange-600 dark:text-orange-300`}>PPT</div>}
                </div>
            );
        }
        if (isPdfFile(fileName)) {
            return (
                <div className={`${baseClass} bg-red-50 dark:bg-red-900`}>
                    <svg className={`${isSmall ? 'w-6 h-6' : 'w-16 h-16'} ${isSmall ? 'mb-0' : 'mb-2'} text-red-600 dark:text-red-300`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                        <path d="M8 13h8v2H8zm0-3h8v2H8zm0 6h5v2H8z"/>
                    </svg>
                    {!isSmall && <div className={`${labelSize} font-bold text-red-600 dark:text-red-300`}>PDF</div>}
                </div>
            );
        }
        if (isTextFile(fileName)) {
            return (
                <div className={`${baseClass} bg-gray-50 dark:bg-gray-700`}>
                    <svg className={`${isSmall ? 'w-6 h-6' : 'w-16 h-16'} ${isSmall ? 'mb-0' : 'mb-2'} text-gray-600 dark:text-gray-300`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                        <path d="M8 13h8v2H8zm0-3h8v2H8zm0 6h5v2H8z"/>
                    </svg>
                    {!isSmall && <div className={`${labelSize} font-bold text-gray-600 dark:text-gray-300`}>TEXT</div>}
                </div>
            );
        }
        return null;
    };

    const renderPreviewContent = () => {
        if (!previewFile || !folder) return null;

        const ext = previewFile.name.split('.').pop()?.toLowerCase();
        const previewUrl = getPreviewUrl(previewFile);

        // Images
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
            return (
                <div className="flex justify-center items-center h-full bg-black">
                    <img 
                        src={previewUrl} 
                        alt={previewFile.name}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );
        }

        // PDF
        if (ext === 'pdf') {
            return (
                <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title={previewFile.name}
                />
            );
        }

        // Video
        if (['mp4', 'webm'].includes(ext || '')) {
            return (
                <div className="flex justify-center items-center h-full bg-black">
                    <video 
                        controls 
                        className="max-w-full max-h-full"
                        src={previewUrl}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }

        // Audio
        if (['mp3', 'wav'].includes(ext || '')) {
            return (
                <div className="flex flex-col justify-center items-center h-full">
                    <div className="text-6xl mb-4">🎵</div>
                    <div className="text-lg font-medium mb-4">{previewFile.name}</div>
                    <audio 
                        controls 
                        className="w-96"
                        src={previewUrl}
                    >
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            );
        }

        // Text files
        if (['txt', 'json', 'xml', 'csv', 'md'].includes(ext || '')) {
            return (
                <div className="p-6 h-full overflow-auto">
                    <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title={previewFile.name}
                    />
                </div>
            );
        }

        return (
            <div className="flex flex-col justify-center items-center h-full">
                <div className="text-6xl mb-4">📄</div>
                <div className="text-lg">Cannot preview this file type</div>
                <button 
                    className="btn btn-primary mt-4"
                    onClick={() => handleDownload(previewFile)}
                >
                    Download to view
                </button>
            </div>
        );
    };

    if (!folder && !loading) {
        return (
            <div className="text-center py-10">
                <p>Folder not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Preview Modal */}
            {showPreview && previewFile && (
                <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full h-full max-w-6xl max-h-[90vh] m-4 flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-medium dark:text-white truncate flex-1">{previewFile.name}</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleDownload(previewFile)}
                                >
                                    <IconDownload className="w-4 h-4 mr-2" />
                                    Download
                                </button>
                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => {
                                        setShowPreview(false);
                                        setPreviewFile(null);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Body */}
                        <div className="flex-1 overflow-hidden">
                            {renderPreviewContent()}
                        </div>
                    </div>
                </div>
            )}

            {/* Header - Google Drive Style */}
            <div className="panel">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <IconFolder className="w-8 h-8 text-yellow-500" />
                        <h5 className="font-semibold text-xl dark:text-white-light">
                            {folder?.name || 'Loading...'}
                        </h5>
                    </div>
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <IconLayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <IconListCheck className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Breadcrumb Navigation & Actions - Google Drive Style */}
            {folder && (
                <div className="panel">
                    {/* Selection Toolbar */}
                    {selectedFiles.length > 0 && (
                        <div className="mb-4 p-3 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={clearSelection}
                                    title="Clear Selection"
                                >
                                    <IconX className="w-4 h-4" />
                                </button>
                                <span className="font-semibold text-primary">
                                    {selectedFiles.length} item(s) selected
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={handleBulkDownload}
                                    title="Download Selected"
                                >
                                    <IconDownload className="w-4 h-4 mr-2" />
                                    Download
                                </button>
                                {selectedFiles.length === 1 && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-info"
                                            onClick={handleCopyLink}
                                            title="Copy Link"
                                        >
                                            <IconLink className="w-4 h-4 mr-2" />
                                            Copy Link
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-success"
                                            onClick={handleShare}
                                            title="Share"
                                        >
                                            <IconShare className="w-4 h-4 mr-2" />
                                            Share
                                        </button>
                                    </>
                                )}
                                {folder.access_level !== 'read' && (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={handleBulkDelete}
                                        title="Delete Selected"
                                    >
                                        <IconTrash className="w-4 h-4 mr-2" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                className="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded"
                                onClick={() => navigate(`/folder/${folderId}`)}
                                title="Go to root"
                            >
                                <IconHome className="w-4 h-4" />
                                <span className="font-medium">{folder.name}</span>
                            </button>
                            
                            {currentPath && currentPath.split('/').filter(p => p).map((part, index, arr) => {
                                const isLast = index === arr.length - 1;
                                const pathToHere = arr.slice(0, index + 1).join('/');
                                return (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-gray-400">/</span>
                                        <button
                                            type="button"
                                            className={`hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1 rounded ${isLast ? 'font-medium text-primary' : ''}`}
                                            onClick={() => navigate(`/folder/${folderId}?path=${encodeURIComponent(pathToHere)}`)}
                                        >
                                            {part}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Action Buttons - Google Drive Style */}
                        {folder.access_level !== 'read' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={handleCreateFolder}
                                >
                                    <IconFolderPlus className="w-5 h-5 mr-2" />
                                    New Folder
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    multiple
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <IconPlus className="w-5 h-5 mr-2" />
                                    {isUploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Upload Progress Bar */}
                    {isUploading && (
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-center mt-1">Uploading... {uploadProgress}%</p>
                        </div>
                    )}
                </div>
            )}

            {/* Files Display */}
            {folder && (
                <div 
                    ref={dropZoneRef}
                    className={`panel relative ${isDragging ? 'ring-4 ring-primary ring-opacity-50' : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {/* Drag Overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 z-10 bg-primary bg-opacity-10 flex items-center justify-center border-4 border-dashed border-primary rounded-lg">
                            <div className="text-center">
                                <IconPlus className="w-16 h-16 mx-auto mb-3 text-primary" />
                                <p className="text-lg font-semibold text-primary">Drop files here to upload</p>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12 inline-block align-middle"></span>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <IconFolder className="w-16 h-16 mx-auto mb-3 opacity-30" />
                            <p>This folder is empty</p>
                            {folder.access_level !== 'read' && (
                                <p className="text-sm mt-2">Drag and drop files here or click Upload File button</p>
                            )}
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {files.map((file, index) => {
                                const isSelected = isFileSelected(file);
                                return (
                                    <div
                                        key={index}
                                        className={`border rounded-lg overflow-hidden hover:shadow-lg transition-all group cursor-pointer relative ${
                                            isSelected 
                                                ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                                        }`}
                                        onClick={(e) => handleFileClick(file, e)}
                                    >
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 z-10 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Thumbnail */}
                                        <div className="aspect-square">
                                            {file.type === 'folder' ? (
                                                <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                                    <IconFolder className="w-16 h-16 text-yellow-500" />
                                                </div>
                                            ) : isImageFile(file.name) ? (
                                                <div className="h-full bg-gray-100 dark:bg-gray-700">
                                                    <img 
                                                        src={getPreviewUrl(file)} 
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : isVideoFile(file.name) ? (
                                                <div className="h-full bg-gray-100 dark:bg-gray-700">
                                                    <video 
                                                        src={getPreviewUrl(file)}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : getFileThumbnail(file.name) ? (
                                                <div className="h-full">
                                                    {getFileThumbnail(file.name)}
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                                                    {getFileIcon(file.name)}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* File Info with Action Menu */}
                                        <div className="p-2 flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate" title={file.name}>
                                                    {file.name}
                                                </div>
                                                {file.type === 'file' && (
                                                    <div className="text-xs text-gray-500">
                                                        {formatFileSize(file.size)}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Action Menu Dropdown */}
                                            <Dropdown
                                                offset={[0, 5]}
                                                placement="bottom-end"
                                                btnClassName="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                button={
                                                    <IconMenuDots className="w-5 h-5 rotate-90" />
                                                }
                                            >
                                                <ul className="text-sm font-medium whitespace-nowrap">
                                                    {file.type === 'file' && (
                                                        <li>
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(file);
                                                                }}
                                                            >
                                                                <IconDownload className="w-4 h-4" />
                                                                Download
                                                            </button>
                                                        </li>
                                                    )}
                                                    {folder.access_level !== 'read' && (
                                                        <>
                                                            <li>
                                                                <button
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRename(file);
                                                                    }}
                                                                >
                                                                    <IconEdit className="w-4 h-4" />
                                                                    Rename
                                                                </button>
                                                            </li>
                                                            <li>
                                                                <button
                                                                    type="button"
                                                                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(file);
                                                                    }}
                                                                >
                                                                    <IconTrash className="w-4 h-4" />
                                                                    Delete
                                                                </button>
                                                            </li>
                                                        </>
                                                    )}
                                                </ul>
                                            </Dropdown>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox"
                                                checked={selectedFiles.length === files.length && files.length > 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedFiles([...files]);
                                                    } else {
                                                        clearSelection();
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Modified</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {files.map((file, index) => {
                                        const isSelected = isFileSelected(file);
                                        return (
                                            <tr 
                                                key={index}
                                                className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                                    isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                                                }`}
                                                onClick={(e) => handleFileClick(file, e)}
                                            >
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="form-checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleFileSelection(file)}
                                                    />
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-3">
                                                        {file.type === 'folder' ? (
                                                            <IconFolder className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                                                        ) : isImageFile(file.name) ? (
                                                            <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                                                                <img 
                                                                    src={getPreviewUrl(file)} 
                                                                    alt={file.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ) : isVideoFile(file.name) ? (
                                                            <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden relative">
                                                                <video 
                                                                    src={getPreviewUrl(file)}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ) : getFileThumbnail(file.name, 'small') ? (
                                                            <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden">
                                                                {getFileThumbnail(file.name, 'small')}
                                                            </div>
                                                        ) : (
                                                            <div className="w-10 h-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                                                                {getFileIcon(file.name, 'small')}
                                                            </div>
                                                        )}
                                                        <span className="font-medium">{file.name}</span>
                                                    </div>
                                                </td>
                                                <td className="capitalize">{file.type}</td>
                                                <td>{file.type === 'file' ? formatFileSize(file.size) : '-'}</td>
                                                <td>{formatDate(file.modified)}</td>
                                                <td>
                                                    <div className="flex justify-center gap-2">
                                                        {file.type === 'file' && (
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownload(file);
                                                                }}
                                                                title="Download"
                                                            >
                                                                <IconDownload className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {folder.access_level !== 'read' && (
                                                            <>
                                                                <button
                                                                    className="btn btn-sm btn-outline-warning"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRename(file);
                                                                    }}
                                                                    title="Rename"
                                                                >
                                                                    <IconEdit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(file);
                                                                    }}
                                                                    title="Delete"
                                                                >
                                                                    <IconTrash className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FolderView;
