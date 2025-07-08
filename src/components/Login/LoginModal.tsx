import React, { useState } from 'react';
import {
    IonButton,
    IonModal,
    IonContent,
    IonSpinner,
    IonIcon
} from '@ionic/react';
import { close } from 'ionicons/icons';
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

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
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
            // Try to sign in first
            const response = await ApiService.signin({
                email: formData.email,
                password: formData.password
            });
            console.log('Login response:', response);

            if (response.success) {
                alert('Successfully signed in!');
                onLoginSuccess();
                closeModal();
            } else {
                // If signin fails, try signup
                try {
                    const signupResponse = await ApiService.signup({
                        email: formData.email,
                        password: formData.password
                    });

                    if (signupResponse.success) {
                        alert('Account created and signed in successfully!');
                        onLoginSuccess();
                        closeModal();
                    } else {
                        alert(signupResponse.error || 'Login/Signup failed. Please try again.');
                    }
                } catch (signupError: any) {
                    console.error('Signup error:', signupError);
                    alert(signupError.response?.data?.message || signupError.message || 'Login/Signup failed. Please try again.');
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);

            // If signin fails with 404 or 401, it might mean user doesn't exist, so try signup
            if (error.response?.status === 404 || error.response?.status === 401) {
                try {
                    const signupResponse = await ApiService.signup({
                        email: formData.email,
                        password: formData.password
                    });

                    if (signupResponse.success) {
                        alert('Account created and signed in successfully!');
                        onLoginSuccess();
                        closeModal();
                    } else {
                        alert(signupResponse.error || 'Account creation failed. Please try again.');
                    }
                } catch (signupError: any) {
                    console.error('Signup error:', signupError);
                    alert(signupError.response?.data?.message || signupError.message || 'Login/Signup failed. Please try again.');
                }
            } else {
                alert(error.response?.data?.message || error.message || 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ email: '', password: '' });
        setErrors({ email: '', password: '' });
    };

    const closeModal = () => {
        onClose();
        resetForm();
    };

    console.log('LoginModal render - isOpen:', isOpen);

    return (
        <IonModal
            isOpen={isOpen}
            onDidDismiss={closeModal}
            className="login-modal"
            showBackdrop={true}
            backdropDismiss={true}
            onDidPresent={() => console.log('LoginModal presented')}
            onWillPresent={() => console.log('LoginModal will present')}
            presentingElement={document.querySelector('ion-app') || undefined}
        >
            <IonContent className="login-content">
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    maxWidth: '400px',
                    margin: '50px auto',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    <div className="form-container">
                        <div className="login-header">
                            <h2 className="login-title">Login / Sign Up</h2>
                            <button className="close-button" onClick={closeModal}>
                                <IonIcon icon={close} />
                            </button>
                        </div>

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
                                <div className="error-message">{errors.email}</div>
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
                                <div className="error-message">{errors.password}</div>
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
                </div>
            </IonContent>
        </IonModal>
    );
};

export default LoginModal; 