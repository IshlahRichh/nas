import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

interface AdminGuardProps {
    children: JSX.Element;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
    if (!authService.isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    if (!authService.isAdmin()) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
};

export default AdminGuard;