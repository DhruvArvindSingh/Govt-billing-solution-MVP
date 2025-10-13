import React, { useState, useEffect } from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonSpinner, IonIcon, IonBadge } from '@ionic/react';
import { wallet, refresh, informationCircle } from 'ionicons/icons';
import { useAccount, useBalance } from 'wagmi';
import { useSynapse } from '../../providers/SynapseProvider';
import { FILECOIN_CONFIG, formatUSDFC } from '../../config/filecoin.config';
import './USDFCBalance.css';

export const USDFCBalance: React.FC = () => {
    const [balance, setBalance] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { isConnected, address } = useAccount();
    const { synapse } = useSynapse();

    // Also fetch balance using wagmi for comparison
    const { data: wagmiBalance, isLoading: wagmiLoading } = useBalance({
        address,
        token: FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS as `0x${string}`,
        chainId: FILECOIN_CONFIG.CHAIN_ID,
    });

    const fetchBalance = async () => {
        if (!synapse || !isConnected) return;

        setLoading(true);
        setError(null);

        try {
            console.log('Fetching USDFC balance...');
            console.log('Synapse instance:', synapse);
            console.log('Is connected:', isConnected);

            console.log('Synapse payments service:', synapse.payments);
            console.log('Synapse payments token address:', synapse.payments?.tokenAddress);
            console.log('Expected token address:', FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS);

            const userBalance = await synapse.payments.balance();
            console.log('Raw balance from Synapse API:', userBalance.toString());
            console.log('Raw balance type:', typeof userBalance);
            console.log('Raw balance is BigInt:', typeof userBalance === 'bigint');

            // Wagmi balance for comparison
            console.log('Wagmi balance data:', wagmiBalance);
            if (wagmiBalance) {
                console.log('Wagmi balance value:', wagmiBalance.value.toString());
                console.log('Wagmi balance formatted:', wagmiBalance.formatted);
                console.log('Wagmi balance decimals:', wagmiBalance.decimals);
            }

            // Try different formatting approaches to debug
            const balanceAsBigInt = BigInt(userBalance.toString());
            console.log('Synapse balance as BigInt:', balanceAsBigInt.toString());

            // Check if balance is already in USDFC units (6 decimals) vs wei (18 decimals)
            const balanceAssuming6Decimals = Number(balanceAsBigInt) / Math.pow(10, 6);
            const balanceAssuming18Decimals = Number(balanceAsBigInt) / Math.pow(10, 18);
            console.log('Synapse balance if 6 decimals:', balanceAssuming6Decimals);
            console.log('Synapse balance if 18 decimals:', balanceAssuming18Decimals);

            let finalBalance = formatUSDFC(userBalance);
            console.log('Synapse formatted balance:', finalBalance);

            // If wagmi balance is available and significantly different, use wagmi instead
            if (wagmiBalance && wagmiBalance.value) {
                const wagmiFormatted = wagmiBalance.formatted;
                console.log('Comparing balances - Synapse:', finalBalance, 'Wagmi:', wagmiFormatted);

                const synapseNum = parseFloat(finalBalance);
                const wagmiNum = parseFloat(wagmiFormatted);

                // If balances differ significantly, use wagmi balance
                if (Math.abs(synapseNum - wagmiNum) > 0.01) {
                    console.log('Balances differ significantly, using wagmi balance');
                    finalBalance = wagmiFormatted;
                }
            }

            setBalance(finalBalance);
        } catch (err: any) {
            console.error('Failed to fetch USDFC balance:', err);
            console.error('Error details:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });
            setError(`Failed to fetch balance: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isConnected && synapse) {
            fetchBalance();
        }
    }, [isConnected, synapse]);

    const copyTokenAddress = () => {
        navigator.clipboard.writeText(FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS);
        alert('USDFC token address copied to clipboard!');
    };

    if (!isConnected) {
        return (
            <IonCard className="usdfc-balance-card">
                <IonCardContent>
                    <p className="text-center">Connect your wallet to view USDFC balance</p>
                </IonCardContent>
            </IonCard>
        );
    }

    return (
        <IonCard className="usdfc-balance-card">
            <IonCardHeader>
                <IonCardTitle className="balance-title">
                    <IonIcon icon={wallet} />
                    USDFC Balance
                </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
                <div className="balance-container">
                    {loading ? (
                        <div className="balance-loading">
                            <IonSpinner name="crescent" />
                            <span>Loading balance...</span>
                        </div>
                    ) : error ? (
                        <div className="balance-error">
                            <span>{error}</span>
                            <IonButton fill="clear" size="small" onClick={fetchBalance}>
                                <IonIcon icon={refresh} />
                            </IonButton>
                        </div>
                    ) : (
                        <div className="balance-display">
                            <div className="balance-amount">
                                <IonBadge color={balance && parseFloat(balance) > 0 ? "success" : "warning"}>
                                    {balance || '0.000000'} USDFC
                                </IonBadge>
                            </div>
                            <IonButton fill="clear" size="small" onClick={fetchBalance}>
                                <IonIcon icon={refresh} />
                            </IonButton>
                        </div>
                    )}
                </div>

                {(balance !== null && parseFloat(balance) === 0) && (
                    <div className="no-balance-info">
                        <IonIcon icon={informationCircle} color="warning" />
                        <div className="info-content">
                            <p><strong>You need USDFC tokens to upload to Filecoin</strong></p>
                            <p>Your current balance is 0 USDFC. Get test tokens from the faucet:</p>
                            <div className="faucet-links">
                                <IonButton
                                    fill="outline"
                                    size="small"
                                    href={FILECOIN_CONFIG.FAUCET_URLS.FIL}
                                    target="_blank"
                                >
                                    Get Test FIL & USDFC
                                </IonButton>
                                <IonButton
                                    fill="outline"
                                    size="small"
                                    onClick={copyTokenAddress}
                                >
                                    Copy USDFC Address
                                </IonButton>
                                <IonButton
                                    fill="outline"
                                    size="small"
                                    href={FILECOIN_CONFIG.FAUCET_URLS.DOCS}
                                    target="_blank"
                                >
                                    Faucet Docs
                                </IonButton>
                            </div>
                            <div className="faucet-instructions">
                                <p><strong>How to get USDFC tokens:</strong></p>
                                <ol>
                                    <li>Click "Get Test FIL & USDFC" above</li>
                                    <li>Connect your wallet to the faucet</li>
                                    <li>Request both FIL and USDFC tokens</li>
                                    <li>Wait for the transaction to confirm</li>
                                    <li>Refresh balance here</li>
                                </ol>
                            </div>
                            <p className="token-address">
                                <small>USDFC Token: {FILECOIN_CONFIG.USDFC_TOKEN_ADDRESS}</small>
                            </p>
                        </div>
                    </div>
                )}
            </IonCardContent>
        </IonCard>
    );
};
