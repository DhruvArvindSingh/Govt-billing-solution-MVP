import React, { useState } from 'react';
import {
    IonButton,
    IonModal,
    IonContent,
    IonSpinner,
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle
} from '@ionic/react';
import { logIn, logOut, close } from 'ionicons/icons';
import ApiService from '../service/Apiservice';
import './Login.css';

interface LoginForm {
    email: string;
    password: string;
}

interface FormErrors {
    email: string;
    password: string;
}

interface LoginProps {
    slot?: string;
    isLoggedIn?: boolean;
    loading?: boolean;
    onLoginSuccess?: () => void;
    onLogout?: () => void;
}

const Login: React.FC<LoginProps> = ({
    slot,
    isLoggedIn = false,
    loading: externalLoading = false,
    onLoginSuccess,
    onLogout
}) => {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<LoginForm>({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState<FormErrors>({
        email: '',
        password: ''
    });

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 6; // Minimum 6 characters
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {
            email: '',
            password: ''
        };

        let isValid = true;

        // Validate email
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }

        // Validate password
        if (!formData.password.trim()) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (!validatePassword(formData.password)) {
            newErrors.password = 'Password must be at least 6 characters long';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleInputChange = (field: keyof LoginForm, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            console.log('Attempting login with server URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888');

            const response = await ApiService.signin({
                email: formData.email,
                password: formData.password
            });

            console.log('Login response:', response);

            if (response.success) {
                alert('Successfully signed in!');
                onLoginSuccess?.();
                closeModal();
            } else {
                alert(response.error || 'Login failed. Please try again.');
            }
        } catch (error: any) {
            console.error('Login error:', error);

            let errorMessage = 'Login failed. Please try again.';

            if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
                errorMessage = `Network Error: Cannot connect to server. Please check your internet connection.`;
            } else if (error.response?.status === 404) {
                errorMessage = 'Server endpoint not found. Please check server configuration.';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ email: '', password: '' });
        setErrors({ email: '', password: '' });
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleLoginClick = () => {
        console.log('Login button clicked, opening modal');
        setShowModal(true);
    };

    const handleLogout = () => {
        console.log('Logout button clicked');
        onLogout?.();
    };

    // Create the login modal content
    const createLoginModal = () => {
        return (
            <IonModal isOpen={showModal} onDidDismiss={closeModal} className="login-modal">
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Login / Sign Up</IonTitle>
                        <IonButton
                            fill="clear"
                            slot="end"
                            onClick={closeModal}
                        >
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="login-content">
                    <div className="form-container">
                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    className={`form-input ${errors.email ? 'error' : ''}`}
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="Enter your email"
                                    disabled={loading}
                                />
                                {errors.email && <div className="error-message">{errors.email}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    className={`form-input ${errors.password ? 'error' : ''}`}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="Enter your password"
                                    disabled={loading}
                                />
                                {errors.password && <div className="error-message">{errors.password}</div>}
                            </div>

                            <IonButton
                                expand="block"
                                type="submit"
                                className="login-submit-button"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <IonSpinner name="crescent" slot="start" />
                                        Processing...
                                    </>
                                ) : (
                                    'Login / Sign Up'
                                )}
                            </IonButton>
                        </form>

                        {loading && (
                            <div className="loading-overlay">
                                <IonSpinner name="bubbles" />
                            </div>
                        )}
                    </div>
                </IonContent>
            </IonModal>
        );
    };

    return (
        <React.Fragment>
            {isLoggedIn ? (
                <IonButton
                    fill="clear"
                    className="login-button"
                    onClick={handleLogout}
                    disabled={externalLoading}
                    slot={slot}
                >
                    <IonIcon icon={logOut} slot="start" />
                    {externalLoading ? <IonSpinner name="crescent" /> : 'Logout'}
                </IonButton>
            ) : (
                <IonButton
                    fill="clear"
                    className="login-button"
                    onClick={handleLoginClick}
                    slot={slot}
                >
                    <IonIcon icon={logIn} slot="start" />
                    Login
                </IonButton>
            )}

            {showModal && createLoginModal()}
        </React.Fragment>
    );
};

export default Login;
