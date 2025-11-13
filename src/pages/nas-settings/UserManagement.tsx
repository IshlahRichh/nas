import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconBell from '../../components/Icon/IconBell';
import IconXCircle from '../../components/Icon/IconXCircle';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconFolderPlus from '../../components/Icon/IconFolderPlus';
import IconUser from '../../components/Icon/IconUser';
import IconDownload from '../../components/Icon/IconDownload';
import IconFile from '../../components/Icon/IconFile';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    folders?: Folder[];
    createdAt: string;
}

interface Folder {
    id: number;
    folder_name: string;
    path: string;
    owner_id: number;
}

interface UserModalData {
    name: string;
    email: string;
    password: string;
    role: string;
}

const UserManagement = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authService.isAdmin()) {
            navigate('/login');
            return;
        }
    }, [navigate]);
    const [users, setUsers] = useState<User[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedFolders, setSelectedFolders] = useState<number[]>([]);
    const [folderPermissions, setFolderPermissions] = useState<{ [key: number]: 'read' | 'write' }>({});
    const [importData, setImportData] = useState<any[]>([]);
    const [importResults, setImportResults] = useState<any>(null);
    const [modalData, setModalData] = useState<UserModalData>({
        name: '',
        email: '',
        password: '',
        role: 'user'
    });

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

    useEffect(() => {
        dispatch(setPageTitle('User Management'));
        fetchUsers();
        fetchFolders();
    }, []);

    const fetchFolders = async () => {
        try {
            const response = await api.get('/folders');
            setFolders(response.data);
        } catch (error: any) {
            console.error('Error fetching folders:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            setLoading(false);
            if (error.response?.status === 401 || error.response?.status === 403) {
                // Clear auth data and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            } else {
                // Show error message to user
                alert('Error loading users. Please try again.');
            }
        }
    };

    const handleAddUser = async () => {
        try {
            // Validasi input
            if (!modalData.name || !modalData.email || !modalData.password) {
                alert('Please fill in all required fields');
                return;
            }

            // Validasi email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(modalData.email)) {
                alert('Please enter a valid email address');
                return;
            }

            // Validasi password minimal 6 karakter
            if (modalData.password.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            await api.post('/users', modalData);
            setShowModal(false);
            setModalData({
                name: '',
                email: '',
                password: '',
                role: 'user'
            });
            fetchUsers();
            alert('User added successfully!');
        } catch (error: any) {
            console.error('Error adding user:', error);
            alert(error.response?.data?.message || 'Error adding user');
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        
        try {
            // Validasi input
            if (!modalData.name || !modalData.email) {
                alert('Name and email are required');
                return;
            }

            // Validasi email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(modalData.email)) {
                alert('Please enter a valid email address');
                return;
            }

            // Validasi password jika diisi
            if (modalData.password && modalData.password.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            // Hanya kirim data yang diubah
            const updateData: any = {
                name: modalData.name,
                email: modalData.email,
                role: modalData.role
            };

            // Hanya tambahkan password jika diisi
            if (modalData.password) {
                updateData.password = modalData.password;
            }

            await api.put(`/users/${selectedUser.id}`, updateData);
            setShowModal(false);
            setSelectedUser(null);
            setModalData({
                name: '',
                email: '',
                password: '',
                role: 'user'
            });
            fetchUsers();
            alert('User updated successfully!');
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert(error.response?.data?.message || 'Error updating user');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        // Cek apakah user mencoba menghapus dirinya sendiri
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            alert('You cannot delete your own account!');
            return;
        }

        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                await api.delete(`/users/${userId}`);
                fetchUsers();
                alert('User deleted successfully!');
            } catch (error: any) {
                console.error('Error deleting user:', error);
                alert(error.response?.data?.message || 'Error deleting user');
            }
        }
    };

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        if (search) {
            const filtered = users.filter((user) => {
                return (
                    user.name.toLowerCase().includes(search.toLowerCase()) ||
                    user.email.toLowerCase().includes(search.toLowerCase()) ||
                    user.role.toLowerCase().includes(search.toLowerCase())
                );
            });
            setUsers(filtered);
        } else {
            fetchUsers();
        }
    }, [search]);

    useEffect(() => {
        if (sortStatus.columnAccessor) {
            const sorted = sortBy(users, sortStatus.columnAccessor);
            setUsers(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        }
    }, [sortStatus]);

    const formatDate = (date: string | number | Date) => {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return day + '/' + month + '/' + dt.getFullYear();
        }
        return '';
    };

    const randomColor = () => {
        const color = ['primary', 'secondary', 'success', 'danger', 'warning', 'info'];
        const random = Math.floor(Math.random() * color.length);
        return color[random];
    };

    const randomStatus = () => {
        const status = ['PAID', 'APPROVED', 'FAILED', 'CANCEL', 'SUCCESS', 'PENDING', 'COMPLETE'];
        const random = Math.floor(Math.random() * status.length);
        return status[random];
    };

    // Download Excel Template
    const downloadTemplate = () => {
        const template = [
            {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                role: 'user'
            },
            {
                name: 'Jane Admin',
                email: 'jane@example.com',
                password: 'admin123',
                role: 'admin'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        
        // Set column widths
        ws['!cols'] = [
            { wch: 20 }, // name
            { wch: 30 }, // email
            { wch: 15 }, // password
            { wch: 10 }  // role
        ];

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(data, 'user_import_template.xlsx');
    };

    // Handle Excel File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const binaryStr = event.target?.result;
                const workbook = XLSX.read(binaryStr, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(sheet);
                
                setImportData(data);
                setShowImportModal(true);
            } catch (error) {
                console.error('Error reading file:', error);
                alert('Error reading Excel file. Please check the format.');
            }
        };
        reader.readAsBinaryString(file);
        
        // Reset input
        e.target.value = '';
    };

    // Import Users from Excel
    const handleImportUsers = async () => {
        try {
            if (importData.length === 0) {
                alert('No data to import');
                return;
            }

            const response = await api.post('/users/bulk-import', { users: importData });
            setImportResults(response.data);
            
            // Refresh user list
            fetchUsers();
            
            alert(`Import completed! Success: ${response.data.summary.success}, Failed: ${response.data.summary.failed}`);
        } catch (error: any) {
            console.error('Error importing users:', error);
            alert(error.response?.data?.message || 'Error importing users');
        }
    };

    // Open Folder Assignment Modal
    const handleManageFolders = async (user: User) => {
        setSelectedUser(user);
        try {
            const response = await api.get(`/users/${user.id}/folders`);
            const userFolders = response.data;
            
            // Set selected folders
            setSelectedFolders(userFolders.map((f: any) => f.id));
            
            // Set permissions with default to 'write' for full control
            const permissions: { [key: number]: 'read' | 'write' } = {};
            userFolders.forEach((folder: any) => {
                permissions[folder.id] = folder.Permission?.access_level || 'write';
            });
            setFolderPermissions(permissions);
            
            setShowFolderModal(true);
        } catch (error: any) {
            console.error('Error fetching user folders:', error);
            setSelectedFolders([]);
            setFolderPermissions({});
            setShowFolderModal(true);
        }
    };

    // Assign Folders to User
    const handleAssignFolders = async () => {
        if (!selectedUser) return;

        try {
            await api.post(`/users/${selectedUser.id}/folders`, {
                folderIds: selectedFolders,
                folderPermissions: folderPermissions
            });
            
            setShowFolderModal(false);
            setSelectedUser(null);
            setSelectedFolders([]);
            setFolderPermissions({});
            fetchUsers();
            alert('Folders assigned successfully!');
        } catch (error: any) {
            console.error('Error assigning folders:', error);
            alert(error.response?.data?.message || 'Error assigning folders');
        }
    };

    // Toggle Folder Selection
    const toggleFolderSelection = (folderId: number) => {
        setSelectedFolders(prev => {
            if (prev.includes(folderId)) {
                // Remove folder and its permission
                const newPermissions = { ...folderPermissions };
                delete newPermissions[folderId];
                setFolderPermissions(newPermissions);
                return prev.filter(id => id !== folderId);
            } else {
                // Add folder with default 'write' permission for full control
                setFolderPermissions(prev => ({ ...prev, [folderId]: 'write' }));
                return [...prev, folderId];
            }
        });
    };

    // Change folder permission
    const changeFolderPermission = (folderId: number, permission: 'read' | 'write') => {
        setFolderPermissions(prev => ({ ...prev, [folderId]: permission }));
    };

    return (
        <div>
            {/* Folder Assignment Modal */}
            {showFolderModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl p-6 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">
                            Assign Folders to {selectedUser.name}
                        </h2>
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                                <strong>Access Levels:</strong><br />
                                📖 <strong>Read Only</strong>: View and download files only<br />
                                ✏️ <strong>Full Control</strong>: Create, upload, rename, and delete files/folders
                            </p>
                        </div>
                        <div className="space-y-3 mb-6">
                            {folders.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No folders available</p>
                            ) : (
                                folders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className="flex items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedFolders.includes(folder.id)}
                                            onChange={() => toggleFolderSelection(folder.id)}
                                            className="form-checkbox mr-3"
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold dark:text-white">{folder.folder_name}</div>
                                            <div className="text-sm text-gray-500">{folder.path}</div>
                                        </div>
                                        {selectedFolders.includes(folder.id) && (
                                            <select
                                                value={folderPermissions[folder.id] || 'write'}
                                                onChange={(e) => changeFolderPermission(folder.id, e.target.value as 'read' | 'write')}
                                                className="form-select w-auto ml-3"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="read">📖 Read Only</option>
                                                <option value="write">✏️ Full Control</option>
                                            </select>
                                        )}
                                        <IconFolderPlus className="w-5 h-5 text-primary ml-2" />
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Selected: {selectedFolders.length} folder(s) | 
                                Full Control: {Object.values(folderPermissions).filter(p => p === 'write').length} | 
                                Read Only: {Object.values(folderPermissions).filter(p => p === 'read').length}
                            </span>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                    setShowFolderModal(false);
                                    setSelectedUser(null);
                                    setSelectedFolders([]);
                                    setFolderPermissions({});
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleAssignFolders}
                            >
                                Assign Folders
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl p-6 max-h-[80vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">
                            Import Users from Excel
                        </h2>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Preview: {importData.length} user(s) found in file
                            </p>
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full border">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-700">
                                            <th className="border px-4 py-2">Name</th>
                                            <th className="border px-4 py-2">Email</th>
                                            <th className="border px-4 py-2">Role</th>
                                            <th className="border px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importData.slice(0, 10).map((user: any, index) => (
                                            <tr key={index}>
                                                <td className="border px-4 py-2">{user.name || '-'}</td>
                                                <td className="border px-4 py-2">{user.email || '-'}</td>
                                                <td className="border px-4 py-2">{user.role || 'user'}</td>
                                                <td className="border px-4 py-2">
                                                    {!user.name || !user.email || !user.password ? (
                                                        <span className="text-red-500">❌ Invalid</span>
                                                    ) : (
                                                        <span className="text-green-500">✓ Valid</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {importData.length > 10 && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Showing 10 of {importData.length} users...
                                    </p>
                                )}
                            </div>
                        </div>
                        {importResults && (
                            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                                <h3 className="font-bold mb-2">Import Results:</h3>
                                <p className="text-sm">✓ Success: {importResults.summary.success}</p>
                                <p className="text-sm">❌ Failed: {importResults.summary.failed}</p>
                                {importResults.results.failed.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm font-semibold">
                                            Show Failed Records
                                        </summary>
                                        <ul className="mt-2 text-sm">
                                            {importResults.results.failed.map((fail: any, idx: number) => (
                                                <li key={idx} className="text-red-600">
                                                    {fail.email}: {fail.reason}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        )}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                    setShowImportModal(false);
                                    setImportData([]);
                                    setImportResults(null);
                                }}
                            >
                                Close
                            </button>
                            {!importResults && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleImportUsers}
                                >
                                    Import Users
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">
                            {modalMode === 'add' ? 'Add New User' : 'Edit User'}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    className="form-input mt-1 block w-full"
                                    placeholder="Enter user name"
                                    value={modalData.name}
                                    onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input mt-1 block w-full"
                                    placeholder="user@example.com"
                                    value={modalData.email}
                                    onChange={(e) => setModalData({ ...modalData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {modalMode === 'add' ? (
                                        <>Password <span className="text-red-500">*</span></>
                                    ) : (
                                        'New Password (leave empty to keep current)'
                                    )}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-input mt-1 block w-full"
                                    placeholder={modalMode === 'add' ? 'Minimum 6 characters' : 'Enter new password'}
                                    value={modalData.password}
                                    onChange={(e) => setModalData({ ...modalData, password: e.target.value })}
                                    required={modalMode === 'add'}
                                />
                                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="role"
                                    className="form-select mt-1 block w-full"
                                    value={modalData.role}
                                    onChange={(e) => setModalData({ ...modalData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Admin: Full access | User: Limited access
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedUser(null);
                                    setModalData({
                                        name: '',
                                        email: '',
                                        password: '',
                                        role: 'user'
                                    });
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={modalMode === 'add' ? handleAddUser : handleEditUser}
                            >
                                {modalMode === 'add' ? 'Add User' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="panel flex items-center overflow-x-auto whitespace-nowrap p-3 text-primary">
                <div className="rounded-full bg-primary p-1.5 text-white ring-2 ring-primary/30 ltr:mr-3 rtl:ml-3">
                    <IconBell />
                </div>
                <span className="ltr:mr-3 rtl:ml-3">User Management</span>
            </div>

            <div className="panel mt-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{users.length}</div>
                                <div className="text-sm">Total Users</div>
                            </div>
                            <IconUser className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-r from-red-500 to-red-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">
                                    {users.filter(u => u.role === 'admin').length}
                                </div>
                                <div className="text-sm">Admin Users</div>
                            </div>
                            <IconUser className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">
                                    {users.filter(u => u.role === 'user').length}
                                </div>
                                <div className="text-sm">Regular Users</div>
                            </div>
                            <IconUser className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">User Management</h5>
                    <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="btn btn-outline-success"
                        >
                            <IconDownload className="w-4 h-4 mr-2" />
                            Download Template
                        </button>
                        <label className="btn btn-outline-info cursor-pointer">
                            <IconFile className="w-4 h-4 mr-2" />
                            Import Excel
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setModalMode('add');
                                setShowModal(true);
                            }}
                            className="btn btn-primary"
                        >
                            Add New User
                        </button>
                        <input
                            type="text"
                            className="form-input w-auto"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="datatables">
                    <DataTable
                        className="whitespace-nowrap table-hover"
                        records={users}
                        columns={[
                            {
                                accessor: 'name',
                                title: 'Name',
                                sortable: true,
                                render: ({ name, id }) => (
                                    <div className="flex items-center w-max">
                                        <img
                                            className="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                                            src={`/assets/images/profile-${id}.jpeg`}
                                            alt=""
                                            onError={(e) => {
                                                e.currentTarget.src = '/assets/images/profile-default.jpeg';
                                            }}
                                        />
                                        <div>{name}</div>
                                    </div>
                                ),
                            },
                            { accessor: 'email', title: 'Email', sortable: true },
                            {
                                accessor: 'role',
                                title: 'Role',
                                sortable: true,
                                render: ({ role }) => (
                                    <span className={`badge ${role === 'admin' ? 'bg-danger' : 'bg-success'}`}>
                                        {role.toUpperCase()}
                                    </span>
                                ),
                            },
                            {
                                accessor: 'folders',
                                title: 'Folders',
                                render: ({ folders }) => (
                                    <div className="flex flex-wrap gap-2">
                                        {folders?.map((folder) => (
                                            <span key={folder.id} className="badge bg-info">
                                                {folder.folder_name}
                                            </span>
                                        )) || 'No folders'}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'createdAt',
                                title: 'Created Date',
                                sortable: true,
                                render: ({ createdAt }) => <div>{formatDate(createdAt)}</div>,
                            },
                            {
                                accessor: 'action',
                                title: 'Action',
                                titleClassName: '!text-center',
                                render: (record) => (
                                    <div className="flex items-center w-max mx-auto gap-2">
                                        <Tippy content="Edit User">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedUser(record);
                                                    setModalData({
                                                        name: record.name,
                                                        email: record.email,
                                                        password: '',
                                                        role: record.role
                                                    });
                                                    setModalMode('edit');
                                                    setShowModal(true);
                                                }}
                                                className="hover:text-primary"
                                            >
                                                <IconPencil className="text-primary" />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Delete User">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(record.id)}
                                                className="hover:text-danger"
                                                disabled={authService.getCurrentUser()?.id === record.id}
                                            >
                                                <IconTrashLines 
                                                    className={
                                                        authService.getCurrentUser()?.id === record.id 
                                                        ? "text-gray-400" 
                                                        : "text-danger"
                                                    } 
                                                />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Manage Folders">
                                            <button 
                                                type="button" 
                                                className="hover:text-success"
                                                onClick={() => handleManageFolders(record)}
                                            >
                                                <IconFolderPlus className="text-success" />
                                            </button>
                                        </Tippy>
                                    </div>
                                ),
                            },
                        ]}
                        totalRecords={users.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        minHeight={200}
                        paginationText={({ from, to, totalRecords }) => `Showing  ${from} to ${to} of ${totalRecords} entries`}
                    />
                </div>
            </div>
        </div>
    );
};

export default UserManagement;