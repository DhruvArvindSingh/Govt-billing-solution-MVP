// Environment configuration for the application
// This ensures environment variables are properly accessible in both web and mobile builds

interface EnvironmentConfig {
    API_BASE_URL: string;
    APP_NAME: string;
    ENVIRONMENT: string;
    GMAIL_API_KEY: string;
    GMAIL_CLIENT_ID: string;
}

// Get environment variables with fallbacks
const getEnvironmentConfig = (): EnvironmentConfig => {
    // For Vite builds (web and mobile), use import.meta.env
    const config: EnvironmentConfig = {
        API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://3.110.136.65',
        APP_NAME: import.meta.env.VITE_APP_NAME || 'Government Billing Solution',
        ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || 'development',
        GMAIL_API_KEY: import.meta.env.VITE_GMAIL_API_KEY || '',
        GMAIL_CLIENT_ID: import.meta.env.VITE_GMAIL_CLIENT_ID || ''
    };

    // Log configuration for debugging (only in development)
    if (config.ENVIRONMENT === 'development') {
        console.log('Environment Configuration:', {
            API_BASE_URL: config.API_BASE_URL,
            APP_NAME: config.APP_NAME,
            ENVIRONMENT: config.ENVIRONMENT
        });
    }

    return config;
};

// Export the configuration
export const ENV_CONFIG = getEnvironmentConfig();

// Export individual values for convenience
export const API_BASE_URL = ENV_CONFIG.API_BASE_URL;
export const APP_NAME = ENV_CONFIG.APP_NAME;
export const ENVIRONMENT = ENV_CONFIG.ENVIRONMENT;
export const GMAIL_API_KEY = ENV_CONFIG.GMAIL_API_KEY;
export const GMAIL_CLIENT_ID = ENV_CONFIG.GMAIL_CLIENT_ID;

// Utility function to check if we're running in mobile app
export const isMobileApp = (): boolean => {
    return !!(window as any).Capacitor;
};

// Utility function to check if we're in development
export const isDevelopment = (): boolean => {
    return ENVIRONMENT === 'development';
};

export default ENV_CONFIG;
