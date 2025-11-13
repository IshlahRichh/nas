import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import { api } from '../../services/api';
import IconServer from '../../components/Icon/IconServer';
import IconTrash from '../../components/Icon/IconTrash';
import IconPlus from '../../components/Icon/IconPlus';
import IconRefresh from '../../components/Icon/IconRefresh';
import IconX from '../../components/Icon/IconX';
import IconChecks from '../../components/Icon/IconChecks';
import AdminGuard from '../../components/AdminGuard';
import Swal from 'sweetalert2';

const RaidConfiguration = () => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [availableDisks, setAvailableDisks] = useState<any[]>([]);
    const [raidConfigurations, setRaidConfigurations] = useState<any[]>([]);
    const [mdadmInstalled, setMdadmInstalled] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedDisks, setSelectedDisks] = useState<string[]>([]);
    const [raidType, setRaidType] = useState('RAID1');
    const [raidName, setRaidName] = useState('');
    const [mountPoint, setMountPoint] = useState('');
    const [simulateMode, setSimulateMode] = useState(true);
    const [wipePartitions, setWipePartitions] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('RAID Configuration'));
        checkMdadm();
        loadDisks();
        loadRaidStatus();
    }, []);

    const checkMdadm = async () => {
        try {
            const response = await api.get('/raid/check-mdadm');
            setMdadmInstalled(response.data.installed);
            if (!response.data.installed) {
                Swal.fire({
                    icon: 'warning',
                    title: 'mdadm Not Installed',
                    text: response.data.message,
                    confirmButtonText: 'OK',
                    customClass: {
                        icon: 'swal2-icon-large'
                    }
                });
            }
        } catch (error) {
            console.error('Error checking mdadm:', error);
        }
    };

    const loadDisks = async () => {
        try {
            setLoading(true);
            const response = await api.get('/raid/disks');
            setAvailableDisks(response.data.disks);
        } catch (error: any) {
            console.error('Error loading disks:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to load available disks',
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const loadRaidStatus = async () => {
        try {
            const response = await api.get('/raid/status');
            setRaidConfigurations(response.data.configurations);
        } catch (error: any) {
            console.error('Error loading RAID status:', error);
        }
    };

    const handleDiskSelection = (diskPath: string) => {
        setSelectedDisks(prev => {
            if (prev.includes(diskPath)) {
                return prev.filter(d => d !== diskPath);
            } else {
                return [...prev, diskPath];
            }
        });
    };

    const handleCreateRaid = async () => {
        if (selectedDisks.length < 2) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Selection',
                text: 'Please select at least 2 disks for RAID configuration',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });
            return;
        }

        if (!raidName.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Input',
                text: 'Please enter a RAID name',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });
            return;
        }

        const confirmResult = await Swal.fire({
            icon: 'warning',
            title: 'Create RAID Array?',
            html: `
                <div class="text-left">
                    <p><strong>Configuration:</strong></p>
                    <ul>
                        <li>Name: ${raidName}</li>
                        <li>Type: ${raidType}</li>
                        <li>Disks: ${selectedDisks.join(', ')}</li>
                        <li>Wipe Partitions: ${wipePartitions ? 'YES - Will remove all existing partitions' : 'NO - Keep existing partitions'}</li>
                        <li>Mode: ${simulateMode ? 'SIMULATION (Safe)' : 'REAL EXECUTION (DANGEROUS!)'}</li>
                    </ul>
                    ${!simulateMode && wipePartitions ? '<p class="text-danger mt-3"><strong>⚠️ WARNING: This will WIPE partitions and ERASE all data on selected disks!</strong></p>' : ''}
                    ${!simulateMode && !wipePartitions ? '<p class="text-warning mt-3"><strong>⚠️ NOTE: Existing partitions will be used. This may fail if partitions contain data.</strong></p>' : ''}
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: simulateMode ? 'Create (Simulate)' : 'Create (Execute)',
            cancelButtonText: 'Cancel',
            confirmButtonColor: simulateMode ? '#3b82f6' : '#ef4444',
            customClass: {
                icon: 'swal2-icon-large'
            }
        });

        if (!confirmResult.isConfirmed) return;

        try {
            setLoading(true);
            const response = await api.post('/raid/create', {
                raid_name: raidName,
                raid_type: raidType,
                disks: selectedDisks,
                mount_point: mountPoint || undefined,
                simulate: simulateMode,
                wipe_partitions: wipePartitions
            });

            // If simulation mode, behave as before
            if (response.data.simulated) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: response.data.message,
                    confirmButtonColor: '#00ab55',
                    customClass: { icon: 'swal2-icon-large' }
                });

                setShowCreateModal(false);
                resetForm();
                loadRaidStatus();
                loadDisks();
                return;
            }

            // For real execution we start background work on the server and show a progress modal
            setShowCreateModal(false);
            resetForm();
            loadRaidStatus();
            loadDisks();

            let pollInterval: any = null;
            Swal.fire({
                title: 'Creating RAID — Progress',
                html: `<div style="text-align:left"><pre id="raid-progress">Starting...\n</pre></div>`,
                showConfirmButton: false,
                allowOutsideClick: false,
                didOpen: () => {
                    const update = async () => {
                        try {
                            const p = await api.get('/raid/progress');
                            const pre = document.getElementById('raid-progress');
                            if (pre) {
                                const ops = p.data.operations;
                                let text = '';
                                text += `mdstat:\n${p.data.mdstat || ''}\n\n`;
                                if (ops && ops.length > 0) {
                                    ops.forEach(op => {
                                        text += `Device: ${op.device}\nOperation: ${op.operation} — ${op.percentage}% — ${op.blocks} — eta ${op.estimated_finish}\n\n`;
                                    });
                                } else {
                                    text += 'No active RAID operations. Waiting for finalization...\n';
                                }
                                pre.innerText = text;
                            }

                            if (!p.data.has_operations) {
                                setTimeout(async () => {
                                    clearInterval(pollInterval);
                                    Swal.close();
                                    await loadRaidStatus();
                                    await loadDisks();
                                    Swal.fire({ 
                                        icon: 'success', 
                                        title: 'Raid creation started', 
                                        text: 'Background jobs are running. Refresh the RAID list to see status.', 
                                        confirmButtonColor: '#00ab55',
                                        customClass: { icon: 'swal2-icon-large' } 
                                    });
                                }, 1500);
                            }
                        } catch (err) {
                            const pre = document.getElementById('raid-progress');
                            if (pre) pre.innerText += `\nError fetching progress: ${err.message || err}\n`;
                        }
                    };

                    update();
                    pollInterval = setInterval(update, 3000);
                },
                willClose: () => {
                    if (pollInterval) clearInterval(pollInterval);
                }
            });
        } catch (error: any) {
            console.error('Error creating RAID:', error);

            // Prefer server-provided detailed error (error field contains stderr or specific message)
            const serverMessage = error.response?.data?.message;
            const serverDetail = error.response?.data?.error || error.response?.data?.detail || null;

            let swalHtml = `<p>${serverMessage || 'Failed to create RAID array'}</p>`;
            if (serverDetail) {
                // Show details inside a scrollable pre block for readability
                swalHtml += `<pre style="white-space:pre-wrap; text-align:left; max-height:200px; overflow:auto; background:#f8f9fa; border-radius:6px; padding:10px; margin-top:10px;">${String(serverDetail)}</pre>`;
            }

            // Use a custom SVG iconHtml for a consistent, properly-sized X mark (no border)
            const errorIconSvg = `
                <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="44" fill="#fee" stroke="none" />
                    <line x1="32" y1="32" x2="68" y2="68" stroke="#f27474" stroke-width="8" stroke-linecap="round" />
                    <line x1="68" y1="32" x2="32" y2="68" stroke="#f27474" stroke-width="8" stroke-linecap="round" />
                </svg>
            `;

            Swal.fire({
                iconHtml: errorIconSvg,
                title: 'Error creating RAID array',
                html: swalHtml,
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'no-border-icon'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRaid = async (raid: any) => {
        // Simpler confirmation for simulated RAID
        if (raid.config_data?.simulated) {
            const confirmResult = await Swal.fire({
                icon: 'question',
                title: 'Delete Simulated RAID?',
                html: `
                    <p>Delete RAID configuration: <strong>${raid.raid_name}</strong>?</p>
                    <p class="text-info mt-2">This is a simulated configuration. No real data will be affected.</p>
                `,
                showCancelButton: true,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });

            if (!confirmResult.isConfirmed) return;
        } else {
            // Strict confirmation for real RAID
            const confirmResult = await Swal.fire({
                icon: 'warning',
                title: 'Delete RAID Array?',
                html: `
                    <p>Are you sure you want to delete RAID: <strong>${raid.raid_name}</strong>?</p>
                    <p class="text-danger mt-3"><strong>⚠️ WARNING: This will destroy all data!</strong></p>
                `,
                input: 'checkbox',
                inputPlaceholder: 'I understand this action cannot be undone',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel',
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'swal2-icon-large'
                },
                inputValidator: (result) => {
                    return !result && 'You must confirm to proceed';
                }
            });

            if (!confirmResult.isConfirmed) return;
        }

        try {
            setLoading(true);
            await api.delete(`/raid/${raid.id}`, {
                data: { confirm: true }
            });

            Swal.fire({
                icon: 'success',
                title: 'Deleted',
                text: 'RAID array deleted successfully',
                confirmButtonColor: '#00ab55',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });

            loadRaidStatus();
            loadDisks();
        } catch (error: any) {
            console.error('Error deleting RAID:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to delete RAID array',
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMountToggle = async (raid: any) => {
        try {
            setLoading(true);
            const endpoint = raid.is_mounted ? 'unmount' : 'mount';
            await api.post(`/raid/${raid.id}/${endpoint}`);

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `RAID ${raid.is_mounted ? 'unmounted' : 'mounted'} successfully`,
                confirmButtonColor: '#00ab55',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });

            loadRaidStatus();
        } catch (error: any) {
            console.error('Error toggling mount:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to toggle mount',
                confirmButtonColor: '#ef4444',
                customClass: {
                    icon: 'swal2-icon-large'
                }
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setRaidName('');
        setRaidType('RAID1');
        setSelectedDisks([]);
        setMountPoint('');
        setSimulateMode(true);
        setWipePartitions(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'degraded': return 'warning';
            case 'failed': return 'danger';
            case 'creating': return 'info';
            default: return 'secondary';
        }
    };

    const parseDisks = (disks: any): string[] => {
        if (Array.isArray(disks)) {
            return disks;
        }
        if (typeof disks === 'string') {
            try {
                return JSON.parse(disks);
            } catch (error) {
                console.error('Error parsing disks:', error);
                return [];
            }
        }
        return [];
    };

    return (
        <AdminGuard>
            <div>
                <ul className="flex space-x-2 rtl:space-x-reverse">
                    <li>
                        <Link to="/dashboard" className="text-primary hover:underline">
                            Dashboard
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>NAS Settings</span>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>RAID Configuration</span>
                    </li>
                </ul>

                <div className="pt-5">
                    {/* Header with Actions */}
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-bold">RAID Configuration</h2>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="btn btn-primary gap-2"
                                onClick={() => {
                                    loadDisks();
                                    loadRaidStatus();
                                }}
                                disabled={loading}
                            >
                                <IconRefresh className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <button
                                type="button"
                                className="btn btn-success gap-2"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <IconPlus />
                                Create RAID Array
                            </button>
                        </div>
                    </div>

                    {/* Warning Banner */}
                    {!mdadmInstalled && (
                        <div className="mb-5 rounded-md bg-danger-light p-4 text-danger dark:bg-danger-dark-light">
                            <div className="flex items-center gap-3">
                                <IconServer className="h-6 w-6" />
                                <div>
                                    <h5 className="font-semibold">mdadm Not Installed</h5>
                                    <p className="text-sm">Please install mdadm to use RAID features: <code>sudo apt-get install mdadm</code></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Existing RAID Configurations */}
                    <div className="panel mb-5">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Existing RAID Arrays</h5>
                        </div>

                        {raidConfigurations.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <IconServer className="mx-auto mb-3 h-16 w-16 opacity-30" />
                                <p>No RAID arrays configured yet</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table-hover">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Type</th>
                                            <th>Disks</th>
                                            <th>Device</th>
                                            <th>Mount Point</th>
                                            <th>Status</th>
                                            <th>Capacity</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {raidConfigurations.map((raid) => (
                                            <tr key={raid.id}>
                                                <td>
                                                    <div className="font-semibold">{raid.raid_name}</div>
                                                    {raid.config_data?.simulated && (
                                                        <span className="badge bg-info">Simulated</span>
                                                    )}
                                                </td>
                                                <td>{raid.raid_type}</td>
                                                <td>
                                                    <div className="text-xs">
                                                        {parseDisks(raid.disks).map((disk: string, idx: number) => (
                                                            <div key={idx}>{disk}</div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td><code>{raid.raid_device || '-'}</code></td>
                                                <td><code>{raid.mount_point || '-'}</code></td>
                                                <td>
                                                    <span className={`badge bg-${getStatusColor(raid.status)}`}>
                                                        {raid.status}
                                                    </span>
                                                    {raid.is_mounted && (
                                                        <span className="badge bg-success ml-1">Mounted</span>
                                                    )}
                                                </td>
                                                <td>{raid.capacity || '-'}</td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        {!raid.config_data?.simulated && (
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ${raid.is_mounted ? 'btn-warning' : 'btn-info'}`}
                                                                onClick={() => handleMountToggle(raid)}
                                                                disabled={loading}
                                                            >
                                                                {raid.is_mounted ? 'Unmount' : 'Mount'}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDeleteRaid(raid)}
                                                            disabled={loading}
                                                        >
                                                            <IconTrash />
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

                    {/* Available Disks Panel */}
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Available Disks</h5>
                            <p className="text-sm text-gray-500">List of block devices detected on your system</p>
                        </div>

                        {availableDisks.length === 0 ? (
                            <div className="py-8 text-center text-gray-500">
                                <p>No available disks found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {availableDisks.map((disk) => (
                                    <div
                                        key={disk.path}
                                        className={`rounded-lg border p-4 ${disk.available
                                            ? 'border-gray-300 dark:border-gray-700'
                                            : 'border-warning bg-warning-light dark:bg-warning-dark-light'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h6 className="font-semibold">{disk.name}</h6>
                                                <p className="text-xs text-gray-500">{disk.path}</p>
                                            </div>
                                            {disk.available ? (
                                                <span className="badge bg-success">Available</span>
                                            ) : (
                                                <span className="badge bg-warning">In Use</span>
                                            )}
                                        </div>
                                        <div className="mt-3 space-y-1 text-sm">
                                            <div>Size: <strong>{disk.size}</strong></div>
                                            <div>Type: <strong>{disk.type}</strong></div>
                                            {disk.mountpoint && (
                                                <div className="text-warning">
                                                    Mounted: <code>{disk.mountpoint}</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Create RAID Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                        <div className="panel m-4 w-full max-w-2xl">
                            <div className="mb-5 flex items-center justify-between">
                                <h5 className="text-lg font-semibold">Create RAID Array</h5>
                                <button
                                    type="button"
                                    className="text-white-dark hover:text-dark"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                >
                                    <IconX />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* RAID Name */}
                                <div>
                                    <label htmlFor="raidName">RAID Name *</label>
                                    <input
                                        id="raidName"
                                        type="text"
                                        placeholder="e.g., raid_storage"
                                        className="form-input"
                                        value={raidName}
                                        onChange={(e) => setRaidName(e.target.value)}
                                    />
                                </div>

                                {/* RAID Type */}
                                <div>
                                    <label>RAID Type *</label>
                                    <div className="mt-2 grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            className={`btn ${raidType === 'RAID0' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setRaidType('RAID0')}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold">RAID 0 (Striping)</div>
                                                <div className="text-xs">High performance, no redundancy</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${raidType === 'RAID1' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setRaidType('RAID1')}
                                        >
                                            <div className="text-left">
                                                <div className="font-bold">RAID 1 (Mirroring)</div>
                                                <div className="text-xs">High redundancy, 50% capacity</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Disk Selection */}
                                <div>
                                    <label>Select Disks * (minimum 2)</label>
                                    <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded border p-3">
                                        {availableDisks
                                            .filter((disk) => disk.available)
                                            .map((disk) => (
                                                <label key={disk.path} className="flex cursor-pointer items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="form-checkbox"
                                                        checked={selectedDisks.includes(disk.path)}
                                                        onChange={() => handleDiskSelection(disk.path)}
                                                    />
                                                    <span className="ml-2">
                                                        {disk.name} ({disk.size}) - {disk.path}
                                                    </span>
                                                </label>
                                            ))}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Selected: {selectedDisks.length} disk(s)
                                    </p>
                                </div>

                                {/* Mount Point */}
                                <div>
                                    <label htmlFor="mountPoint">Mount Point (optional)</label>
                                    <input
                                        id="mountPoint"
                                        type="text"
                                        placeholder="e.g., /mnt/raid_storage (auto-generated if empty)"
                                        className="form-input"
                                        value={mountPoint}
                                        onChange={(e) => setMountPoint(e.target.value)}
                                    />
                                </div>

                                {/* Wipe Partitions Option */}
                                <div className="rounded-lg border border-danger bg-danger-light p-4 dark:bg-danger-dark-light">
                                    <label className="flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={wipePartitions}
                                            onChange={(e) => setWipePartitions(e.target.checked)}
                                            disabled={simulateMode}
                                        />
                                        <span className="ml-2 font-semibold">Wipe Existing Partitions</span>
                                    </label>
                                    <p className="mt-2 text-xs">
                                        {wipePartitions && !simulateMode
                                            ? '⚠️ DANGER: Will remove ALL existing partitions and data on selected disks before creating RAID!'
                                            : simulateMode
                                                ? 'ℹ️ Not available in simulation mode'
                                                : '✓ Recommended if disks have existing partitions. mdadm will attempt to use disks as-is if unchecked.'}
                                    </p>
                                </div>

                                {/* Simulation Mode */}
                                <div className="rounded-lg border border-warning bg-warning-light p-4 dark:bg-warning-dark-light">
                                    <label className="flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={simulateMode}
                                            onChange={(e) => setSimulateMode(e.target.checked)}
                                        />
                                        <span className="ml-2 font-semibold">Simulation Mode (Recommended)</span>
                                    </label>
                                    <p className="mt-2 text-xs">
                                        {simulateMode
                                            ? '✅ Safe mode: Only saves configuration to database without executing actual RAID commands'
                                            : '⚠️ DANGER: Will execute real mdadm commands and ERASE all data on selected disks!'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${simulateMode ? 'btn-primary' : 'btn-danger'}`}
                                    onClick={handleCreateRaid}
                                    disabled={loading || selectedDisks.length < 2 || !raidName.trim()}
                                >
                                    {loading ? 'Creating...' : simulateMode ? 'Create (Simulate)' : 'Create (Execute)'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminGuard>
    );
};

export default RaidConfiguration;
