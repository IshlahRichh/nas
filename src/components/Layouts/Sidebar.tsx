import PerfectScrollbar from 'react-perfect-scrollbar';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { toggleSidebar } from '../../store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '../../store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '../Icon/IconCaretsDown';
import IconCaretDown from '../Icon/IconCaretDown';
import IconMenuDashboard from '../Icon/Menu/IconMenuDashboard';
import IconMinus from '../Icon/IconMinus';
import IconMenuChat from '../Icon/Menu/IconMenuChat';
import IconMenuMailbox from '../Icon/Menu/IconMenuMailbox';
import IconMenuTodo from '../Icon/Menu/IconMenuTodo';
import IconMenuNotes from '../Icon/Menu/IconMenuNotes';
import IconMenuScrumboard from '../Icon/Menu/IconMenuScrumboard';
import IconMenuContacts from '../Icon/Menu/IconMenuContacts';
import IconMenuInvoice from '../Icon/Menu/IconMenuInvoice';
import IconMenuCalendar from '../Icon/Menu/IconMenuCalendar';
import IconMenuComponents from '../Icon/Menu/IconMenuComponents';
import IconMenuElements from '../Icon/Menu/IconMenuElements';
import IconMenuCharts from '../Icon/Menu/IconMenuCharts';
import IconMenuWidgets from '../Icon/Menu/IconMenuWidgets';
import IconMenuFontIcons from '../Icon/Menu/IconMenuFontIcons';
import IconMenuDragAndDrop from '../Icon/Menu/IconMenuDragAndDrop';
import IconMenuTables from '../Icon/Menu/IconMenuTables';
import IconMenuDatatables from '../Icon/Menu/IconMenuDatatables';
import IconMenuForms from '../Icon/Menu/IconMenuForms';
import IconMenuUsers from '../Icon/Menu/IconMenuUsers';
import IconMenuPages from '../Icon/Menu/IconMenuPages';
import IconMenuAuthentication from '../Icon/Menu/IconMenuAuthentication';
import IconMenuDocumentation from '../Icon/Menu/IconMenuDocumentation';
import IconSettings from '../Icon/IconSettings';
import IconLogout from '../Icon/IconLogout';
import IconServer from '../Icon/IconServer';
import { authService } from '../../services/authService';
import { api } from '../../services/api';

interface FolderAccess {
    id: number;
    name: string;
    path: string;
    access_level: string;
}

