import React, { useState, useEffect } from "react";
import "./Cloud.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { Local } from "../Storage/LocalStorage";
import ApiService from "../service/Apiservice";
import {
    IonIcon,
    IonModal,
    IonItem,
    IonButton,
    IonList,
    IonLabel,
    IonAlert,
    IonItemGroup,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonToast,
    IonLoading,
} from "@ionic/react";
import { fileTrayFull, trash, create, cloudUpload, close } from "ionicons/icons";

const Cloud: React.FC<{
    store: Local;
    file: string;
    updateSelectedFile: Function;
    updateBillType: Function;
}> = (props) => {
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'s3' | 'dropbox'>('s3');
    const [s3Files, setS3Files] = useState<{ [key: string]: number }>({});
    const [dropboxFiles, setDropboxFiles] = useState<{ [key: string]: number }>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [currentKey, setCurrentKey] = useState<string | null>(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Load files from S3 via API
    const loadFilesFromS3 = async () => {
        setLoading(true);
        try {
            const response = await ApiService.listAllS3();
            setS3Files(response.s3Files || {});
        } catch (err) {
            console.error('Failed to load files from S3', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else {
                setToastMessage('Failed to load files from S3');
            }
            setShowToast(true);
        }
        setLoading(false);
    };

    // Load files from Dropbox via API
    const loadFilesFromDropbox = async () => {
        setLoading(true);
        try {
            const response = await ApiService.listAllDropbox();
            setDropboxFiles(response.dropboxFiles || {});
        } catch (err) {
            console.error('Failed to load files from Dropbox', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else {
                setToastMessage('Failed to load files from Dropbox');
            }
            setShowToast(true);
        }
        setLoading(false);
    };

    // Switch tabs
    const switchTab = async (tab: 's3' | 'dropbox') => {
        setActiveTab(tab);
        if (tab === 's3' && Object.keys(s3Files).length === 0) {
            await loadFilesFromS3();
        } else if (tab === 'dropbox' && Object.keys(dropboxFiles).length === 0) {
            await loadFilesFromDropbox();
        }
    };

    // Get current files based on active tab
    const getCurrentFiles = () => {
        return activeTab === 's3' ? s3Files : dropboxFiles;
    };

    // Test API connection
    const testConnection = async () => {
        try {
            if (activeTab === 's3') {
                await ApiService.listAllS3();
                setToastMessage("S3 connection successful!");
            } else {
                await ApiService.listAllDropbox();
                setToastMessage("Dropbox connection successful!");
            }
            setShowToast(true);
        } catch (err) {
            console.error("Connection test failed:", err);
            if (err.response?.status === 401) {
                setToastMessage("Authentication failed. Please login and try again.");
            } else {
                const provider = activeTab === 's3' ? 'S3' : 'Dropbox';
                setToastMessage(`${provider} connection failed. Please check your configuration.`);
            }
            setShowToast(true);
        }
    };

    // Upload current invoice to cloud
    const uploadCurrentInvoice = async () => {
        const fileName = prompt('Enter filename for the current invoice (without extension):');

        if (!fileName) return;

        if (fileName.trim() === '') {
            setToastMessage('Please enter a valid filename');
            setShowToast(true);
            return;
        }

        setLoading(true);
        try {
            const currentData = AppGeneral.getSpreadsheetContent();
            const fullFileName = `${fileName.trim()}.txt`;

            const success = activeTab === 's3'
                ? await saveFileToS3(fullFileName, currentData)
                : await saveFileToDropbox(fullFileName, currentData);

            if (success) {
                const provider = activeTab === 's3' ? 'S3' : 'Dropbox';
                setToastMessage(`Invoice saved to ${provider} as "${fullFileName}"`);
                setShowToast(true);
            }
        } catch (err) {
            console.error('Failed to upload invoice', err);
            setToastMessage('Failed to upload invoice');
            setShowToast(true);
        }
        setLoading(false);
    };

    // Save file to S3 via API
    const saveFileToS3 = async (fileName: string, content: string): Promise<boolean> => {
        try {
            await ApiService.uploadFileS3(fileName, content);
            await loadFilesFromS3();
            return true;
        } catch (err) {
            console.error('Failed to save file to S3', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else {
                setToastMessage('Failed to save file to S3. Please try again.');
                setShowToast(true);
            }
            return false;
        }
    };

    // Save file to Dropbox via API
    const saveFileToDropbox = async (fileName: string, content: string): Promise<boolean> => {
        try {
            await ApiService.uploadFileDropbox(fileName, content);
            await loadFilesFromDropbox();
            return true;
        } catch (err) {
            console.error('Failed to save file to Dropbox', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 403) {
                setToastMessage('Permission denied. Your app may not have sufficient permissions.');
            } else if (err.response?.status === 400) {
                setToastMessage('Bad request. Please check the file name and content.');
            } else {
                setToastMessage('Failed to save file to Dropbox. Please try again.');
            }
            setShowToast(true);
            return false;
        }
    };

    // Edit file from cloud
    const editFile = async (key: string) => {
        setLoading(true);
        try {
            const fileData = activeTab === 's3'
                ? await getFileFromS3(key)
                : await getFileFromDropbox(key);

            if (fileData && fileData.content) {
                AppGeneral.viewFile(key, fileData.content);
                props.updateSelectedFile(key);
                setShowModal(false);
            } else {
                setToastMessage('Failed to load file');
                setShowToast(true);
            }
        } catch (err) {
            console.error('Error loading file:', err);
            setToastMessage('Failed to load file');
            setShowToast(true);
        }
        setLoading(false);
    };

    // Get file from S3 via API
    const getFileFromS3 = async (key: string) => {
        try {
            console.log("Getting file from S3 via API:", key);
            const response = await ApiService.getFileS3(key);
            console.log("S3 API response:", response);

            // Check if we have content in the response
            if (!response) {
                console.error("No response received from S3 API");
                throw new Error("No response received from S3 API");
            }

            // Handle different possible response formats - ApiService now returns FileContent directly
            let content = null;
            if (response.content !== undefined) {
                content = response.content;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                console.error("Unexpected response format:", response);
                throw new Error("Unexpected response format from S3 API");
            }

            if (content === null || content === undefined) {
                console.error("No content found in response");
                throw new Error("No file content received from S3");
            }

            console.log("Successfully extracted content, length:", content.length);

            return {
                content: content,
                modified: s3Files[key] || Date.now(),
                created: s3Files[key] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from S3', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in S3.');
                setShowToast(true);
            }
            return null;
        }
    };

    // Get file from Dropbox via API
    const getFileFromDropbox = async (fileName: string) => {
        try {
            console.log("Getting file from Dropbox via API:", fileName);
            const response = await ApiService.getFileDropbox(fileName);
            console.log("Dropbox API response:", response);

            // Check if we have content in the response
            if (!response) {
                console.error("No response received from Dropbox API");
                throw new Error("No response received from Dropbox API");
            }

            // Handle different possible response formats - ApiService now returns FileContent directly
            let content = null;
            if (response.content !== undefined) {
                content = response.content;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                console.error("Unexpected response format:", response);
                throw new Error("Unexpected response format from Dropbox API");
            }

            if (content === null || content === undefined) {
                console.error("No content found in response");
                throw new Error("No file content received from Dropbox");
            }

            console.log("Successfully extracted content, length:", content.length);

            return {
                content: content,
                modified: dropboxFiles[fileName] || Date.now(),
                created: dropboxFiles[fileName] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from Dropbox', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in Dropbox. The file may have been moved or deleted.');
            } else if (err.response?.status === 403) {
                setToastMessage('Permission denied. Your app may not have read access to this file.');
            } else {
                setToastMessage('Failed to load file from Dropbox. Please check the console for details.');
            }
            setShowToast(true);
            return null;
        }
    };

    // Delete file
    const deleteFile = (key: string) => {
        setCurrentKey(key);
        setAlertMessage(`Do you want to delete the ${key} file from ${activeTab === 's3' ? 'S3' : 'Dropbox'}?`);
        setShowAlert(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!currentKey) return;

        setLoading(true);
        const success = activeTab === 's3'
            ? await deleteFileFromS3(currentKey)
            : await deleteFileFromDropbox(currentKey);

        if (success) {
            setToastMessage('File deleted successfully');
            setShowToast(true);
            loadDefault();
        } else {
            setToastMessage('Failed to delete file');
            setShowToast(true);
        }

        setLoading(false);
        setCurrentKey(null);
    };

    // Delete from S3 via API
    const deleteFileFromS3 = async (key: string): Promise<boolean> => {
        try {
            await ApiService.deleteFileS3(key);
            await loadFilesFromS3();
            return true;
        } catch (err) {
            console.error('Failed to delete file from S3', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in S3.');
            } else {
                setToastMessage('Failed to delete file from S3. Please try again.');
            }
            setShowToast(true);
            return false;
        }
    };

    // Delete from Dropbox via API
    const deleteFileFromDropbox = async (fileName: string): Promise<boolean> => {
        try {
            await ApiService.deleteFileDropbox(fileName);
            await loadFilesFromDropbox();
            return true;
        } catch (err) {
            console.error('Failed to delete file from Dropbox', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in Dropbox.');
            } else {
                setToastMessage('Failed to delete file from Dropbox. Please try again.');
            }
            setShowToast(true);
            return false;
        }
    };

    const loadDefault = () => {
        const msc = DATA["home"]["default"]["msc"];
        AppGeneral.viewFile("default", JSON.stringify(msc));
        props.updateSelectedFile("default");
    };

    const _formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    // Load files when modal opens
    useEffect(() => {
        if (showModal) {
            if (activeTab === 's3') {
                loadFilesFromS3();
            } else {
                loadFilesFromDropbox();
            }
        }
    }, [showModal, activeTab]);

    // Get filtered files
    const files = getCurrentFiles();
    const filteredFiles = Object.keys(files).filter(key =>
        key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <React.Fragment>
            <IonIcon
                icon={fileTrayFull}
                className="ion-padding-end"
                slot="end"
                size="large"
                onClick={() => setShowModal(true)}
            />

            <IonModal
                isOpen={showModal}
                onDidDismiss={() => setShowModal(false)}
                className="cloud-modal"
            >
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Cloud Storage</IonTitle>
                        <IonButton
                            fill="clear"
                            slot="end"
                            onClick={() => setShowModal(false)}
                        >
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="cloud-content">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-button ${activeTab === 's3' ? 'active' : ''}`}
                            onClick={() => switchTab('s3')}
                            disabled={loading}
                        >
                            🗄️ S3
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'dropbox' ? 'active' : ''}`}
                            onClick={() => switchTab('dropbox')}
                            disabled={loading}
                        >
                            📦 Dropbox
                        </button>
                        <button
                            className="test-connection-btn"
                            onClick={testConnection}
                            disabled={loading}
                            title={`Test ${activeTab === 's3' ? 'S3' : 'Dropbox'} Connection`}
                        >
                            🔧 Test Connection
                        </button>
                    </div>

                    {/* Search and Upload */}
                    <div className="search-upload-container">
                        <IonButton
                            className="upload-button"
                            onClick={uploadCurrentInvoice}
                            disabled={loading}
                        >
                            <IonIcon icon={cloudUpload} slot="start" />
                            Upload Invoice
                        </IonButton>

                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="clear-search-btn"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    {/* File List */}
                    <div className="file-list-container">
                        {loading && (
                            <div className="loading-message">
                                Loading files from {activeTab === 's3' ? 'S3' : 'Dropbox'}...
                            </div>
                        )}

                        {!loading && filteredFiles.length === 0 && searchTerm && (
                            <div className="no-results-message">
                                No files found matching "{searchTerm}"
                            </div>
                        )}

                        {!loading && Object.keys(files).length === 0 && !searchTerm && (
                            <div className="no-files-message">
                                No files found in {activeTab === 's3' ? 'S3' : 'Dropbox'}
                            </div>
                        )}

                        {!loading && filteredFiles.length > 0 && (
                            <IonList className="file-list">
                                {filteredFiles.map((key) => (
                                    <IonItem key={key} className="file-item">
                                        <div className="file-info">
                                            <div className="file-name">{key}</div>
                                            <div className="file-date">
                                                {_formatDate(files[key])}
                                            </div>
                                        </div>

                                        <div className="file-actions">
                                            <IonIcon
                                                icon={create}
                                                color="warning"
                                                className="action-icon"
                                                onClick={() => editFile(key)}
                                            />
                                            <IonIcon
                                                icon={trash}
                                                color="danger"
                                                className="action-icon"
                                                onClick={() => deleteFile(key)}
                                            />
                                        </div>
                                    </IonItem>
                                ))}
                            </IonList>
                        )}
                    </div>

                    <IonButton
                        expand="block"
                        color="medium"
                        className="close-button"
                        onClick={() => setShowModal(false)}
                    >
                        Close
                    </IonButton>
                </IonContent>
            </IonModal>

            <IonAlert
                animated
                isOpen={showAlert}
                onDidDismiss={() => setShowAlert(false)}
                header="Delete file"
                message={alertMessage}
                buttons={[
                    { text: "No", role: "cancel" },
                    {
                        text: "Yes",
                        handler: confirmDelete,
                    },
                ]}
            />

            <IonToast
                isOpen={showToast}
                onDidDismiss={() => setShowToast(false)}
                message={toastMessage}
                duration={3000}
                position="bottom"
            />

            <IonLoading
                isOpen={loading}
                message="Processing..."
            />
        </React.Fragment>
    );
};

export default Cloud;
