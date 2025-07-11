// Auto-save configuration for production
export const AUTO_SAVE_CONFIG = {
    // Debounce delay in milliseconds (time to wait after last edit before saving)
    DEBOUNCE_DELAY: 3000, // 3 seconds - increased from 2s for better performance

    // Status display duration in milliseconds
    SAVED_STATUS_DURATION: 2000, // 2 seconds
    ERROR_STATUS_DURATION: 5000, // 5 seconds

    // Maximum retry attempts for failed saves
    MAX_RETRY_ATTEMPTS: 3,

    // Retry delay in milliseconds
    RETRY_DELAY: 1000, // 1 second

    // Files to exclude from auto-save
    EXCLUDED_FILES: ['default', 'template', 'untitled'],

    // Enable/disable auto-save (can be controlled by user preference)
    ENABLED: true,

    // User preference key for localStorage
    USER_PREFERENCE_KEY: 'autosave-enabled',

    // Minimum time between saves to prevent excessive saving
    MIN_SAVE_INTERVAL: 1000, // 1 second
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'development') {
    // Shorter delays for development
    AUTO_SAVE_CONFIG.DEBOUNCE_DELAY = 2000;
    AUTO_SAVE_CONFIG.SAVED_STATUS_DURATION = 1500;
}

// Utility function to check if auto-save is enabled based on user preference
export const isAutoSaveEnabled = (): boolean => {
    try {
        const userPreference = localStorage.getItem(AUTO_SAVE_CONFIG.USER_PREFERENCE_KEY);
        if (userPreference !== null) {
            return userPreference === 'true';
        }
    } catch (error) {
        // Silently fail and use default
    }
    return AUTO_SAVE_CONFIG.ENABLED;
};

// Utility function to set user preference
export const setAutoSaveEnabled = (enabled: boolean): void => {
    try {
        localStorage.setItem(AUTO_SAVE_CONFIG.USER_PREFERENCE_KEY, enabled.toString());
    } catch (error) {
        // Silently fail
    }
};

export default AUTO_SAVE_CONFIG; 