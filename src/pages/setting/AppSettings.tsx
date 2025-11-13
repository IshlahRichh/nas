import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconSettings from '../../components/Icon/IconSettings';
import IconSave from '../../components/Icon/IconSave';
import { api } from '../../services/api';
import { authService } from '../../services/authService';

const AppSettings = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        app_name: 'NAS System',
        app_logo: '',
        app_favicon: '',
        app_description: ''
    });

    useEffect(() => {
        if (!authService.isAdmin()) {
            navigate('/dashboard');
            return;
        }
        
        dispatch(setPageTitle('App Settings'));
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/settings/app');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setSettings(prev => ({
                ...prev,
                [type === 'logo' ? 'app_logo' : 'app_favicon']: base64String
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = async () => {
        try {
            setLoading(true);
            await api.put('/settings/app', settings);
            alert('Settings saved successfully!');
            
            // Update favicon dynamically
            if (settings.app_favicon) {
                const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (link) {
                    link.href = settings.app_favicon;
                }
            }
            
            // Update title dynamically
            if (settings.app_name) {
                document.title = settings.app_name;
            }
            
            // Reload to apply changes
            window.location.reload();
        } catch (error: any) {
            console.error('Error saving settings:', error);
            alert(error.response?.data?.message || 'Error saving settings');
        } finally {
            setLoading(false);
        }
    };

    const removeLogo = () => {
        setSettings(prev => ({ ...prev, app_logo: '' }));
    };

    const removeFavicon = () => {
        setSettings(prev => ({ ...prev, app_favicon: '' }));
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
                    <span>App Settings</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="panel">
                    <div className="flex items-center justify-between mb-5">
                        <h5 className="font-semibold text-lg dark:text-white-light flex items-center gap-2">
                            <IconSettings className="w-6 h-6" />
                            Application Settings
                        </h5>
                    </div>

                    <div className="space-y-6">
                        {/* App Name */}
                        <div>
                            <label htmlFor="app_name" className="block text-sm font-medium mb-2">
                                Application Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="app_name"
                                type="text"
                                className="form-input"
                                placeholder="Enter application name"
                                value={settings.app_name}
                                onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                This name will appear in the browser tab and navbar
                            </p>
                        </div>

                        {/* App Description */}
                        <div>
                            <label htmlFor="app_description" className="block text-sm font-medium mb-2">
                                Description
                            </label>
                            <textarea
                                id="app_description"
                                className="form-textarea"
                                rows={3}
                                placeholder="Enter application description"
                                value={settings.app_description || ''}
                                onChange={(e) => setSettings({ ...settings, app_description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Upload */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <label className="block text-sm font-medium mb-2">
                                    Application Logo
                                </label>
                                <div className="space-y-3">
                                    {settings.app_logo ? (
                                        <div className="relative">
                                            <img
                                                src={settings.app_logo}
                                                alt="Logo Preview"
                                                className="w-32 h-32 object-contain border rounded mx-auto"
                                            />
                                            <button
                                                type="button"
                                                onClick={removeLogo}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center mx-auto">
                                            <span className="text-gray-400">No Logo</span>
                                        </div>
                                    )}
                                    <label className="btn btn-outline-primary w-full cursor-pointer">
                                        Upload Logo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'logo')}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-gray-500">
                                        Recommended: 200x200px, max 2MB
                                    </p>
                                </div>
                            </div>

                            {/* Favicon Upload */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <label className="block text-sm font-medium mb-2">
                                    Favicon
                                </label>
                                <div className="space-y-3">
                                    {settings.app_favicon ? (
                                        <div className="relative">
                                            <img
                                                src={settings.app_favicon}
                                                alt="Favicon Preview"
                                                className="w-16 h-16 object-contain border rounded mx-auto"
                                            />
                                            <button
                                                type="button"
                                                onClick={removeFavicon}
                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center mx-auto">
                                            <span className="text-gray-400 text-xs">No Favicon</span>
                                        </div>
                                    )}
                                    <label className="btn btn-outline-primary w-full cursor-pointer">
                                        Upload Favicon
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'favicon')}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-xs text-gray-500">
                                        Recommended: 32x32px or 64x64px, max 2MB
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard')}
                                className="btn btn-outline-danger"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveSettings}
                                disabled={loading}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <IconSave className="w-4 h-4" />
                                {loading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppSettings;
