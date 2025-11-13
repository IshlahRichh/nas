import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import sortBy from 'lodash/sortBy';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconBell from '../../../components/Icon/IconBell';
import IconXCircle from '../../../components/Icon/IconXCircle';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconFolderPlus from '../../../components/Icon/IconFolderPlus';
import { api } from '../../../services/api';
import { authService } from '../../../services/authService';
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
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
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
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleAddUser = async () => {
        try {
            await api.post('/users', modalData);
            setShowModal(false);
            setModalData({
                name: '',
                email: '',
                password: '',
                role: 'user'
            });
            fetchUsers();
        } catch (error) {
            console.error('Error adding user:', error);
            alert(error.response?.data?.message || 'Error adding user');
        }
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        try {
            await api.put(`/users/${selectedUser.id}`, modalData);
            setShowModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert(error.response?.data?.message || 'Error updating user');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${userId}`);
                fetchUsers();
            } catch (error) {
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

    return (
        <div>
            {/* User Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{modalMode === 'add' ? 'Add New User' : 'Edit User'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    className="form-input mt-1 block w-full"
                                    value={modalData.name}
                                    onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input mt-1 block w-full"
                                    value={modalData.email}
                                    onChange={(e) => setModalData({ ...modalData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    {modalMode === 'add' ? 'Password' : 'New Password (leave empty to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-input mt-1 block w-full"
                                    value={modalData.password}
                                    onChange={(e) => setModalData({ ...modalData, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    id="role"
                                    className="form-select mt-1 block w-full"
                                    value={modalData.role}
                                    onChange={(e) => setModalData({ ...modalData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
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
                <div className="flex md:items-center md:flex-row flex-col mb-5 gap-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">User Management</h5>
                    <div className="ltr:ml-auto rtl:mr-auto flex items-center gap-2">
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
                                            >
                                                <IconPencil className="text-primary" />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Delete User">
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteUser(record.id)}
                                            >
                                                <IconTrashLines className="text-danger" />
                                            </button>
                                        </Tippy>
                                        <Tippy content="Manage Folders">
                                            <button type="button">
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
                        loading={loading}
                        paginationText={({ from, to, totalRecords }) => `Showing  ${from} to ${to} of ${totalRecords} entries`}
                    />
                </div>
            </div>
        </div>
    );
};

export default UserManagement;