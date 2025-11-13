import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import AdminGuard from '../components/AdminGuard';
import { authService } from '../services/authService';

const Login = lazy(() => import('../pages/template/Authentication/Login'));
const UserManagement = lazy(() => import('../pages/template/User/UserManagement'));

export const routes = [
    // Redirect root berdasarkan role - semua user ke dashboard
    {
        path: '/',
        element: authService.isAuthenticated() 
            ? <Navigate to="/dashboard" />
            : <Navigate to="/login" />,
    },
    {
        path: '/login',
        element: authService.isAuthenticated() 
            ? <Navigate to="/dashboard" />
            : <Login />,
        layout: 'blank'
    },
    {
        path: '/user-management',
        element: (
            <AdminGuard>
                <UserManagement />
            </AdminGuard>
        )
    }
];