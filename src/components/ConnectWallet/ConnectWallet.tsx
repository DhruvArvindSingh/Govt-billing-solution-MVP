import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { wallet } from 'ionicons/icons';
import { ConnectButton } from "@rainbow-me/rainbowkit";
import './ConnectWallet.css';

interface ConnectWalletProps {
    slot?: string;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ slot }) => {
    return (
        <div className="connect-wallet-wrapper" slot={slot}>
            <ConnectButton.Custom>
                {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    openConnectModal,
                    authenticationStatus,
                    mounted,
                }) => {
                    // Note: If your app doesn't use authentication, you
                    // can remove all 'authenticationStatus' checks
                    const ready = mounted && authenticationStatus !== 'loading';
                    const connected =
                        ready &&
                        account &&
                        chain &&
                        (!authenticationStatus ||
                            authenticationStatus === 'authenticated');

                    return (
                        <div
                            {...(!ready && {
                                'aria-hidden': true,
                                'style': {
                                    opacity: 0,
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                },
                            })}
                        >
                            {(() => {
                                if (!connected) {
                                    return (
                                        <IonButton
                                            fill="clear"
                                            className="connect-wallet-button"
                                            onClick={openConnectModal}
                                        >
                                            <IonIcon icon={wallet} slot="start" />
                                            Connect Wallet
                                        </IonButton>
                                    );
                                }

                                if (chain.unsupported) {
                                    return (
                                        <IonButton
                                            fill="clear"
                                            className="connect-wallet-button wrong-network"
                                            onClick={openChainModal}
                                        >
                                            <IonIcon icon={wallet} slot="start" />
                                            Wrong network
                                        </IonButton>
                                    );
                                }

                                return (
                                    <div className="connected-wallet-container">
                                        <IonButton
                                            fill="clear"
                                            className="connect-wallet-button chain-button"
                                            onClick={openChainModal}
                                            style={{ marginRight: '8px' }}
                                        >
                                            {chain.hasIcon && (
                                                <div
                                                    style={{
                                                        background: chain.iconBackground,
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 999,
                                                        overflow: 'hidden',
                                                        marginRight: 4,
                                                    }}
                                                >
                                                    {chain.iconUrl && (
                                                        <img
                                                            alt={chain.name ?? 'Chain icon'}
                                                            src={chain.iconUrl}
                                                            style={{ width: 16, height: 16 }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            {chain.name}
                                        </IonButton>

                                        <IonButton
                                            fill="clear"
                                            className="connect-wallet-button account-button"
                                            onClick={openAccountModal}
                                        >
                                            <IonIcon icon={wallet} slot="start" />
                                            {account.displayName}
                                            {account.displayBalance
                                                ? ` (${account.displayBalance})`
                                                : ''}
                                        </IonButton>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                }}
            </ConnectButton.Custom>
        </div>
    );
};

export default ConnectWallet;
