import axios, { AxiosInstance } from 'axios';

const baseURL = 'http://192.168.11.46:3001/api';

export const createApi = (): AxiosInstance => {
    const api = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json'
        },
        withCredentials: true
    });

    // Add request interceptor for JWT
    api.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Add response interceptor for auth errors
    api.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );

    return api;
};

export const api = createApi();