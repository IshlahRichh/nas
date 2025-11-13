import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setPageTitle } from '../store/themeConfigSlice';
import { api } from '../services/api';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';
import IconFolder from '../components/Icon/IconFolder';
import IconFile from '../components/Icon/IconFile';
import IconDownload from '../components/Icon/IconDownload';
import IconTrash from '../components/Icon/IconTrash';
import IconPlus from '../components/Icon/IconPlus';
import IconCloudDownload from '../components/Icon/IconCloudDownload';
import IconLayoutGrid from '../components/Icon/IconLayoutGrid';
import IconListCheck from '../components/Icon/IconListCheck';
import IconFolderPlus from '../components/Icon/IconFolderPlus';
import IconEdit from '../components/Icon/IconEdit';
import IconHome from '../components/Icon/IconHome';

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
    files: FileItem[];
    error?: string;
}

const UserDashboard = () => {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const user = authService.getCurrentUser();

    useEffect(() => {
        dispatch(setPageTitle('My Files'));
        fetchUserFolders();
    }, [dispatch]);

    const fetchUserFolders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/files/my-folders');
            setFolders(response.data);
            
            // Check if there's a folder query parameter
            const folderId = searchParams.get('folder');
            if (folderId && response.data.length > 0) {
                const folder = response.data.find((f: FolderData) => f.id === parseInt(folderId));
                if (folder) {
                    selectFolder(folder);
                    return;
                }
            }
            
            // Auto-select first folder if available
            if (response.data.length > 0 && !selectedFolder) {
                selectFolder(response.data[0]);
            }
        } catch (error: any) {
            console.error('Error fetching folders:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to load folders'
            });
        } finally {
            setLoading(false);
        }
    };

    const selectFolder = async (folder: FolderData, path: string = '') => {
        try {
            setLoading(true);
            setSelectedFolder(folder);
            setCurrentPath(path);
            
            const response = await api.get(`/files/folder/${folder.id}`, {
                params: { path }
            });
            
            setFiles(response.data.files);
        } catch (error: any) {
            console.error('Error loading folder:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to load folder contents'
            });
        } finally {
            setLoading(false);
        }
    };

    const navigateToSubfolder = (subfolder: FileItem) => {
        if (subfolder.type === 'folder' && selectedFolder) {
            selectFolder(selectedFolder, subfolder.relativePath);
        }
    };

    const goBack = () => {
        if (!selectedFolder) return;
        
        const pathParts = currentPath.split('/').filter(p => p);
        if (pathParts.length > 0) {
            pathParts.pop();
            const newPath = pathParts.join('/');
            selectFolder(selectedFolder, newPath);
        }
    };

    const handleCreateFolder = async () => {
        if (!selectedFolder) {
            Swal.fire('Error', 'Please select a folder first', 'error');
            return;
        }

        if (selectedFolder.access_level === 'read') {
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
                await api.post(`/files/folder/${selectedFolder.id}/create-folder`, {
                    folderName,
                    subPath: currentPath
                });

                Swal.fire('Success', 'Folder created successfully!', 'success');
                selectFolder(selectedFolder, currentPath);
            } catch (error: any) {
                console.error('Error creating folder:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to create folder', 'error');
            }
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedFolder) {
            Swal.fire('Error', 'Please select a folder first', 'error');
            return;
        }

        if (selectedFolder.access_level === 'read') {
            Swal.fire('Access Denied', 'You only have read access to this folder', 'error');
            return;
        }

        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        formData.append('file', files[0]);
        formData.append('subPath', currentPath);

        try {
            setIsUploading(true);
            setUploadProgress(0);

            await api.post(`/files/folder/${selectedFolder.id}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent: any) => {
                    if (progressEvent.total) {
                        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(progress);
                    }
                }
            });

            Swal.fire('Success', 'File uploaded successfully!', 'success');
            selectFolder(selectedFolder, currentPath);
            
            // Reset file input
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

    const handleDownload = async (file: FileItem) => {
        if (!selectedFolder) return;

        try {
            const response = await api.get(`/files/folder/${selectedFolder.id}/download`, {
                params: { path: file.relativePath },
                responseType: 'blob'
            });

            // Create download link
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
        if (!selectedFolder) return;

        if (selectedFolder.access_level === 'read') {
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
                await api.delete(`/files/folder/${selectedFolder.id}/delete`, {
                    data: { filePath: file.relativePath }
                });

                Swal.fire('Deleted!', 'Item has been deleted.', 'success');
                selectFolder(selectedFolder, currentPath);
            } catch (error: any) {
                console.error('Error deleting:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete item', 'error');
            }
        }
    };

    const handleRename = async (file: FileItem) => {
        if (!selectedFolder) return;

        if (selectedFolder.access_level === 'read') {
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
                await api.put(`/files/folder/${selectedFolder.id}/rename`, {
                    oldPath: file.relativePath,
                    newName
                });

                Swal.fire('Success', 'Renamed successfully!', 'success');
                selectFolder(selectedFolder, currentPath);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="panel">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">
                        Welcome, {user?.name}!
                    </h5>
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <IconLayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setViewMode('list')}
                        >
                            <IconListCheck className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Folder Selection */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {folders.map((folder) => (
                        <button
                            key={folder.id}
                            className={`btn ${selectedFolder?.id === folder.id ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => selectFolder(folder)}
                        >
                            <IconFolder className="w-4 h-4 mr-2" />
                            {folder.name}
                            {folder.access_level === 'read' && (
                                <span className="ml-2 text-xs opacity-70">(Read Only)</span>
                            )}
                        </button>
                    ))}
                    {folders.length === 0 && !loading && (
                        <div className="text-gray-500">No folders assigned to you. Contact admin for access.</div>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            {selectedFolder && (
                <div className="panel">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => selectFolder(selectedFolder, '')}
                            >
                                <IconHome className="w-4 h-4" />
                            </button>
                            {currentPath && (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={goBack}
                                >
                                    ← Back
                                </button>
                            )}
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedFolder.name} / {currentPath || 'Root'}
                            </div>
                        </div>

                        {selectedFolder.access_level !== 'read' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleCreateFolder}
                                >
                                    <IconFolderPlus className="w-4 h-4 mr-2" />
                                    New Folder
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                >
                                    <IconCloudDownload className="w-4 h-4 mr-2" />
                                    {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Files Display */}
            {selectedFolder && (
                <div className="panel">
                    {loading ? (
                        <div className="flex justify-center items-center py-10">
                            <span className="animate-spin border-4 border-primary border-l-transparent rounded-full w-12 h-12 inline-block align-middle"></span>
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <IconFolder className="w-16 h-16 mx-auto mb-3 opacity-30" />
                            <p>This folder is empty</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                                >
                                    <div
                                        onClick={() => file.type === 'folder' ? navigateToSubfolder(file) : null}
                                        className="text-center"
                                    >
                                        {file.type === 'folder' ? (
                                            <IconFolder className="w-16 h-16 mx-auto text-yellow-500 mb-2" />
                                        ) : (
                                            <IconFile className="w-16 h-16 mx-auto text-blue-500 mb-2" />
                                        )}
                                        <div className="text-sm font-medium truncate" title={file.name}>
                                            {file.name}
                                        </div>
                                        {file.type === 'file' && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatFileSize(file.size)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-center gap-1 mt-3">
                                        {file.type === 'file' && (
                                            <button
                                                className="btn btn-sm btn-outline-primary p-1"
                                                onClick={() => handleDownload(file)}
                                                title="Download"
                                            >
                                                <IconDownload className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-sm btn-outline-warning p-1"
                                            onClick={() => handleRename(file)}
                                            title="Rename"
                                        >
                                            <IconEdit className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="btn btn-sm btn-outline-danger p-1"
                                            onClick={() => handleDelete(file)}
                                            title="Delete"
                                        >
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Size</th>
                                        <th>Modified</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {files.map((file, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer hover:text-primary"
                                                    onClick={() => file.type === 'folder' ? navigateToSubfolder(file) : null}
                                                >
                                                    {file.type === 'folder' ? (
                                                        <IconFolder className="w-5 h-5 text-yellow-500" />
                                                    ) : (
                                                        <IconFile className="w-5 h-5 text-blue-500" />
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
                                                            onClick={() => handleDownload(file)}
                                                        >
                                                            <IconDownload className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-outline-warning"
                                                        onClick={() => handleRename(file)}
                                                    >
                                                        <IconEdit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => handleDelete(file)}
                                                    >
                                                        <IconTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {!selectedFolder && folders.length > 0 && (
                <div className="panel text-center py-10">
                    <IconFolder className="w-24 h-24 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Select a folder from above to view its contents</p>
                </div>
            )}
        </div>
    );
};

export default UserDashboard;
