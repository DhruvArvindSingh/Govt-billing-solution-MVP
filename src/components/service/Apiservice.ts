import axios from 'axios';

// Configure axios defaults
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8888';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies in requests
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
    (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        console.error('API Error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            // Handle unauthorized access
            console.warn('Unauthorized access - please login');
        }

        return Promise.reject(error);
    }
);

class ApiService {
    // S3 Operations
    static async listAllS3() {
        try {
            const response = await apiClient.post('/api/v1/listAllS3', {});
            return response.data;
        } catch (error) {
            console.error('Failed to list S3 files:', error);
            throw error;
        }
    }

    static async getFileS3(fileName) {
        try {
            console.log('Requesting S3 file:', fileName);
            const response = await apiClient.post('/api/v1/getFileS3', { fileName });
            console.log('Raw S3 API response:', response);
            console.log('Response data:', response.data);
            console.log('Response data type:', typeof response.data);
            console.log('Response data keys:', Object.keys(response.data || {}));
            return response.data;
        } catch (error) {
            console.error('Failed to get S3 file:', error);
            console.error('Error response:', error.response?.data);
            throw error;
        }
    }

    static async uploadFileS3(fileName, content) {
        try {
            const response = await apiClient.post('/api/v1/uploadFileS3', {
                fileName,
                content
            });
            return response.data;
        } catch (error) {
            console.error('Failed to upload S3 file:', error);
            throw error;
        }
    }

    static async deleteFileS3(fileName) {
        try {
            const response = await apiClient.post('/api/v1/deleteFileS3', { fileName });
            return response.data;
        } catch (error) {
            console.error('Failed to delete S3 file:', error);
            throw error;
        }
    }

    // Dropbox Operations
    static async listAllDropbox() {
        try {
            const response = await apiClient.post('/api/v1/listAllDropbox', {});
            return response.data;
        } catch (error) {
            console.error('Failed to list Dropbox files:', error);
            throw error;
        }
    }

    static async getFileDropbox(fileName) {
        try {
            console.log('Requesting Dropbox file:', fileName);
            const response = await apiClient.post('/api/v1/getFileDropbox', { fileName });
            console.log('Raw Dropbox API response:', response);
            console.log('Response data:', response.data);
            console.log('Response data type:', typeof response.data);
            console.log('Response data keys:', Object.keys(response.data || {}));
            return response.data;
        } catch (error) {
            console.error('Failed to get Dropbox file:', error);
            console.error('Error response:', error.response?.data);
            throw error;
        }
    }

    static async uploadFileDropbox(fileName, content) {
        try {
            const response = await apiClient.post('/api/v1/uploadFileDropbox', {
                fileName,
                content
            });
            return response.data;
        } catch (error) {
            console.error('Failed to upload Dropbox file:', error);
            throw error;
        }
    }

    static async deleteFileDropbox(fileName) {
        try {
            const response = await apiClient.post('/api/v1/deleteFileDropbox', { fileName });
            return response.data;
        } catch (error) {
            console.error('Failed to delete Dropbox file:', error);
            throw error;
        }
    }

    // Authentication (if needed)
    static async signup(userData) {
        try {
            const response = await apiClient.post('/api/v1/signup', userData);
            return response.data;
        } catch (error) {
            console.error('Failed to signup:', error);
            throw error;
        }
    }

    static async signin(credentials) {
        try {
            const response = await apiClient.post('/api/v1/signin', credentials);
            return response.data;
        } catch (error) {
            console.error('Failed to signin:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const response = await apiClient.post('/api/v1/logout', {});
            return response.data;
        } catch (error) {
            console.error('Failed to logout:', error);
            // Don't throw error for logout - we still want to clear local state
            return { success: false, error: error.message };
        }
    }

    // Check if user is authenticated by making a test API call
    static async checkAuth() {
        try {
            const response = await apiClient.post('/api/v1/checkAuth', {});
            return response.data;
        } catch (error) {
            console.error('Auth check failed:', error);
            return { success: false, authenticated: false };
        }
    }
}

export default ApiService; 