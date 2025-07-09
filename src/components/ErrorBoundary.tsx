import React, { Component, ErrorInfo } from 'react';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonText } from '@ionic/react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to monitoring service in production
        console.error('Application Error:', error, errorInfo);
    }

    handleRefresh = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <IonPage>
                    <IonHeader>
                        <IonToolbar>
                            <IonTitle>Application Error</IonTitle>
                        </IonToolbar>
                    </IonHeader>
                    <IonContent className="ion-padding">
                        <div style={{ textAlign: 'center', marginTop: '50px' }}>
                            <IonText color="danger">
                                <h2>Something went wrong</h2>
                            </IonText>
                            <p>We apologize for the inconvenience. The application encountered an unexpected error.</p>
                            <p>Please try refreshing the page or contact support if the problem persists.</p>

                            <IonButton
                                expand="block"
                                color="primary"
                                onClick={this.handleRefresh}
                                style={{ marginTop: '20px', maxWidth: '300px', margin: '20px auto' }}
                            >
                                Refresh Application
                            </IonButton>

                            {process.env.NODE_ENV === 'development' && (
                                <details style={{ marginTop: '20px', textAlign: 'left' }}>
                                    <summary>Error Details (Development Only)</summary>
                                    <pre style={{
                                        background: '#f5f5f5',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        overflow: 'auto',
                                        marginTop: '10px'
                                    }}>
                                        {this.state.error?.stack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </IonContent>
                </IonPage>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 