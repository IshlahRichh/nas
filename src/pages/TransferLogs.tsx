import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../store/themeConfigSlice';
import IconDownload from '../components/Icon/IconDownload';
import IconCloudDownload from '../components/Icon/IconCloudDownload';
import IconEye from '../components/Icon/IconEye';
import IconRefresh from '../components/Icon/IconRefresh';
import IconServer from '../components/Icon/IconServer';
import IconTrendingUp from '../components/Icon/IconTrendingUp';
import IconTrash from '../components/Icon/IconTrash';
import { api } from '../services/api';
import { authService } from '../services/authService';
import Swal from 'sweetalert2';

interface TransferLog {
    id: number;
    transfer_type: 'upload' | 'download';
    file_name: string;
    file_size: number;
    duration: number;
    throughput: number;
    status: 'success' | 'failed' | 'partial';
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
    folder: {
        folder_name: string;
    };
    session_id?: string;
    bytes_transferred: number;
    retries: number;
}

interface Statistics {
    total_transfers: number;
    uploads: number;
    downloads: number;
    successful: number;
    failed: number;
    total_size: number;
    total_duration: number;
    avg_throughput: number;
    max_throughput: number;
    min_throughput: number;
    packet_loss_rate: number;
    total_retries: number;
    success_rate: number;
}

