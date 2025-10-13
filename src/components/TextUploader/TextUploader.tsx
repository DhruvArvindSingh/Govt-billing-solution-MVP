import React, { useState } from 'react';
import { IonButton, IonTextarea, IonItem, IonLabel, IonProgressBar, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';
import { useAccount } from 'wagmi';
import { useTextUpload } from '../../hooks/useTextUpload';
import { USDFCBalance } from '../USDFCBalance';
import { NetworkChecker } from '../NetworkChecker';
import './TextUploader.css';

export const TextUploader: React.FC = () => {
    const [textContent, setTextContent] = useState("");
    const { isConnected } = useAccount();
    const { uploadTextMutation, progress, status, uploadedInfo, handleReset } = useTextUpload();

    const handleUpload = async () => {
        if (!textContent.trim()) return;
        await uploadTextMutation.mutateAsync(textContent);
    };

    const resetForm = () => {
        setTextContent("");
        handleReset();
    };

    if (!isConnected) {
        return (
            <div className="text-uploader-container">
                <IonCard>
                    <IonCardContent className="text-center">
                        <p>Please connect your wallet to upload text to Filecoin</p>
                    </IonCardContent>
                </IonCard>
            </div>
        );
    }

    return (
        <div className="text-uploader-container">
            {/* Network Checker */}
            <NetworkChecker />

            {/* USDFC Balance Display */}
            <USDFCBalance />

            <IonCard>
                <IonCardHeader>
                    <IonCardTitle>Upload Text to Filecoin</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                    <IonItem>
                        <IonLabel position="stacked">Enter text to store on Filecoin:</IonLabel>
                        <IonTextarea
                            value={textContent}
                            onIonInput={(e) => setTextContent(e.detail.value!)}
                            placeholder="Type your text here..."
                            rows={6}
                            disabled={uploadTextMutation.isPending}
                            className="text-input"
                        />
                    </IonItem>

                    <div className="text-stats">
                        <p>Characters: {textContent.length} | Bytes: {new TextEncoder().encode(textContent).length}</p>
                    </div>

                    <div className="button-container">
                        <IonButton
                            expand="block"
                            onClick={handleUpload}
                            disabled={!textContent.trim() || uploadTextMutation.isPending}
                            color="primary"
                        >
                            {uploadTextMutation.isPending ? "Uploading..." : "Upload to Filecoin"}
                        </IonButton>

                        <IonButton
                            expand="block"
                            fill="outline"
                            onClick={resetForm}
                            disabled={uploadTextMutation.isPending}
                            color="medium"
                        >
                            Reset
                        </IonButton>
                    </div>

                    {/* Progress and Status Display */}
                    {status && (
                        <div className="status-container">
                            <p className="status-text">{status}</p>
                            {uploadTextMutation.isPending && (
                                <IonProgressBar value={progress / 100} className="progress-bar" />
                            )}
                        </div>
                    )}

                    {/* Upload Success Info */}
                    {uploadedInfo && (
                        <IonCard className="success-card">
                            <IonCardHeader>
                                <IonCardTitle color="success">Upload Successful!</IonCardTitle>
                            </IonCardHeader>
                            <IonCardContent>
                                <div className="upload-info">
                                    <p><strong>Text Preview:</strong> {uploadedInfo.textContent}</p>
                                    <p><strong>Size:</strong> {uploadedInfo.textSize} bytes</p>
                                    <p><strong>Piece CID:</strong> <code className="cid-text">{uploadedInfo.pieceCid}</code></p>
                                    {uploadedInfo.txHash && (
                                        <p><strong>Transaction:</strong> <code className="tx-text">{uploadedInfo.txHash}</code></p>
                                    )}
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Error Display */}
                    {uploadTextMutation.isError && (
                        <IonCard className="error-card">
                            <IonCardContent>
                                <p className="error-text">
                                    Upload failed: {uploadTextMutation.error?.message}
                                </p>
                            </IonCardContent>
                        </IonCard>
                    )}
                </IonCardContent>
            </IonCard>
        </div>
    );
};
