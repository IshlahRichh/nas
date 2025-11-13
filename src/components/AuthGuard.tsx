import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useEffect } from 'react';

interface AuthGuardProps {
    children: JSX.Element;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
    useEffect(() => {
        // Check session every 5 minutes
        const interval = setInterval(() => {
            if (!authService.checkSessionExpiry()) {
                window.location.href = '/login';
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, []);

    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    return children;
};

export default AuthGuard;