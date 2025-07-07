import React, { useState, useEffect } from "react";
import "./Cloud.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { Local } from "../Storage/LocalStorage";
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
import {
    S3Client,
    PutObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Dropbox } from 'dropbox';

// Environment variables for AWS and Dropbox
const REGION = import.meta.env.VITE_REGION;
const BUCKET = import.meta.env.VITE_BUCKET;
const ACCESS_KEY = import.meta.env.VITE_ACCESS_KEY;
const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;
const DROPBOX_ACCESS_TOKEN = import.meta.env.VITE_DROPBOX_ACCESS_TOKEN;

// Initialize S3 client
const s3 = ACCESS_KEY && SECRET_KEY ? new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
    },
}) : null;

// Initialize Dropbox client
const dropbox = DROPBOX_ACCESS_TOKEN ? new Dropbox({
    accessToken: DROPBOX_ACCESS_TOKEN,
    fetch: fetch
}) : null;

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

    // Load files from S3
    const loadFilesFromS3 = async () => {
        if (!s3 || !BUCKET) {
            setToastMessage('S3 configuration missing');
            setShowToast(true);
            return;
        }

        setLoading(true);
        try {
            const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET }));
            const contents = data.Contents || [];

            const filesObj: { [key: string]: number } = {};
            contents.forEach(file => {
                if (file.Key && file.LastModified) {
                    filesObj[file.Key] = file.LastModified.getTime();
                }
            });

            setS3Files(filesObj);
        } catch (err) {
            console.error('Failed to load files from S3', err);
            setToastMessage('Failed to load files from S3');
            setShowToast(true);
        }
        setLoading(false);
    };

    // Load files from Dropbox
    const loadFilesFromDropbox = async () => {
        if (!dropbox) {
            setToastMessage('Dropbox configuration missing');
            setShowToast(true);
            return;
        }

        setLoading(true);
        try {
            const response = await dropbox.filesListFolder({ path: '' });
            const files = response.result.entries || [];

            const filesObj: { [key: string]: number } = {};
            files.forEach(file => {
                if (file['.tag'] === 'file') {
                    filesObj[file.name] = new Date(file.client_modified).getTime();
                }
            });

            setDropboxFiles(filesObj);
        } catch (err) {
            console.error('Failed to load files from Dropbox', err);
            setToastMessage('Failed to load files from Dropbox');
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

    // Save file to S3
    const saveFileToS3 = async (fileName: string, content: string): Promise<boolean> => {
        if (!s3 || !BUCKET) return false;

        try {
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: fileName,
                Body: content,
                ContentType: 'text/plain'
            }));

            await loadFilesFromS3();
            return true;
        } catch (err) {
            console.error('Failed to save file to S3', err);
            return false;
        }
    };

    // Save file to Dropbox
    const saveFileToDropbox = async (fileName: string, content: string): Promise<boolean> => {
        if (!dropbox) return false;

        try {
            const encoder = new TextEncoder();
            const contentBuffer = encoder.encode(content);

            await dropbox.filesUpload({
                path: `/${fileName}`,
                contents: contentBuffer,
                mode: { '.tag': 'overwrite' },
                autorename: true
            });

            await loadFilesFromDropbox();
            return true;
        } catch (err) {
            console.error('Failed to save file to Dropbox', err);
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

    // Get file from S3
    const getFileFromS3 = async (key: string) => {
        if (!s3 || !BUCKET) return null;

        try {
            const response = await s3.send(new GetObjectCommand({
                Bucket: BUCKET,
                Key: key,
            }));

            const content = await response.Body?.transformToString();
            return {
                content: content || '',
                modified: s3Files[key] || Date.now(),
                created: s3Files[key] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from S3', err);
            return null;
        }
    };

    // Get file from Dropbox
    const getFileFromDropbox = async (fileName: string) => {
        if (!dropbox) return null;

        try {
            const response = await dropbox.filesDownload({ path: `/${fileName}` });
            let fileBinary = (response.result as any).fileBinary || (response.result as any).fileBlob;

            if (!fileBinary) {
                throw new Error('No file content received from Dropbox');
            }

            let content: string;
            if (fileBinary instanceof ArrayBuffer) {
                const decoder = new TextDecoder();
                content = decoder.decode(fileBinary);
            } else if (fileBinary instanceof Blob) {
                content = await fileBinary.text();
            } else if (typeof fileBinary === 'string') {
                content = fileBinary;
            } else if (fileBinary && typeof fileBinary.arrayBuffer === 'function') {
                const arrayBuffer = await fileBinary.arrayBuffer();
                const decoder = new TextDecoder();
                content = decoder.decode(arrayBuffer);
            } else {
                throw new Error('Unexpected file format received from Dropbox');
            }

            return {
                content: content,
                modified: dropboxFiles[fileName] || Date.now(),
                created: dropboxFiles[fileName] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from Dropbox', err);
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

    // Delete from S3
    const deleteFileFromS3 = async (key: string): Promise<boolean> => {
        if (!s3 || !BUCKET) return false;

        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: key
            }));

            await loadFilesFromS3();
            return true;
        } catch (err) {
            console.error('Failed to delete file from S3', err);
            return false;
        }
    };

    // Delete from Dropbox
    const deleteFileFromDropbox = async (fileName: string): Promise<boolean> => {
        if (!dropbox) return false;

        try {
            await dropbox.filesDeleteV2({ path: `/${fileName}` });
            await loadFilesFromDropbox();
            return true;
        } catch (err) {
            console.error('Failed to delete file from Dropbox', err);
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
