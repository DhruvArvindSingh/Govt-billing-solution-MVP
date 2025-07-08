import React from 'react';
import {
    IonButton,
    IonSpinner,
    IonIcon
} from '@ionic/react';
import { logIn, logOut } from 'ionicons/icons';
import './Login.css';

interface LoginProps {
    slot?: string;
    onLoginClick?: () => void;
    isLoggedIn?: boolean;
    loading?: boolean;
    onLogout?: () => void;
}

const Login: React.FC<LoginProps> = ({
    slot,
    onLoginClick,
    isLoggedIn = false,
    loading = false,
    onLogout
}) => {
    return (
        <>
            {isLoggedIn ? (
                <IonButton
                    fill="clear"
                    className="login-button"
                    onClick={() => {
                        console.log('Logout button clicked');
                        onLogout?.();
                    }}
                    disabled={loading}
                    slot={slot}
                >
                    <IonIcon icon={logOut} slot="start" />
                    {loading ? <IonSpinner name="crescent" /> : 'Logout'}
                </IonButton>
            ) : (
                <IonButton
                    fill="clear"
                    className="login-button"
                    onClick={() => {
                        console.log('Login button clicked, opening modal');
                        onLoginClick?.();
                    }}
                    slot={slot}
                >
                    <IonIcon icon={logIn} slot="start" />
                    Login
                </IonButton>
            )}
        </>
    );
};

export default Login;
