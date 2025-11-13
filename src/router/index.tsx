import { createBrowserRouter, Navigate } from 'react-router-dom';
import BlankLayout from '../components/Layouts/BlankLayout';
import DefaultLayout from '../components/Layouts/DefaultLayout';
import { routes } from './routes';
import Login from '../pages/template/Authentication/Login';
import AdminGuard from '../components/AdminGuard';

const authRoutes = [
    {
        path: '/login',
        element: <BlankLayout><Login /></BlankLayout>,
    },
    {
        path: '/unauthorized',
        element: <BlankLayout><div>Unauthorized Access</div></BlankLayout>,
    }
];

const finalRoutes = [
    ...authRoutes,
    ...routes.map((route) => {
        return {
            ...route,
            element: route.layout === 'blank' ?
                <BlankLayout>{route.element}</BlankLayout> :
                <DefaultLayout>{route.element}</DefaultLayout>,
        };
    })
];

const router = createBrowserRouter(finalRoutes);

export default router;