const Sidebar = () => {
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const [userFolders, setUserFolders] = useState<FolderAccess[]>([]);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const location = useLocation();
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const isAdmin = authService.isAdmin();

    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            authService.logout();
            window.location.href = '/login';
        }
    };

    // Fetch user folders for sidebar
    useEffect(() => {
        const fetchUserFolders = async () => {
            try {
                // Admin gets all folders, regular users get their assigned folders
                const endpoint = isAdmin ? '/folders' : '/files/my-folders';
                const response = await api.get(endpoint);
                setUserFolders(response.data);
            } catch (error) {
                console.error('Error fetching folders:', error);
            }
        };
        fetchUserFolders();
    }, [isAdmin]);

    useEffect(() => {
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                let ele: any = ul.closest('li.menu').querySelectorAll('.nav-link') || [];
                if (ele.length) {
                    ele = ele[0];
                    setTimeout(() => {
                        ele.click();
                    });
                }
            }
        }
    }, []);

    useEffect(() => {
        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed min-h-screen h-full top-0 bottom-0 w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] z-50 transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="bg-white dark:bg-black h-full">
                    <div className="flex justify-between items-center px-4 py-3">
                        <NavLink to="/" className="main-logo flex items-center shrink-0">
                            <img className="w-8 ml-[5px] flex-none" src="/assets/images/logo.svg" alt="logo" />
                            <span className="text-2xl ltr:ml-1.5 rtl:mr-1.5 font-semibold align-middle lg:inline dark:text-white-light"><b>{t('My NAS')}</b></span>
                        </NavLink>

                        <button
                            type="button"
                            className="collapse-icon w-8 h-8 rounded-full flex items-center hover:bg-gray-500/10 dark:hover:bg-dark-light/10 dark:text-white-light transition duration-300 rtl:rotate-180"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="h-[calc(100vh-140px)] relative">
                        <ul className="relative font-semibold space-y-0.5 p-4 py-0">
                            <li className="nav-item">
                                <NavLink to="/dashboard" className="group">
                                    <div className="flex items-center">
                                        <IconMenuDashboard className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('dashboard')}</span>
                                    </div>
                                </NavLink>
                            </li>

                            {/* File Management Section - For All Users */}
                            <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                <IconMinus className="w-4 h-5 flex-none hidden" />
                                <span>{t('Files')}</span>
                            </h2>

                            {/* Folder List - For All Users (Admin & Regular) */}
                            {userFolders.length > 0 && (
                                <>
                                    {userFolders.map((folder) => (
                                        <li className="nav-item" key={folder.id}>
                                            <NavLink to={`/folder/${folder.id}`} className="group">
                                                <div className="flex items-center">
                                                    <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                    <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">
                                                        {folder.name}
                                                        {!isAdmin && folder.access_level === 'read' && (
                                                            <span className="text-xs ml-1 opacity-60">(RO)</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </NavLink>
                                        </li>
                                    ))}
                                </>
                            )}

                            {userFolders.length === 0 && (
                                <li className="nav-item">
                                    <div className="flex items-center px-3 py-2 text-gray-500 dark:text-gray-400">
                                        <span className="text-sm italic ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">No folders assigned</span>
                                    </div>
                                </li>
                            )}

                            {/* Admin Section - Only for Admins */}
                            {isAdmin && (
                                <>
                                    <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1 mt-5">
                                        <IconMinus className="w-4 h-5 flex-none hidden" />
                                        <span>{t('System Management')}</span>
                                    </h2>

                                    <li className="nav-item">
                                        <NavLink to="/apps/raid-configuration" className="group">
                                            <div className="flex items-center">
                                                <IconServer className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('RAID Configuration')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/apps/user-management" className="group">
                                            <div className="flex items-center">
                                                <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('User Management')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/apps/folder-management" className="group">
                                            <div className="flex items-center">
                                                <IconMenuNotes className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Folder Management')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                    <li className="nav-item">
                                        <NavLink to="/transfer-logs" className="group">
                                            <div className="flex items-center">
                                                <IconMenuCharts className="group-hover:!text-primary shrink-0" />
                                                <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Transfer Logs')}</span>
                                            </div>
                                        </NavLink>
                                    </li>
                                </>
                            )}

                            <h2 className="py-3 px-7 flex items-center uppercase font-extrabold bg-white-light/30 dark:bg-dark dark:bg-opacity-[0.08] -mx-4 mb-1">
                                <IconMinus className="w-4 h-5 flex-none hidden" />
                                <span>{t('Settings')}</span>
                            </h2>

                            <li className="menu nav-item">
                                <NavLink to="/users/user-account-settings" className="group">
                                    <div className="flex items-center">
                                        <IconMenuUsers className="group-hover:!text-primary shrink-0" />
                                        <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('Account Settings')}</span>
                                    </div>
                                </NavLink>
                            </li>

                            {isAdmin && (
                                <li className="menu nav-item">
                                    <NavLink to="/settings/app" className="group">
                                        <div className="flex items-center">
                                            <IconSettings className="group-hover:!text-primary shrink-0" />
                                            <span className="ltr:pl-3 rtl:pr-3 text-black dark:text-[#506690] dark:group-hover:text-white-dark">{t('App Settings')}</span>
                                        </div>
                                    </NavLink>
                                </li>
                            )}
                            <div>
                            </div>
                        </ul>
                    </PerfectScrollbar>

                    {/* Logout Button - Fixed at Bottom */}
                    <div className="nav-item absolute bottom-0 w-full border-t border-[#ebedf2] dark:border-[#191e3a] bg-white dark:bg-black p-4">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="nav-link group w-full flex items-center hover:bg-gray-100 dark:hover:bg-gray-900 p-2 rounded transition-all"
                            title={t('Logout')}
                        >
                            <IconLogout className="group-hover:!text-danger text-danger shrink-0 rotate-90" />
                            <span className="ltr:pl-3 rtl:pr-3 text-danger font-semibold group-hover:text-danger hidden lg:inline">{t('Sign Out')}</span>
                            <span className="flex-grow"></span>
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;
