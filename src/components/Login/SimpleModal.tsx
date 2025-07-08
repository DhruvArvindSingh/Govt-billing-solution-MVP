import React, { useState } from 'react';
import { IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { close } from 'ionicons/icons';
import ApiService from '../service/Apiservice';

interface LoginForm {
    email: string;
    password: string;
}

interface FormErrors {
    email: string;
    password: string;
}

interface SimpleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

const SimpleModal: React.FC<SimpleModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState<LoginForm>({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState<FormErrors>({
        email: '',
        password: ''
    });

    console.log('SimpleModal render - isOpen:', isOpen);

    if (!isOpen) return null;

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string): boolean => {
        return password.length >= 6;
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {
            email: '',
            password: ''
        };

        let isValid = true;

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
            isValid = false;
        }

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
            const response = await ApiService.signin({
                email: formData.email,
                password: formData.password
            });

            if (response.success) {
                alert('Successfully signed in!');
                onLoginSuccess();
                resetForm();
            } else {
                try {
                    const signupResponse = await ApiService.signup({
                        email: formData.email,
                        password: formData.password
                    });

                    if (signupResponse.success) {
                        alert('Account created and signed in successfully!');
                        onLoginSuccess();
                        resetForm();
                    } else {
                        alert(signupResponse.error || 'Login/Signup failed. Please try again.');
                    }
                } catch (signupError: any) {
                    console.error('Signup error:', signupError);
                    alert('Login/Signup failed. Please try again.');
                }
            }
        } catch (error: any) {
            console.error('Login error:', error);

            if (error.response?.status === 404 || error.response?.status === 401) {
                try {
                    const signupResponse = await ApiService.signup({
                        email: formData.email,
                        password: formData.password
                    });

                    if (signupResponse.success) {
                        alert('Account created and signed in successfully!');
                        onLoginSuccess();
                        resetForm();
                    } else {
                        alert('Account creation failed. Please try again.');
                    }
                } catch (signupError: any) {
                    console.error('Signup error:', signupError);
                    alert('Login/Signup failed. Please try again.');
                }
            } else {
                alert('Login failed. Please try again.');
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

    const modalStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999,
    };

    const contentStyle: React.CSSProperties = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        position: 'relative',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    };

    const closeButtonStyle: React.CSSProperties = {
        background: 'none',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '50%',
        color: '#666',
    };

    const formGroupStyle: React.CSSProperties = {
        marginBottom: '16px',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#333',
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        border: '2px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box',
    };

    const errorInputStyle: React.CSSProperties = {
        ...inputStyle,
        borderColor: '#ff6b6b',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
    };

    const errorMessageStyle: React.CSSProperties = {
        color: '#ff6b6b',
        fontSize: '12px',
        marginTop: '4px',
        fontWeight: '500',
        minHeight: '16px',
    };

    return (
        <div style={modalStyle} onClick={closeModal}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                <div style={headerStyle}>
                    <h2 style={{ margin: 0, color: '#3880ff' }}>Login / Sign Up</h2>
                    <button style={closeButtonStyle} onClick={closeModal}>
                        <IonIcon icon={close} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            style={errors.email ? errorInputStyle : inputStyle}
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="Enter your email"
                            disabled={loading}
                        />
                        <div style={errorMessageStyle}>{errors.email}</div>
                    </div>

                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Password</label>
                        <input
                            type="password"
                            style={errors.password ? errorInputStyle : inputStyle}
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="Enter your password"
                            disabled={loading}
                        />
                        <div style={errorMessageStyle}>{errors.password}</div>
                    </div>

                    <IonButton
                        expand="block"
                        type="submit"
                        disabled={loading}
                        style={{ marginTop: '16px' }}
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
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '12px',
                    }}>
                        <IonSpinner name="bubbles" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SimpleModal; 