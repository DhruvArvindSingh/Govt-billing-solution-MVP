import React from 'react';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/react';
import { warning, checkmark } from 'ionicons/icons';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { FILECOIN_CONFIG } from '../../config/filecoin.config';
import './NetworkChecker.css';

export const NetworkChecker: React.FC = () => {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    if (!isConnected) {
        return null;
    }

    const isCorrectNetwork = chainId === FILECOIN_CONFIG.CHAIN_ID;

    if (isCorrectNetwork) {
        return (
            <IonCard className="network-checker-card success">
                <IonCardContent>
                    <div className="network-status">
                        <IonIcon icon={checkmark} color="success" />
                        <span>Connected to {FILECOIN_CONFIG.NETWORK_NAME}</span>
                    </div>
                </IonCardContent>
            </IonCard>
        );
    }

    return (
        <IonCard className="network-checker-card warning">
            <IonCardContent>
                <div className="network-warning">
                    <IonIcon icon={warning} color="warning" />
                    <div className="warning-content">
                        <p><strong>Wrong Network</strong></p>
                        <p>Please switch to {FILECOIN_CONFIG.NETWORK_NAME} to use Filecoin features.</p>
                        <p><small>Current Chain ID: {chainId} | Required: {FILECOIN_CONFIG.CHAIN_ID}</small></p>
                        <IonButton
                            size="small"
                            color="warning"
                            onClick={() => switchChain({ chainId: FILECOIN_CONFIG.CHAIN_ID })}
                        >
                            Switch to {FILECOIN_CONFIG.NETWORK_NAME}
                        </IonButton>
                    </div>
                </div>
            </IonCardContent>
        </IonCard>
    );
};
