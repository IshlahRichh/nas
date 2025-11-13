import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconCamera from '../../components/Icon/IconCamera';
import IconUser from '../../components/Icon/IconUser';
import IconSettings from '../../components/Icon/IconSettings';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

const AccountSetting = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<string>('profile');
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState({
        id: 0,
        name: '',
        email: '',
        avatar: '',
        role: 'user'
    });
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [appSettings, setAppSettings] = useState({
        app_name: '',
        app_logo: '',
        app_description: ''
    });

    useEffect(() => {
        dispatch(setPageTitle('Account Setting'));
        loadUserData();
        loadAppSettings();
    }, []);

    const loadUserData = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                navigate('/login');
                return;
            }

            // Use /profile endpoint instead of /users/:id
            const response = await api.get('/users/profile');
            setUserData(response.data);
            setFormData({
                name: response.data.name,
                email: response.data.email,
                password: '',
                confirmPassword: ''
            });
        } catch (error: any) {
            console.error('Error loading user data:', error);
            // If unauthorized, redirect to login
            if (error.response?.status === 401 || error.response?.status === 403) {
                authService.logout();
            }
        }
    };

    const loadAppSettings = async () => {
        try {
            const response = await api.get('/settings/app');
            setAppSettings(response.data);
        } catch (error) {
            console.error('Error loading app settings:', error);
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setUserData(prev => ({ ...prev, avatar: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        try {
            setLoading(true);

            // Validation
            if (!formData.name || !formData.email) {
                setLoading(false);
                alert('Name and email are required');
                return;
            }

            if (formData.password && formData.password !== formData.confirmPassword) {
                setLoading(false);
                alert('Passwords do not match');
                return;
            }

            if (formData.password && formData.password.length < 6) {
                setLoading(false);
                alert('Password must be at least 6 characters');
                return;
            }

            const updateData: any = {
                name: formData.name,
                email: formData.email,
                avatar: userData.avatar || null
            };

            if (formData.password) {
                updateData.password = formData.password;
            }

            console.log('Sending update data:', updateData);

            // Use /profile endpoint instead of /users/:id
            const response = await api.put('/users/profile', updateData);

            console.log('Update response:', response.data);

            // Update local storage with the response data
            const currentUser = authService.getCurrentUser();
            if (currentUser && response.data.user) {
                const updatedUserData = {
                    ...currentUser,
                    ...response.data.user
                };
                localStorage.setItem('user', JSON.stringify(updatedUserData));

                // Update local state
                setUserData(response.data.user);

                // Dispatch custom event to notify Header component
                window.dispatchEvent(new Event('userDataUpdated'));

                console.log('Local storage updated with:', updatedUserData);
            }

            alert('Profile updated successfully!');
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        } catch (error: any) {
            console.error('Error updating profile:', error);
            console.error('Error details:', error.response?.data);
            alert(error.response?.data?.message || error.message || 'Error updating profile');
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Increase limit to 5MB for SVG files
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;

            // Check base64 size (should be less than 10MB when encoded)
            const base64Size = base64String.length * 0.75; // approximate size in bytes
            if (base64Size > 10 * 1024 * 1024) {
                alert('Encoded image is too large. Please use a smaller file or compress it.');
                return;
            }

            setAppSettings(prev => ({ ...prev, app_logo: base64String }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveAppSettings = async () => {
        try {
            setLoading(true);

            if (!appSettings.app_name) {
                alert('App name is required');
                return;
            }

            // Set app_favicon same as app_logo
            const settingsToSave = {
                ...appSettings,
                app_favicon: appSettings.app_logo
            };

            await api.put('/settings/app', settingsToSave);

            // Update favicon dynamically
            if (appSettings.app_logo) {
                const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (link) {
                    link.href = appSettings.app_logo;
                }
            }

            // Update title
            if (appSettings.app_name) {
                document.title = appSettings.app_name;
            }

            // Update localStorage
            localStorage.setItem('appSettings', JSON.stringify(settingsToSave));

            alert('App settings updated successfully!');
            loadAppSettings();
        } catch (error: any) {
            console.error('Error updating app settings:', error);
            alert(error.response?.data?.message || 'Error updating app settings');
        } finally {
            setLoading(false);
        }
    };

    const removeLogo = () => {
        setAppSettings(prev => ({ ...prev, app_logo: '' }));
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/dashboard" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Account Settings</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Settings</h5>
                </div>

                {/* Tabs Navigation */}
                <ul className="sm:flex font-semibold border-b border-[#ebedf2] dark:border-[#191e3a] mb-5 whitespace-nowrap overflow-y-auto">
                    <li className="inline-block">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${activeTab === 'profile' ? '!border-primary text-primary' : ''}`}
                        >
                            <IconUser className="w-5 h-5" />
                            Profile
                        </button>
                    </li>
                    {userData.role === 'admin' && (
                        <li className="inline-block">
                            <button
                                onClick={() => setActiveTab('app-settings')}
                                className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${activeTab === 'app-settings' ? '!border-primary text-primary' : ''}`}
                            >
                                <IconSettings className="w-5 h-5" />
                                App Settings
                            </button>
                        </li>
                    )}
                </ul>

                <div>
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                            <h6 className="text-lg font-bold mb-5">General Information</h6>
                            <div className="flex flex-col sm:flex-row">
                                <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5 p-3 p-sm-0">
                                    <div className="relative inline-block">
                                        <img
                                            src={userData.avatar || '/assets/images/profile.png'}
                                            alt="Profile"
                                            className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto border-4 border-gray-200 dark:border-gray-700"
                                        />
                                        <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-primary-dark">
                                            <IconCamera className="w-4 h-4" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAvatarUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-center mt-2 text-gray-500">Click camera to change</p>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="name">Full Name <span className="text-red-500">*</span></label>
                                        <input
                                            id="name"
                                            type="text"
                                            placeholder="Enter your name"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="email">Email <span className="text-red-500">*</span></label>
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password">New Password</label>
                                        <input
                                            id="password"
                                            type="password"
                                            placeholder="Enter new password (optional)"
                                            className="form-input"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Leave empty to keep current password</p>
                                    </div>
                                    <div>
                                        <label htmlFor="confirmPassword">Confirm Password</label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Confirm new password"
                                            className="form-input"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            disabled={!formData.password}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                                            <p className="text-sm"><strong>Role:</strong> {userData.role === 'admin' ? '👑 Administrator' : '👤 User'}</p>
                                            <p className="text-sm mt-1"><strong>Account ID:</strong> #{userData.id}</p>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2 mt-3">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleSaveProfile}
                                            disabled={loading}
                                        >
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {/* App Settings Tab - Admin Only */}
                    {activeTab === 'app-settings' && userData.role === 'admin' && (
                        <div className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                            <h6 className="text-lg font-bold mb-5">Application Settings</h6>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* App Name */}
                                <div className="md:col-span-2">
                                    <label htmlFor="app_name">Application Name <span className="text-red-500">*</span></label>
                                    <input
                                        id="app_name"
                                        type="text"
                                        placeholder="Enter application name"
                                        className="form-input"
                                        value={appSettings.app_name}
                                        onChange={(e) => setAppSettings({ ...appSettings, app_name: e.target.value })}
                                    />
                                </div>

                                {/* App Logo & Favicon (Combined) */}
                                <div className="md:col-span-2">
                                    <label className="block mb-2">Application Logo & Favicon</label>
                                    <p className="text-xs text-gray-500 mb-3">This image will be used as both logo and favicon</p>
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                                        {appSettings.app_logo ? (
                                            <div className="text-center">
                                                <div className="flex justify-center items-center gap-6 mb-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-2">Logo Preview</p>
                                                        <img
                                                            src={appSettings.app_logo}
                                                            alt="Logo Preview"
                                                            className="h-24 object-contain border border-gray-200 dark:border-gray-700 p-2 rounded"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-2">Favicon Preview</p>
                                                        <img
                                                            src={appSettings.app_logo}
                                                            alt="Favicon Preview"
                                                            className="w-8 h-8 object-contain border border-gray-200 dark:border-gray-700 p-1 rounded"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 justify-center">
                                                    <label className="btn btn-sm btn-primary cursor-pointer">
                                                        Change Image
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleLogoUpload}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={removeLogo}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <IconCamera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                                <label className="btn btn-sm btn-primary cursor-pointer">
                                                    Upload Image
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                        className="hidden"
                                                    />
                                                </label>
                                                <p className="text-xs text-gray-500 mt-2">Max 5MB, Recommended square image (e.g., 512x512px). Supports PNG, JPG, SVG</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* App Description */}
                                <div className="md:col-span-2">
                                    <label htmlFor="app_description">Application Description</label>
                                    <textarea
                                        id="app_description"
                                        rows={4}
                                        placeholder="Enter application description"
                                        className="form-textarea"
                                        value={appSettings.app_description}
                                        onChange={(e) => setAppSettings({ ...appSettings, app_description: e.target.value })}
                                    />
                                </div>

                                {/* Preview Card */}
                                <div className="md:col-span-2">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <h6 className="font-semibold mb-3">Preview</h6>
                                        <div className="flex items-center gap-4">
                                            {appSettings.app_logo && (
                                                <img
                                                    src={appSettings.app_logo}
                                                    alt="Logo"
                                                    className="w-16 h-16 object-contain"
                                                />
                                            )}
                                            <div>
                                                <p className="font-semibold text-lg">{appSettings.app_name || 'Application Name'}</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{appSettings.app_description || 'No description'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div className="md:col-span-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleSaveAppSettings}
                                        disabled={loading}
                                    >
                                        {loading ? 'Saving...' : 'Save App Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSetting;
