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
import { cloud, trash, create, cloudUpload, close } from "ionicons/icons";
import { File } from "../Storage/LocalStorage";

interface FileSelection {
    [key: string]: boolean;
}

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
    const [selectedCloudFiles, setSelectedCloudFiles] = useState<FileSelection>({});
    const [selectedLocalFiles, setSelectedLocalFiles] = useState<FileSelection>({});
    const [localFiles, setLocalFiles] = useState<{ [key: string]: number }>({});
    const [showBatchMode, setShowBatchMode] = useState(false);
    const [showMoveAlert, setShowMoveAlert] = useState(false);
    const [moveOperation, setMoveOperation] = useState<'toLocal' | 'toServer' | null>(null);
    const [conflictFiles, setConflictFiles] = useState<string[]>([]);
    const [currentMoveFile, setCurrentMoveFile] = useState<string | null>(null);

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

    // Load files from local storage
    const loadLocalFiles = async () => {
        try {
            const files = await props.store._getAllFiles();
            setLocalFiles(files);
        } catch (err) {
            console.error('Failed to load local files', err);
            setToastMessage('Failed to load local files');
            setShowToast(true);
        }
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

                // Save as last opened file
                props.store._saveLastOpenedFile(key).catch(error => {
                    console.error('Error saving last opened filename:', error);
                });

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

    // File selection helper functions
    const getSelectedCloudFiles = () => {
        return Object.keys(selectedCloudFiles).filter(key => selectedCloudFiles[key] && key !== 'default');
    };

    const getSelectedLocalFiles = () => {
        return Object.keys(selectedLocalFiles).filter(key => selectedLocalFiles[key] && key !== 'default');
    };

    const hasSelectedCloudFiles = () => {
        return getSelectedCloudFiles().length > 0;
    };

    const hasSelectedLocalFiles = () => {
        return getSelectedLocalFiles().length > 0;
    };

    const toggleCloudFileSelection = (key: string) => {
        setSelectedCloudFiles(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const toggleLocalFileSelection = (key: string) => {
        setSelectedLocalFiles(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const selectAllCloudFiles = (selectAll: boolean) => {
        const files = getCurrentFiles();
        const newSelection: FileSelection = {};
        Object.keys(files).forEach(key => {
            if (key !== 'default') {
                newSelection[key] = selectAll;
            }
        });
        setSelectedCloudFiles(newSelection);
    };

    const selectAllLocalFiles = (selectAll: boolean) => {
        const newSelection: FileSelection = {};
        Object.keys(localFiles).forEach(key => {
            if (key !== 'default') {
                newSelection[key] = selectAll;
            }
        });
        setSelectedLocalFiles(newSelection);
    };

    // Check if file exists locally
    const isFileExistsLocally = (filename: string): boolean => {
        return Object.keys(localFiles).includes(filename);
    };

    // Check if file exists in cloud
    const isFileExistsInCloud = (filename: string): boolean => {
        const files = getCurrentFiles();
        return Object.keys(files).includes(filename);
    };

    // Move selected local files to server
    const moveToServer = async () => {
        const selectedFiles = getSelectedLocalFiles();
        if (selectedFiles.length === 0) {
            setToastMessage('No files selected for upload');
            setShowToast(true);
            return;
        }

        // Check for conflicts (files that already exist in cloud)
        const conflicts = selectedFiles.filter(filename => isFileExistsInCloud(filename));
        if (conflicts.length > 0) {
            setConflictFiles(conflicts);
            setMoveOperation('toServer');
            setAlertMessage(`${conflicts.length} file(s) already exist in ${activeTab.toUpperCase()}. Overwrite existing files?`);
            setShowMoveAlert(true);
            return;
        }

        await executeServerUpload(selectedFiles);
    };

    // Execute server upload for selected files
    const executeServerUpload = async (fileNames: string[]) => {
        setLoading(true);
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const fileName of fileNames) {
                try {
                    const fileData = await props.store._getFile(fileName);
                    const content = fileData.content;

                    const success = activeTab === 's3'
                        ? await saveFileToS3(fileName, decodeURIComponent(content))
                        : await saveFileToDropbox(fileName, decodeURIComponent(content));

                    if (success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error uploading ${fileName}:`, error);
                    errorCount++;
                }
            }

            // Clear selections
            setSelectedLocalFiles({});

            // Show result message
            if (successCount > 0 && errorCount === 0) {
                setToastMessage(`Successfully uploaded ${successCount} file(s) to ${activeTab.toUpperCase()}`);
            } else if (successCount > 0 && errorCount > 0) {
                setToastMessage(`Uploaded ${successCount} file(s), ${errorCount} failed`);
            } else {
                setToastMessage(`Failed to upload files to ${activeTab.toUpperCase()}`);
            }
            setShowToast(true);

        } catch (error) {
            console.error('Batch upload error:', error);
            setToastMessage('Error during batch upload');
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    // Move selected cloud files to local storage
    const moveToLocal = async () => {
        const selectedFiles = getSelectedCloudFiles();
        if (selectedFiles.length === 0) {
            setToastMessage('No files selected for download');
            setShowToast(true);
            return;
        }

        // Check for conflicts (files that already exist locally)
        const conflicts = selectedFiles.filter(filename => isFileExistsLocally(filename));
        if (conflicts.length > 0) {
            setConflictFiles(conflicts);
            setMoveOperation('toLocal');
            setAlertMessage(`${conflicts.length} file(s) already exist locally. Overwrite existing files?`);
            setShowMoveAlert(true);
            return;
        }

        await executeLocalDownload(selectedFiles);
    };

    // Execute local download for selected files
    const executeLocalDownload = async (fileNames: string[]) => {
        setLoading(true);
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const fileName of fileNames) {
                try {
                    const success = await downloadAndSaveFile(fileName);
                    if (success) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error downloading ${fileName}:`, error);
                    errorCount++;
                }
            }

            // Refresh local files list and clear selections
            await loadLocalFiles();
            setSelectedCloudFiles({});

            // Show result message
            if (successCount > 0 && errorCount === 0) {
                setToastMessage(`Successfully downloaded ${successCount} file(s) from ${activeTab.toUpperCase()}`);
            } else if (successCount > 0 && errorCount > 0) {
                setToastMessage(`Downloaded ${successCount} file(s), ${errorCount} failed`);
            } else {
                setToastMessage(`Failed to download files from ${activeTab.toUpperCase()}`);
            }
            setShowToast(true);

        } catch (error) {
            console.error('Batch download error:', error);
            setToastMessage('Error during batch download');
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    // Helper method to download and save a single file
    const downloadAndSaveFile = async (filename: string): Promise<boolean> => {
        try {
            const fileData = activeTab === 's3'
                ? await getFileFromS3(filename)
                : await getFileFromDropbox(filename);

            if (!fileData || !fileData.content) {
                return false;
            }

            // Create a new File object for local storage
            const file = new File(
                new Date().toString(), // created
                new Date().toString(), // modified
                encodeURIComponent(fileData.content), // content (encode for storage)
                filename, // name
                1 // billType - default value
            );

            await props.store._saveFile(file);
            return true;
        } catch (error) {
            console.error(`Error downloading file ${filename}:`, error);
            return false;
        }
    };

    // Load files when modal opens
    useEffect(() => {
        if (showModal) {
            loadLocalFiles(); // Always load local files when modal opens
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

    // Check if user is authenticated before opening cloud modal
    const handleCloudClick = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setToastMessage('Please sign in first to access cloud storage');
            setShowToast(true);
            return;
        }
        setShowModal(true);
    };

    // Create the cloud page content
    const createCloudPage = () => {
        return (
            <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} className="cloud-modal">
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

                        <IonButton
                            className="batch-mode-button"
                            fill={showBatchMode ? "solid" : "outline"}
                            onClick={() => setShowBatchMode(!showBatchMode)}
                            disabled={loading}
                        >
                            {showBatchMode ? 'Exit Batch' : 'Batch Mode'}
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

                    {/* Batch Operations Panel */}
                    {showBatchMode && (
                        <div className="batch-operations-panel">
                            <div className="batch-section">
                                <div className="batch-header">
                                    <h4>Local Files ({Object.keys(localFiles).filter(key => key !== 'default').length})</h4>
                                    <div className="batch-controls">
                                        <IonButton
                                            size="small"
                                            fill="clear"
                                            onClick={() => selectAllLocalFiles(true)}
                                            disabled={loading}
                                        >
                                            Select All
                                        </IonButton>
                                        <IonButton
                                            size="small"
                                            fill="clear"
                                            onClick={() => selectAllLocalFiles(false)}
                                            disabled={loading}
                                        >
                                            Clear All
                                        </IonButton>
                                        <IonButton
                                            size="small"
                                            color="primary"
                                            onClick={moveToServer}
                                            disabled={!hasSelectedLocalFiles() || loading}
                                        >
                                            Upload to {activeTab.toUpperCase()} ({getSelectedLocalFiles().length})
                                        </IonButton>
                                    </div>
                                </div>
                                <div className="local-files-list">
                                    {Object.keys(localFiles)
                                        .filter(key => key !== 'default' && key.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(key => (
                                            <div key={key} className="batch-file-item">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLocalFiles[key] || false}
                                                    onChange={() => toggleLocalFileSelection(key)}
                                                    disabled={loading}
                                                />
                                                <span className="file-name">{key}</span>
                                                <span className="file-date">{_formatDate(localFiles[key])}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="batch-section">
                                <div className="batch-header">
                                    <h4>{activeTab.toUpperCase()} Files ({filteredFiles.length})</h4>
                                    <div className="batch-controls">
                                        <IonButton
                                            size="small"
                                            fill="clear"
                                            onClick={() => selectAllCloudFiles(true)}
                                            disabled={loading}
                                        >
                                            Select All
                                        </IonButton>
                                        <IonButton
                                            size="small"
                                            fill="clear"
                                            onClick={() => selectAllCloudFiles(false)}
                                            disabled={loading}
                                        >
                                            Clear All
                                        </IonButton>
                                        <IonButton
                                            size="small"
                                            color="secondary"
                                            onClick={moveToLocal}
                                            disabled={!hasSelectedCloudFiles() || loading}
                                        >
                                            Download to Local ({getSelectedCloudFiles().length})
                                        </IonButton>
                                    </div>
                                </div>
                                <div className="cloud-files-list">
                                    {filteredFiles.map(key => (
                                        <div key={key} className="batch-file-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedCloudFiles[key] || false}
                                                onChange={() => toggleCloudFileSelection(key)}
                                                disabled={loading}
                                            />
                                            <span className="file-name">{key}</span>
                                            <span className="file-date">{_formatDate(files[key])}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File List - Hide in batch mode */}
                    {!showBatchMode && (
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
                    )}

                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        padding: '16px',
                        backgroundColor: 'white',
                        borderTop: '1px solid #e0e0e0',
                        zIndex: 1000
                    }}>
                        <IonButton
                            expand="block"
                            color="secondary"
                            onClick={() => setShowModal(false)}
                        >
                            Back
                        </IonButton>
                    </div>
                </IonContent>
            </IonModal>
        );
    };

    return (
        <React.Fragment>
            <IonIcon
                icon={cloud}
                className="ion-padding-end"
                slot="end"
                size="large"
                onClick={handleCloudClick}
            />

            {showModal && createCloudPage()}

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

            {/* Batch Operations Conflict Alert */}
            <IonAlert
                animated
                isOpen={showMoveAlert}
                onDidDismiss={() => {
                    setShowMoveAlert(false);
                    setMoveOperation(null);
                    setConflictFiles([]);
                }}
                header="File Conflicts"
                message={alertMessage}
                buttons={[
                    {
                        text: "Cancel",
                        role: "cancel",
                        handler: () => {
                            setMoveOperation(null);
                            setConflictFiles([]);
                        }
                    },
                    {
                        text: "Skip Conflicts",
                        handler: () => {
                            // Execute operation only for non-conflicting files
                            if (moveOperation === 'toServer') {
                                const selectedFiles = getSelectedLocalFiles();
                                const nonConflictFiles = selectedFiles.filter(filename => !conflictFiles.includes(filename));
                                if (nonConflictFiles.length > 0) {
                                    executeServerUpload(nonConflictFiles);
                                }
                            } else if (moveOperation === 'toLocal') {
                                const selectedFiles = getSelectedCloudFiles();
                                const nonConflictFiles = selectedFiles.filter(filename => !conflictFiles.includes(filename));
                                if (nonConflictFiles.length > 0) {
                                    executeLocalDownload(nonConflictFiles);
                                }
                            }
                            setMoveOperation(null);
                            setConflictFiles([]);
                        }
                    },
                    {
                        text: "Overwrite All",
                        handler: () => {
                            // Execute operation for all selected files
                            if (moveOperation === 'toServer') {
                                const selectedFiles = getSelectedLocalFiles();
                                executeServerUpload(selectedFiles);
                            } else if (moveOperation === 'toLocal') {
                                const selectedFiles = getSelectedCloudFiles();
                                executeLocalDownload(selectedFiles);
                            }
                            setMoveOperation(null);
                            setConflictFiles([]);
                        }
                    }
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
