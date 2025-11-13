import { Link, useNavigate } from 'react-router-dom';
import Dropdown from '../components/Dropdown';
import ReactApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../store';
import { setPageTitle } from '../store/themeConfigSlice';
import { useEffect, useState } from 'react';
import IconHorizontalDots from '../components/Icon/IconHorizontalDots';
import IconEye from '../components/Icon/IconEye';
import IconBitcoin from '../components/Icon/IconBitcoin';
import IconEthereum from '../components/Icon/IconEthereum';
import IconLitecoin from '../components/Icon/IconLitecoin';
import IconBinance from '../components/Icon/IconBinance';
import IconTether from '../components/Icon/IconTether';
import IconSolana from '../components/Icon/IconSolana';
import IconCircleCheck from '../components/Icon/IconCircleCheck';
import IconInfoCircle from '../components/Icon/IconInfoCircle';
import IconUser from '../components/Icon/IconUser';
import IconFolderPlus from '../components/Icon/IconFolderPlus';
import IconFolder from '../components/Icon/IconFolder';
import IconFile from '../components/Icon/IconFile';
import { api } from '../services/api';
import { authService } from '../services/authService';

const Finance = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);
    const [userFolders, setUserFolders] = useState<any[]>([]);
    const [folderStats, setFolderStats] = useState<{ [key: number]: { files: number; folders: number } }>({});
    const [stats, setStats] = useState({
        totalUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        totalFolders: 0
    });
    const [temperatureData, setTemperatureData] = useState<number[]>([]);
    const [temperatureLabels, setTemperatureLabels] = useState<string[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));

        // Check user role
        const user = authService.getCurrentUser();
        const adminStatus = user?.role === 'admin';
        setIsAdmin(adminStatus);

        if (adminStatus) {
            // Admin: fetch statistics
            fetchStats();
            const tempInterval = setInterval(() => {
                fetchTemperature();
            }, 2000);
            fetchTemperature();

            return () => {
                clearInterval(tempInterval);
            };
        } else {
            // Regular user: fetch their folders
            fetchUserFolders();
        }
    }, []);

    const fetchStats = async () => {
        try {
            const usersResponse = await api.get('/users/all');
            const users = usersResponse.data;

            const foldersResponse = await api.get('/folders');
            const folders = foldersResponse.data;

            setStats({
                totalUsers: users.length,
                adminUsers: users.filter((u: any) => u.role === 'admin').length,
                regularUsers: users.filter((u: any) => u.role === 'user').length,
                totalFolders: folders.length
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchUserFolders = async () => {
        try {
            const response = await api.get('/files/my-folders');
            setUserFolders(response.data);

            // Fetch stats for each folder
            response.data.forEach(async (folder: any) => {
                try {
                    const statsResponse = await api.get(`/files/folder/${folder.id}`);
                    const files = statsResponse.data.items || [];
                    const fileCount = files.filter((item: any) => item.type === 'file').length;
                    const folderCount = files.filter((item: any) => item.type === 'directory').length;

                    setFolderStats(prev => ({
                        ...prev,
                        [folder.id]: {
                            files: fileCount,
                            folders: folderCount
                        }
                    }));
                } catch (err) {
                    console.error(`Error fetching stats for folder ${folder.id}:`, err);
                }
            });
        } catch (error) {
            console.error('Error fetching user folders:', error);
        }
    };

    const fetchTemperature = async () => {
        try {
            const response = await api.get('/temperature/current');
            const temp = response.data.temperature;
            const time = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            setTemperatureData(prev => {
                const newData = [...prev, temp];
                return newData.slice(-12);
            });

            setTemperatureLabels(prev => {
                const newLabels = [...prev, time];
                return newLabels.slice(-12);
            });
        } catch (error) {
            console.error('Error fetching temperature:', error);
        }
    };

    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme) === 'dark' ? true : false;

    // Temperature Area Chart Options
    const temperatureChart: any = {
        series: [
            {
                name: 'Temperature (°C)',
                data: temperatureData,
            },
        ],
        options: {
            chart: {
                type: 'area',
                height: 300,
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
                animations: {
                    enabled: true,
                    easing: 'linear',
                    dynamicAnimation: {
                        speed: 800
                    }
                },
            },
            colors: ['#ff5733'],
            dataLabels: {
                enabled: false,
            },
            stroke: {
                width: 2,
                curve: 'smooth',
            },
            xaxis: {
                type: 'category',
                categories: temperatureLabels,
                range: 11, // Show only 12 points at a time (0-11 = 12 points)
                axisBorder: {
                    color: isDark ? '#191e3a' : '#e0e6ed',
                },
                labels: {
                    rotate: -45,
                    rotateAlways: false,
                    style: {
                        colors: isDark ? '#888ea8' : '#506690',
                        fontSize: '10px'
                    }
                },
                tickAmount: 6, // Show fewer labels to avoid clutter
            },
            yaxis: {
                opposite: isRtl ? true : false,
                labels: {
                    offsetX: isRtl ? -40 : 0,
                    formatter: (value: number) => value.toFixed(1) + '°C',
                    style: {
                        colors: isDark ? '#888ea8' : '#506690',
                    }
                },
                min: 30,
                max: 80,
            },
            legend: {
                horizontalAlign: 'left',
                labels: {
                    colors: isDark ? '#888ea8' : '#506690',
                }
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
            },
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                x: {
                    show: true,
                },
                y: {
                    formatter: (value: number) => value.toFixed(2) + '°C'
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.1,
                    stops: [0, 90, 100]
                }
            },
        },
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                {/* <li>
                    <Link to="#" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li> */}
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Dashboard</span>
                </li>
            </ul>
            <div className="pt-5">
                {/* Regular User View - Show Folders */}
                {!isAdmin ? (
                    <div>
                        <div className="mb-5">
                            <h2 className="text-2xl font-bold mb-2">My Folders</h2>
                            <p className="text-gray-500">Access your folders and manage files</p>
                        </div>

                        {userFolders.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {userFolders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className="panel hover:shadow-lg transition-shadow cursor-pointer"
                                        onClick={() => navigate(`/folder/${folder.id}`)}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <IconFolder className="w-7 h-7 text-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-semibold text-lg mb-1">{folder.name}</h5>
                                                    {folder.access_level === 'read' && (
                                                        <span className="badge bg-info text-xs">Read Only</span>
                                                    )}
                                                    {folder.access_level === 'write' && (
                                                        <span className="badge bg-success text-xs">Full Access</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {folder.description && (
                                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                {folder.description}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between text-sm pt-4 border-t border-gray-200 dark:border-gray-700">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    <IconFile className="w-4 h-4 text-gray-500" />
                                                    <span>{folderStats[folder.id]?.files || 0} files</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <IconFolder className="w-4 h-4 text-gray-500" />
                                                    <span>{folderStats[folder.id]?.folders || 0} folders</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="panel">
                                <div className="flex flex-col items-center justify-center py-12">
                                    <IconFolder className="w-20 h-20 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-semibold mb-2">No Folders Assigned</h3>
                                    <p className="text-gray-500 text-center max-w-md">
                                        You don't have access to any folders yet. Please contact your administrator to get folder access.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Admin View - User Statistics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 text-white">
                            {/* Total Users */}
                            <div className="panel bg-gradient-to-r from-cyan-500 to-cyan-400">
                                <div className="flex justify-between">
                                    <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Total Users</div>
                                    <IconUser className="w-8 h-8 opacity-70" />
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.totalUsers}</div>
                                    <div className="badge bg-white/30">All Users</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">
                                    <IconEye className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                    Active & Inactive Users
                                </div>
                            </div>

                            {/* Admin Users */}
                            <div className="panel bg-gradient-to-r from-violet-500 to-violet-400">
                                <div className="flex justify-between">
                                    <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Admin Users</div>
                                    <IconUser className="w-8 h-8 opacity-70" />
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.adminUsers}</div>
                                    <div className="badge bg-white/30">Admins</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">
                                    <IconEye className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                    Full Access Privileges
                                </div>
                            </div>

                            {/* Regular Users */}
                            <div className="panel bg-gradient-to-r from-blue-500 to-blue-400">
                                <div className="flex justify-between">
                                    <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Regular Users</div>
                                    <IconUser className="w-8 h-8 opacity-70" />
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.regularUsers}</div>
                                    <div className="badge bg-white/30">Users</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">
                                    <IconEye className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                    Limited Access
                                </div>
                            </div>

                            {/* Total Folders */}
                            <div className="panel bg-gradient-to-r from-fuchsia-500 to-fuchsia-400">
                                <div className="flex justify-between">
                                    <div className="ltr:mr-1 rtl:ml-1 text-md font-semibold">Total Folders</div>
                                    <IconFolderPlus className="w-8 h-8 opacity-70" />
                                </div>
                                <div className="flex items-center mt-5">
                                    <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.totalFolders}</div>
                                    <div className="badge bg-white/30">Folders</div>
                                </div>
                                <div className="flex items-center font-semibold mt-5">
                                    <IconEye className="ltr:mr-2 rtl:ml-2 shrink-0" />
                                    Shared Storage
                                </div>
                            </div>
                        </div>

                        {/* Raspberry Pi Temperature Chart */}
                        <div className="panel mb-6 col-lg-6">
                            <div className="flex items-center justify-between mb-5">
                                <h5 className="font-semibold text-lg dark:text-white-light">Raspberry Pi Temperature Monitor</h5>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Current:</span>
                                        <span className={`text-2xl font-bold ${temperatureData[temperatureData.length - 1] > 70 ? 'text-danger' :
                                                temperatureData[temperatureData.length - 1] > 50 ? 'text-warning' :
                                                    'text-success'
                                            }`}>
                                            {temperatureData[temperatureData.length - 1]?.toFixed(1)}°C
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Status:</span>
                                        <span className={`badge ${temperatureData[temperatureData.length - 1] > 70 ? 'bg-danger' :
                                                temperatureData[temperatureData.length - 1] > 50 ? 'bg-warning' :
                                                    'bg-success'
                                            }`}>
                                            {temperatureData[temperatureData.length - 1] > 70 ? 'High' :
                                                temperatureData[temperatureData.length - 1] > 50 ? 'Warm' :
                                                    'Normal'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {temperatureData.length > 0 ? (
                                <>
                                    <ReactApexChart
                                        series={temperatureChart.series}
                                        options={temperatureChart.options}
                                        className="rounded-lg bg-white dark:bg-black"
                                        type="area"
                                        height={300}
                                    />
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-gray-500">
                                    <div className="text-center">
                                        <IconInfoCircle className="w-12 h-12 mx-auto mb-3" />
                                        <p>Loading temperature data...</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Remove old placeholder code */}
                    </>
                )}
            </div>
        </div>
    );
};

export default Finance;