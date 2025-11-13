import { PropsWithChildren, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from './store';
import { toggleRTL, toggleTheme, toggleLocale, toggleMenu, toggleLayout, toggleAnimation, toggleNavbar, toggleSemidark } from './store/themeConfigSlice';
import store from './store';
import { api } from './services/api';

function App({ children }: PropsWithChildren) {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    useEffect(() => {
        localStorage.setItem('menu', 'collapsible-vertical');
        localStorage.setItem('layout', 'full');
        localStorage.setItem('rtlClass', 'ltr');
        localStorage.setItem('navbar', 'navbar-floating');
        
        dispatch(toggleTheme(localStorage.getItem('theme') || themeConfig.theme));
        dispatch(toggleMenu('collapsible-vertical'));
        dispatch(toggleLayout('full'));
        dispatch(toggleRTL('ltr'));
        dispatch(toggleAnimation(localStorage.getItem('animation') || themeConfig.animation));
        dispatch(toggleNavbar('navbar-floating'));
        dispatch(toggleLocale(localStorage.getItem('i18nextLng') || themeConfig.locale));
        dispatch(toggleSemidark(false));

        // Load app settings for favicon and title
        loadAppSettings();
    }, [dispatch]);

    const loadAppSettings = async () => {
        try {
            const response = await api.get('/settings/app');
            const settings = response.data;

            // Update favicon
            if (settings.app_favicon) {
                const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
                if (link) {
                    link.href = settings.app_favicon;
                }
            }

            // Update title
            if (settings.app_name) {
                document.title = settings.app_name;
            }

            // Store in localStorage for quick access
            localStorage.setItem('appSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error loading app settings:', error);
        }
    };

    return (
        <div
            className={`${(store.getState().themeConfig.sidebar && 'toggle-sidebar') || ''} ${themeConfig.menu} ${themeConfig.layout} ${
                themeConfig.rtlClass
            } main-section antialiased relative font-nunito text-sm font-normal`}
        >
            {children}
        </div>
    );
}

export default App;
