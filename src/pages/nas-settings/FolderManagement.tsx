import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconBell from '../../components/Icon/IconBell';
import IconPencil from '../../components/Icon/IconPencil';
import IconTrashLines from '../../components/Icon/IconTrashLines';
import IconFolderPlus from '../../components/Icon/IconFolderPlus';
import IconFolder from '../../components/Icon/IconFolder';
import { api } from '../../services/api';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';

interface Folder {
    id: number;
    folder_name: string;
    path: string;
    owner_id: number;
    owner?: {
        name: string;
        email: string;
    };
    createdAt: string;
}

interface FolderModalData {
    folder_name: string;
    path: string;
    owner_id: number;
}

interface RaidConfig {
    id: number;
    raid_name: string;
    mount_point: string;
    is_mounted: boolean;
}

const FolderManagement = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authService.isAdmin()) {
            navigate('/login');
            return;
        }
    }, [navigate]);

    const [folders, setFolders] = useState<Folder[]>([]);
    const [raidConfigs, setRaidConfigs] = useState<RaidConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [basePath, setBasePath] = useState('');
    const [modalData, setModalData] = useState<FolderModalData>({
        folder_name: '',
        path: '',
        owner_id: 0
    });

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'folder_name',
        direction: 'asc',
    });

    useEffect(() => {
        dispatch(setPageTitle('Folder Management'));
        fetchFolders();
        fetchRaidConfigs();
    }, []);

    const fetchFolders = async () => {
        try {
            const response = await api.get('/folders');
            setFolders(response.data);
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching folders:', error);
            setLoading(false);
        }
    };

    const fetchRaidConfigs = async () => {
        try {
            const response = await api.get('/raid/status');
            // Filter only mounted RAID arrays with valid mount points
            const mountedRaids = response.data.configurations.filter(
                (raid: RaidConfig) => raid.is_mounted && raid.mount_point
            );
            setRaidConfigs(mountedRaids);
        } catch (error: any) {
            console.error('Error fetching RAID configs:', error);
        }
    };

    const handleAddFolder = async () => {
        try {
            if (!modalData.folder_name) {
                alert('Please enter folder name');
                return;
            }

            if (!basePath) {
                alert('Please select RAID path');
                return;
            }

            // Auto-combine base path with folder name
            const fullPath = `${basePath}/${modalData.folder_name}`;

            await api.post('/folders', {
                folder_name: modalData.folder_name,
                path: fullPath,
                owner_id: modalData.owner_id
            });

            setShowModal(false);
            setBasePath('');
            setModalData({
                folder_name: '',
                path: '',
                owner_id: 0
            });
            fetchFolders();
            alert('Folder added successfully!');
        } catch (error: any) {
            console.error('Error adding folder:', error);
            alert(error.response?.data?.message || 'Error adding folder');
        }
    };

    const handleEditFolder = async () => {
        if (!selectedFolder) return;
        
        try {
            if (!modalData.folder_name || !modalData.path) {
                alert('Folder name and path are required');
                return;
            }

            await api.put(`/folders/${selectedFolder.id}`, modalData);
            setShowModal(false);
            setSelectedFolder(null);
            fetchFolders();
            alert('Folder updated successfully!');
        } catch (error: any) {
            console.error('Error updating folder:', error);
            alert(error.response?.data?.message || 'Error updating folder');
        }
    };

    const handleDeleteFolder = async (folderId: number) => {
        if (window.confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
            try {
                await api.delete(`/folders/${folderId}`);
                fetchFolders();
                alert('Folder deleted successfully!');
            } catch (error: any) {
                console.error('Error deleting folder:', error);
                alert(error.response?.data?.message || 'Error deleting folder');
            }
        }
    };

    const formatDate = (date: string | number | Date) => {
        if (date) {
            const dt = new Date(date);
            const month = dt.getMonth() + 1 < 10 ? '0' + (dt.getMonth() + 1) : dt.getMonth() + 1;
            const day = dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate();
            return day + '/' + month + '/' + dt.getFullYear();
        }
        return '';
    };

    return (
        <div>
            {/* Folder Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 dark:text-white">
                            {modalMode === 'add' ? 'Add New Folder' : 'Edit Folder'}
                        </h2>
                        <div className="space-y-4">
                            {modalMode === 'add' ? (
                                <>
                                    <div>
                                        <label htmlFor="raid_path" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Select RAID Path <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="raid_path"
                                            className="form-select mt-1 block w-full"
                                            value={basePath}
                                            onChange={(e) => setBasePath(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Select RAID Mount Point --</option>
                                            {raidConfigs.map((raid) => (
                                                <option key={raid.id} value={raid.mount_point}>
                                                    {raid.raid_name} ({raid.mount_point})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="folder_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Folder Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="folder_name"
                                            className="form-input mt-1 block w-full"
                                            placeholder="e.g., devisi-1, IT, Finance"
                                            value={modalData.folder_name}
                                            onChange={(e) => setModalData({ ...modalData, folder_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    {basePath && modalData.folder_name && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                Full Path (will be created):
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <IconFolder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                <code className="text-sm font-mono text-blue-800 dark:text-blue-300">
                                                    {basePath}/{modalData.folder_name}
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="folder_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Folder Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="folder_name"
                                            className="form-input mt-1 block w-full"
                                            placeholder="Enter folder name"
                                            value={modalData.folder_name}
                                            onChange={(e) => setModalData({ ...modalData, folder_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="path" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Path <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="path"
                                            className="form-input mt-1 block w-full"
                                            placeholder="/path/to/folder or /mnt/raid1/subfolder"
                                            value={modalData.path}
                                            onChange={(e) => setModalData({ ...modalData, path: e.target.value })}
                                            required
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedFolder(null);
                                    setBasePath('');
                                    setModalData({
                                        folder_name: '',
                                        path: '',
                                        owner_id: 0
                                    });
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={modalMode === 'add' ? handleAddFolder : handleEditFolder}
                            >
                                {modalMode === 'add' ? 'Add Folder' : 'Save Changes'}
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
                <span className="ltr:mr-3 rtl:ml-3">Folder Management</span>
            </div>

            <div className="panel mt-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{folders.length}</div>
                                <div className="text-sm">Total Folders</div>
                            </div>
                            <IconFolderPlus className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">0 GB</div>
                                <div className="text-sm">Total Size</div>
                            </div>
                            <IconFolder className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                    <div className="panel bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">0</div>
                                <div className="text-sm">Shared Folders</div>
                            </div>
                            <IconFolderPlus className="w-12 h-12 opacity-50" />
                        </div>
                    </div>
                </div>

                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Folder Management</h5>
                    <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setModalMode('add');
                                setShowModal(true);
                            }}
                            className="btn btn-primary"
                        >
                            Add New Folder
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
                        records={folders}
                        columns={[
                            {
                                accessor: 'folder_name',
                                title: 'Folder Name',
                                sortable: true,
                                render: ({ folder_name }) => (
                                    <div className="flex items-center w-max">
                                        <IconFolderPlus className="w-5 h-5 ltr:mr-2 rtl:ml-2 text-primary" />
                                        <div>{folder_name}</div>
                                    </div>
                                ),
                            },
                            { accessor: 'path', title: 'Path', sortable: true },
                            {
                                accessor: 'owner',
                                title: 'Owner',
                                render: ({ owner }) => <div>{owner?.name || 'N/A'}</div>,
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
                                        <Tippy content="Edit Folder">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFolder(record);
                                                    setModalData({
                                                        folder_name: record.folder_name,
                                                        path: record.path,
                                                        owner_id: record.owner_id
                                                    });
                                                    setModalMode('edit');
                                                    setShowModal(true);
                                                }}
                                                className="hover:text-primary"
                                            >
                                                <IconPencil className="text-primary" />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Delete Folder">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteFolder(record.id)}
                                                className="hover:text-danger"
                                            >
                                                <IconTrashLines className="text-danger" />
                                            </button>
                                        </Tippy>
                                    </div>
                                ),
                            },
                        ]}
                        totalRecords={folders.length}
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

export default FolderManagement;
