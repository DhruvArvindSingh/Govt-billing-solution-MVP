import React from 'react';
import {
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonIcon,
    IonBadge
} from '@ionic/react';
import { download, refresh } from 'ionicons/icons';
import { useAccount } from 'wagmi';
import { useDatasets } from '../../hooks/useDatasets';
import { useSynapse } from '../../providers/SynapseProvider';
import './StoredTextsViewer.css';

export const StoredTextsViewer: React.FC = () => {
    const { isConnected } = useAccount();
    const { data: datasets, isLoading, refetch } = useDatasets();
    const { synapse } = useSynapse();

    const downloadText = async (pieceCid: string, pieceId: number) => {
        if (!synapse) return;

        try {
            const uint8ArrayBytes = await synapse.storage.download(pieceCid);
            const textContent = new TextDecoder().decode(uint8ArrayBytes);

            // Create and download file
            const blob = new Blob([textContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `filecoin-text-${pieceId}-${pieceCid.substring(0, 8)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download text:', error);
            alert('Failed to download text. Please try again.');
        }
    };

    if (!isConnected) {
        return (
            <div className="stored-texts-container">
                <IonCard>
                    <IonCardContent className="text-center">
                        <p>Please connect your wallet to view stored texts</p>
                    </IonCardContent>
                </IonCard>
            </div>
        );
    }

    return (
        <div className="stored-texts-container">
            <IonCard>
                <IonCardHeader>
                    <div className="header-container">
                        <IonCardTitle>Your Stored Texts on Filecoin</IonCardTitle>
                        <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => refetch()}
                            disabled={isLoading}
                        >
                            <IonIcon icon={refresh} />
                        </IonButton>
                    </div>
                </IonCardHeader>
                <IonCardContent>
                    {isLoading ? (
                        <div className="loading-container">
                            <IonSpinner name="crescent" />
                            <p>Loading your stored texts...</p>
                        </div>
                    ) : datasets?.datasets?.length > 0 ? (
                        <div className="datasets-container">
                            {datasets.datasets.map((dataset: any, index: number) => (
                                <IonCard key={dataset.clientDataSetId || index} className="dataset-card">
                                    <IonCardHeader>
                                        <div className="dataset-header">
                                            <div>
                                                <IonCardTitle className="dataset-title">
                                                    Dataset #{dataset.pdpVerifierDataSetId || 'Unknown'}
                                                </IonCardTitle>
                                                <p className="dataset-status">
                                                    Status: <IonBadge color={dataset.isLive ? "success" : "warning"}>
                                                        {dataset.isLive ? "Live" : "Inactive"}
                                                    </IonBadge>
                                                </p>
                                            </div>
                                            <IonBadge color="primary">
                                                {dataset.currentPieceCount || 0} pieces
                                            </IonBadge>
                                        </div>
                                    </IonCardHeader>

                                    {dataset.data?.pieces && dataset.data.pieces.length > 0 ? (
                                        <IonCardContent>
                                            <IonList>
                                                {dataset.data.pieces.map((piece: any, pieceIndex: number) => (
                                                    <IonItem key={piece.pieceId || pieceIndex} className="piece-item">
                                                        <IonLabel>
                                                            <h3>Piece #{piece.pieceId || pieceIndex + 1}</h3>
                                                            <p className="piece-cid">
                                                                {piece.pieceCid?.toString()?.substring(0, 30) || 'Unknown CID'}...
                                                            </p>
                                                            <p className="piece-date">
                                                                Added: {piece.addedAt ? new Date(piece.addedAt).toLocaleString() : 'Unknown date'}
                                                            </p>
                                                        </IonLabel>
                                                        <IonButton
                                                            fill="outline"
                                                            size="small"
                                                            onClick={() => downloadText(
                                                                piece.pieceCid?.toString() || '',
                                                                piece.pieceId || pieceIndex + 1
                                                            )}
                                                            disabled={!piece.pieceCid}
                                                        >
                                                            <IonIcon icon={download} slot="start" />
                                                            Download
                                                        </IonButton>
                                                    </IonItem>
                                                ))}
                                            </IonList>
                                        </IonCardContent>
                                    ) : (
                                        <IonCardContent>
                                            <p className="no-pieces-message">No text pieces found in this dataset</p>
                                        </IonCardContent>
                                    )}
                                </IonCard>
                            ))}
                        </div>
                    ) : (
                        <div className="no-data-container">
                            <p className="no-data-message">No stored texts found</p>
                            <p className="no-data-subtitle">Upload some text to Filecoin to see it here</p>
                        </div>
                    )}
                </IonCardContent>
            </IonCard>
        </div>
    );
};
