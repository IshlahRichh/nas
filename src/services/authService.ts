import { api } from './api';

interface LoginData {
    email: string;
    password: string;
}

interface AuthResponse {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        role: string;
        avatar?: string;
    };
}

export const authService = {
    login: async (data: LoginData): Promise<AuthResponse> => {
        try {
            console.log('Attempting login with:', data.email);
            const response = await api.post('/auth/login', data);
            console.log('Login response:', response.data);

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                // Store login time for session management
                localStorage.setItem('loginTime', new Date().getTime().toString());
                console.log('Login successful, token stored');
            }
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        window.location.href = '/login';
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            return JSON.parse(userStr);
        }
        return null;
    },

    isAuthenticated: () => {
        const token = localStorage.getItem('token');
        const loginTime = localStorage.getItem('loginTime');

        if (!token || !loginTime) {
            return false;
        }

        // Check if session expired (2 hours = 7200000 ms)
        const currentTime = new Date().getTime();
        const sessionDuration = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

        if (currentTime - parseInt(loginTime) > sessionDuration) {
            // Session expired, clear storage
            authService.logout();
            return false;
        }

        return true;
    },

    isAdmin: () => {
        const user = authService.getCurrentUser();
        return user && user.role === 'admin';
    },

    checkSessionExpiry: () => {
        if (!authService.isAuthenticated()) {
            authService.logout();
            return false;
        }
        return true;
    },

    updateUserData: (userData: any) => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    }
};