const TransferLogs = () => {
    const dispatch = useDispatch();
    const isAdmin = authService.isAdmin();

    const [logs, setLogs] = useState<TransferLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);
    
    // Filters
    const [filterType, setFilterType] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    useEffect(() => {
        dispatch(setPageTitle('Transfer Logs'));
        fetchLogs();
        fetchStatistics();
    }, [page, pageSize, filterType, filterStatus, dateRange]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params: any = {
                page,
                limit: pageSize
            };

            if (filterType) params.transfer_type = filterType;
            if (filterStatus) params.status = filterStatus;
            if (dateRange.start) params.start_date = dateRange.start;
            if (dateRange.end) params.end_date = dateRange.end;

            const endpoint = isAdmin ? '/transfer-logs/all' : '/transfer-logs/my-logs';
            const response = await api.get(endpoint, { params });

            setLogs(response.data.logs);
            setTotalRecords(response.data.pagination.total);
        } catch (error: any) {
            console.error('Error fetching logs:', error);
            Swal.fire('Error', 'Failed to load transfer logs', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const params: any = {};
            if (dateRange.start) params.start_date = dateRange.start;
            if (dateRange.end) params.end_date = dateRange.end;

            const response = await api.get('/transfer-logs/statistics', { params });
            setStatistics(response.data);
        } catch (error: any) {
            console.error('Error fetching statistics:', error);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        const seconds = ms / 1000;
        if (seconds < 60) return `${seconds.toFixed(2)}s`;
        const minutes = seconds / 60;
        return `${minutes.toFixed(2)}min`;
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString();
    };

    const getStatusBadge = (status: string) => {
        const colors: any = {
            success: 'success',
            failed: 'danger',
            partial: 'warning'
        };
        return (
            <span className={`badge bg-${colors[status] || 'secondary'} shadow-md`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const getTypeBadge = (type: string) => {
        return type === 'upload' ? (
            <span className="badge bg-primary shadow-md">
                <IconCloudDownload className="w-3 h-3 inline mr-1" />
                Upload
            </span>
        ) : (
            <span className="badge bg-info shadow-md">
                <IconDownload className="w-3 h-3 inline mr-1" />
                Download
            </span>
        );
    };

    const viewSessionDetails = async (sessionId: string) => {
        try {
            const response = await api.get(`/transfer-logs/session/${sessionId}`);
            const session = response.data;

            Swal.fire({
                title: 'Session Details',
                html: `
                    <div class="text-left">
                        <p><strong>User:</strong> ${session.user.name}</p>
                        <p><strong>Folder:</strong> ${session.folder.folder_name}</p>
                        <p><strong>Total Files:</strong> ${session.total_files}</p>
                        <p><strong>Total Size:</strong> ${formatFileSize(session.total_size)}</p>
                        <p><strong>Total Duration:</strong> ${formatDuration(session.total_duration)}</p>
                        <p><strong>Avg Throughput:</strong> ${session.avg_throughput.toFixed(2)} MB/s</p>
                        <p><strong>Packet Loss:</strong> ${session.packet_loss_rate.toFixed(4)}%</p>
                        <p><strong>Success Rate:</strong> ${((session.successful_files / session.total_files) * 100).toFixed(2)}%</p>
                    </div>
                `,
                width: 600,
                confirmButtonText: 'Close'
            });
        } catch (error: any) {
            console.error('Error fetching session:', error);
            Swal.fire('Error', 'Failed to load session details', 'error');
        }
    };

    const handleDeleteLog = async (id: number) => {
        const result = await Swal.fire({
            title: 'Delete Transfer Log?',
            text: "This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/transfer-logs/${id}`);
                Swal.fire('Deleted!', 'Transfer log has been deleted.', 'success');
                fetchLogs();
                fetchStatistics();
            } catch (error: any) {
                console.error('Error deleting log:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete log', 'error');
            }
        }
    };

    const handleDeleteOldLogs = async () => {
        const { value: days } = await Swal.fire({
            title: 'Delete Old Logs',
            input: 'number',
            inputLabel: 'Delete logs older than (days)',
            inputValue: 30,
            inputPlaceholder: 'Enter number of days',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || parseInt(value) < 1) {
                    return 'Please enter a valid number!';
                }
            }
        });

        if (days) {
            const confirm = await Swal.fire({
                title: 'Are you sure?',
                text: `This will delete all logs older than ${days} days!`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                confirmButtonText: 'Yes, delete them!'
            });

            if (confirm.isConfirmed) {
                try {
                    const response = await api.delete('/transfer-logs/cleanup', {
                        data: { days: parseInt(days) }
                    });
                    Swal.fire('Deleted!', response.data.message, 'success');
                    fetchLogs();
                    fetchStatistics();
                } catch (error: any) {
                    console.error('Error deleting old logs:', error);
                    Swal.fire('Error', error.response?.data?.message || 'Failed to delete logs', 'error');
                }
            }
        }
    };

    const handleDeleteAllLogs = async () => {
        const result = await Swal.fire({
            title: 'Delete ALL Logs?',
            text: "This will permanently delete ALL transfer logs! This action cannot be undone!",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete everything!',
            cancelButtonText: 'Cancel',
            input: 'text',
            inputPlaceholder: 'Type "DELETE ALL" to confirm',
            inputValidator: (value) => {
                if (value !== 'DELETE ALL') {
                    return 'You must type "DELETE ALL" to confirm!';
                }
            }
        });

        if (result.isConfirmed) {
            try {
                const response = await api.delete('/transfer-logs/all');
                Swal.fire('Deleted!', response.data.message, 'success');
                fetchLogs();
                fetchStatistics();
            } catch (error: any) {
                console.error('Error deleting all logs:', error);
                Swal.fire('Error', error.response?.data?.message || 'Failed to delete logs', 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Statistics Cards */}
            {statistics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{statistics.total_transfers}</div>
                                <div className="text-sm">Total Transfers</div>
                            </div>
                            <IconServer className="w-12 h-12 opacity-50" />
                        </div>
                    </div>

                    <div className="panel bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{statistics.avg_throughput.toFixed(2)} MB/s</div>
                                <div className="text-sm">Avg Throughput</div>
                            </div>
                            <IconTrendingUp className="w-12 h-12 opacity-50" />
                        </div>
                    </div>

                    <div className="panel bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{formatFileSize(statistics.total_size)}</div>
                                <div className="text-sm">Total Data</div>
                            </div>
                            <IconDownload className="w-12 h-12 opacity-50" />
                        </div>
                    </div>

                    <div className="panel bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-xl font-bold">{statistics.success_rate.toFixed(1)}%</div>
                                <div className="text-sm">Success Rate</div>
                            </div>
                            <div className="text-4xl">✓</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Statistics */}
            {statistics && (
                <div className="panel">
                    <h5 className="font-semibold text-lg mb-4">Detailed Analysis</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-primary">{statistics.uploads}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Uploads</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-info">{statistics.downloads}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Downloads</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-success">{statistics.successful}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Successful</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-danger">{statistics.failed}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatDuration(statistics.total_duration)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Duration</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-warning">{statistics.max_throughput.toFixed(2)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Max Throughput (MB/s)</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-secondary">{statistics.min_throughput.toFixed(2)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Min Throughput (MB/s)</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-danger">{statistics.packet_loss_rate.toFixed(4)}%</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Packet Loss Rate</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
                            <div className="text-2xl font-bold text-warning">{statistics.total_retries}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Retries</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="panel">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                            className="form-select"
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All</option>
                            <option value="upload">Upload</option>
                            <option value="download">Download</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            className="form-select"
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All</option>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                            <option value="partial">Partial</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Start Date</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={dateRange.start}
                            onChange={(e) => {
                                setDateRange({ ...dateRange, start: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">End Date</label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={dateRange.end}
                            onChange={(e) => {
                                setDateRange({ ...dateRange, end: e.target.value });
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                fetchLogs();
                                fetchStatistics();
                            }}
                        >
                            <IconRefresh className="w-4 h-4 mr-2" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Transfer Logs Table */}
            <div className="panel datatables">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="font-semibold text-lg">Transfer History</h5>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={fetchLogs}
                            title="Refresh"
                        >
                            <IconRefresh className="w-4 h-4 mr-1" />
                            Refresh
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={handleDeleteOldLogs}
                            title="Delete Old Logs"
                        >
                            <IconTrash className="w-4 h-4 mr-1" />
                            Cleanup Old
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={handleDeleteAllLogs}
                            title="Delete All Logs"
                        >
                            <IconTrash className="w-4 h-4 mr-1" />
                            Delete All
                        </button>
                    </div>
                </div>
                <DataTable
                    className="whitespace-nowrap table-hover [&_table]:dark:bg-gray-800 [&_thead]:dark:bg-gray-700 [&_tbody_tr]:dark:hover:bg-gray-700 [&_thead_th]:dark:text-white [&_tbody_td]:dark:border-gray-700"
                    records={logs}
                    columns={[
                        {
                            accessor: 'type',
                            title: 'Type',
                            render: (log) => getTypeBadge(log.transfer_type)
                        },
                        {
                            accessor: 'file_name',
                            title: 'File Name',
                            render: (log) => (
                                <div className="max-w-xs truncate dark:text-white" title={log.file_name}>
                                    {log.file_name}
                                </div>
                            )
                        },
                        {
                            accessor: 'file_size',
                            title: 'Size',
                            render: (log) => <span className="dark:text-white">{formatFileSize(log.file_size)}</span>
                        },
                        {
                            accessor: 'duration',
                            title: 'Duration',
                            render: (log) => <span className="dark:text-white">{formatDuration(log.duration)}</span>
                        },
                        {
                            accessor: 'throughput',
                            title: 'Throughput',
                            render: (log) => (
                                <span className={`font-medium ${log.throughput > 10 ? 'text-success' : log.throughput > 5 ? 'text-warning' : 'text-danger'}`}>
                                    {log.throughput.toFixed(2)} MB/s
                                </span>
                            )
                        },
                        {
                            accessor: 'status',
                            title: 'Status',
                            render: (log) => getStatusBadge(log.status)
                        },
                        ...(isAdmin ? [{
                            accessor: 'user',
                            title: 'User',
                            render: (log: TransferLog) => <span className="dark:text-white">{log.user?.name || 'N/A'}</span>
                        }] : []),
                        {
                            accessor: 'folder',
                            title: 'Folder',
                            render: (log) => <span className="dark:text-white">{log.folder?.folder_name || 'N/A'}</span>
                        },
                        {
                            accessor: 'createdAt',
                            title: 'Date',
                            render: (log) => <span className="dark:text-white">{formatDate(log.createdAt)}</span>
                        },
                        {
                            accessor: 'action',
                            title: 'Action',
                            render: (log) => (
                                <div className="flex gap-2">
                                    {log.session_id && (
                                        <button
                                            className="btn btn-sm btn-outline-primary"
                                            onClick={() => viewSessionDetails(log.session_id!)}
                                            title="View Session"
                                        >
                                            <IconEye className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteLog(log.id)}
                                        title="Delete Log"
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    totalRecords={totalRecords}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={[25, 50, 100, 200]}
                    onRecordsPerPageChange={setPageSize}
                    minHeight={200}
                    paginationText={({ from, to, totalRecords }) => 
                        <span className="dark:text-white-dark">{`Showing ${from} to ${to} of ${totalRecords} entries`}</span>
                    }
                    fetching={loading}
                />
            </div>
        </div>
    );
};

export default TransferLogs;
