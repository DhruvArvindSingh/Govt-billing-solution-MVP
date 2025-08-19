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
    IonAlert,
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
    const [activeTab, setActiveTab] = useState<'s3' | 'dropbox' | 'postgres' | 'firebase'>('s3');
    const [s3Files, setS3Files] = useState<{ [key: string]: number }>({});
    const [dropboxFiles, setDropboxFiles] = useState<{ [key: string]: number }>({});
    const [postgresFiles, setPostgresFiles] = useState<{ [key: string]: number }>({});
    const [firebaseFiles, setFirebaseFiles] = useState<{ [key: string]: number }>({});
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
    const [showMoveAlert, setShowMoveAlert] = useState(false);
    const [moveOperation, setMoveOperation] = useState<'toLocal' | 'toServer' | null>(null);
    const [conflictFiles, setConflictFiles] = useState<string[]>([]);

    // Load files from S3 via API
    const loadFilesFromS3 = async () => {
        setLoading(true);
        try {
            const response = await ApiService.listAllS3();
            setS3Files(response.files || {});
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

    // Load files from PostgreSQL via API
    const loadFilesFromPostgres = async () => {
        setLoading(true);
        try {
            const response = await ApiService.listAllPostgres();
            setPostgresFiles(response.files || {});
        } catch (err) {
            console.error('Failed to load files from PostgreSQL', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else {
                setToastMessage('Failed to load files from PostgreSQL');
            }
            setShowToast(true);
        }
        setLoading(false);
    };

    // Load files from Firebase via API
    const loadFilesFromFirebase = async () => {
        setLoading(true);
        try {
            const response = await ApiService.listAllFirebase();
            setFirebaseFiles(response.files || {});
        } catch (err) {
            console.error('Failed to load files from Firebase', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else {
                setToastMessage('Failed to load files from Firebase');
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
    const switchTab = async (tab: 's3' | 'dropbox' | 'postgres' | 'firebase') => {
        setActiveTab(tab);
        if (tab === 's3' && Object.keys(s3Files).length === 0) {
            await loadFilesFromS3();
        } else if (tab === 'dropbox' && Object.keys(dropboxFiles).length === 0) {
            await loadFilesFromDropbox();
        } else if (tab === 'postgres' && Object.keys(postgresFiles).length === 0) {
            await loadFilesFromPostgres();
        } else if (tab === 'firebase' && Object.keys(firebaseFiles).length === 0) {
            await loadFilesFromFirebase();
        }
    };

    // Get current files based on active tab
    const getCurrentFiles = () => {
        switch (activeTab) {
            case 's3':
                return s3Files;
            case 'dropbox':
                return dropboxFiles;
            case 'postgres':
                return postgresFiles;
            case 'firebase':
                return firebaseFiles;
            default:
                return s3Files;
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

            // Check if current file is password protected
            let isPasswordProtected = false;
            try {
                if (props.file && props.file !== 'default') {
                    const currentFileData = await props.store._getFile(props.file);
                    isPasswordProtected = currentFileData?.isPasswordProtected || false;
                }
            } catch (err) {
                console.error('Failed to determine password protection status', err);
                isPasswordProtected = false;
            }

            let success = false;
            switch (activeTab) {
                case 's3':
                    success = await saveFileToS3(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'dropbox':
                    success = await saveFileToDropbox(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'postgres':
                    success = await saveFileToPostgres(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'firebase':
                    success = await saveFileToFirebase(fullFileName, currentData, isPasswordProtected);
                    break;
            }

            if (success) {
                let provider = '';
                switch (activeTab) {
                    case 's3':
                        provider = 'S3';
                        break;
                    case 'dropbox':
                        provider = 'Dropbox';
                        break;
                    case 'postgres':
                        provider = 'PostgreSQL';
                        break;
                    case 'firebase':
                        provider = 'Firebase';
                        break;
                }
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
    const saveFileToS3 = async (fileName: string, content: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.uploadFileS3(fileName, content, isPasswordProtected);
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
    const saveFileToDropbox = async (fileName: string, content: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.uploadFileDropbox(fileName, content, isPasswordProtected);
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

    // Save file to PostgreSQL via API
    const saveFileToPostgres = async (fileName: string, content: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.uploadFilePostgres(fileName, content, isPasswordProtected);
            await loadFilesFromPostgres();
            return true;
        } catch (err) {
            console.error('Failed to save file to PostgreSQL', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else {
                setToastMessage('Failed to save file to PostgreSQL. Please try again.');
                setShowToast(true);
            }
            return false;
        }
    };

    // Save file to Firebase via API
    const saveFileToFirebase = async (fileName: string, content: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.uploadFileFirebase(fileName, content, isPasswordProtected);
            await loadFilesFromFirebase();
            return true;
        } catch (err) {
            console.error('Failed to save file to Firebase', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else {
                setToastMessage('Failed to save file to Firebase. Please try again.');
                setShowToast(true);
            }
            return false;
        }
    };

    // Edit file from cloud
    const editFile = async (key: string) => {
        setLoading(true);
        try {
            let fileData = null;
            switch (activeTab) {
                case 's3':
                    fileData = await getFileFromS3(key);
                    break;
                case 'dropbox':
                    fileData = await getFileFromDropbox(key);
                    break;
                case 'postgres':
                    fileData = await getFileFromPostgres(key);
                    break;
                case 'firebase':
                    fileData = await getFileFromFirebase(key);
                    break;
            }

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
            content = JSON.parse(content);
            console.log("content: ", content);

            return {
                content: content.content,
                isPasswordProtected: content.isPasswordProtected,
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

            // Parse content to check for password protection (similar to S3)
            let parsedContent = content;
            let isPasswordProtected = false;

            try {
                // Try to parse as JSON to check if it has metadata
                const contentObj = JSON.parse(content);
                if (contentObj && typeof contentObj === 'object' && contentObj.content !== undefined) {
                    parsedContent = contentObj.content;
                    isPasswordProtected = contentObj.isPasswordProtected || false;
                }
            } catch (parseError) {
                // If parsing fails, treat as plain content
                parsedContent = content;
                isPasswordProtected = false;
            }

            return {
                content: parsedContent,
                isPasswordProtected: isPasswordProtected,
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

    // Get file from PostgreSQL via API
    const getFileFromPostgres = async (fileName: string) => {
        try {
            console.log("Getting file from PostgreSQL via API:", fileName);
            const response = await ApiService.getFilePostgres(fileName);
            console.log("PostgreSQL API response:", response);

            if (!response) {
                console.error("No response received from PostgreSQL API");
                throw new Error("No response received from PostgreSQL API");
            }

            let content = null;
            if (response.content !== undefined) {
                content = response.content;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                console.error("Unexpected response format:", response);
                throw new Error("Unexpected response format from PostgreSQL API");
            }

            if (content === null || content === undefined) {
                console.error("No content found in response");
                throw new Error("No file content received from PostgreSQL");
            }

            console.log("Successfully extracted content, length:", content.length);
            content = JSON.parse(content);
            console.log("content: ", content);

            return {
                content: content.content,
                isPasswordProtected: content.isPasswordProtected,
                modified: postgresFiles[fileName] || Date.now(),
                created: postgresFiles[fileName] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from PostgreSQL', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in PostgreSQL.');
                setShowToast(true);
            }
            return null;
        }
    };

    // Get file from Firebase via API
    const getFileFromFirebase = async (fileName: string) => {
        try {
            console.log("Getting file from Firebase via API:", fileName);
            const response = await ApiService.getFileFirebase(fileName);
            console.log("Firebase API response:", response);

            if (!response) {
                console.error("No response received from Firebase API");
                throw new Error("No response received from Firebase API");
            }

            let content = null;
            if (response.content !== undefined) {
                content = response.content;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                console.error("Unexpected response format:", response);
                throw new Error("Unexpected response format from Firebase API");
            }

            if (content === null || content === undefined) {
                console.error("No content found in response");
                throw new Error("No file content received from Firebase");
            }

            console.log("Successfully extracted content, length:", content.length);
            content = JSON.parse(content);
            console.log("content: ", content);

            return {
                content: content.content,
                isPasswordProtected: content.isPasswordProtected,
                modified: firebaseFiles[fileName] || Date.now(),
                created: firebaseFiles[fileName] || Date.now()
            };
        } catch (err) {
            console.error('Failed to get file from Firebase', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
                setShowToast(true);
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in Firebase.');
                setShowToast(true);
            }
            return null;
        }
    };

    // Delete file
    const deleteFile = (key: string) => {
        setCurrentKey(key);
        let provider = '';
        switch (activeTab) {
            case 's3':
                provider = 'S3';
                break;
            case 'dropbox':
                provider = 'Dropbox';
                break;
            case 'postgres':
                provider = 'PostgreSQL';
                break;
            case 'firebase':
                provider = 'Firebase';
                break;
        }
        setAlertMessage(`Do you want to delete the ${key} file from ${provider}?`);
        setShowAlert(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        if (!currentKey) return;

        setLoading(true);
        let success = false;
        switch (activeTab) {
            case 's3':
                success = await deleteFileFromS3(currentKey);
                break;
            case 'dropbox':
                success = await deleteFileFromDropbox(currentKey);
                break;
            case 'postgres':
                success = await deleteFileFromPostgres(currentKey);
                break;
            case 'firebase':
                success = await deleteFileFromFirebase(currentKey);
                break;
        }

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

    // Delete from PostgreSQL via API
    const deleteFileFromPostgres = async (fileName: string): Promise<boolean> => {
        try {
            await ApiService.deleteFilePostgres(fileName);
            await loadFilesFromPostgres();
            return true;
        } catch (err) {
            console.error('Failed to delete file from PostgreSQL', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in PostgreSQL.');
            } else {
                setToastMessage('Failed to delete file from PostgreSQL. Please try again.');
            }
            setShowToast(true);
            return false;
        }
    };

    // Delete from Firebase via API
    const deleteFileFromFirebase = async (fileName: string): Promise<boolean> => {
        try {
            await ApiService.deleteFileFirebase(fileName);
            await loadFilesFromFirebase();
            return true;
        } catch (err) {
            console.error('Failed to delete file from Firebase', err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage('File not found in Firebase.');
            } else {
                setToastMessage('Failed to delete file from Firebase. Please try again.');
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
                    const isPasswordProtected = fileData.isPasswordProtected || false;
                    console.log('content: ', content);

                    let success = false;
                    switch (activeTab) {
                        case 's3':
                            success = await saveFileToS3(fileName, content, isPasswordProtected);
                            break;
                        case 'dropbox':
                            success = await saveFileToDropbox(fileName, content, isPasswordProtected);
                            break;
                        case 'postgres':
                            success = await saveFileToPostgres(fileName, content, isPasswordProtected);
                            break;
                        case 'firebase':
                            success = await saveFileToFirebase(fileName, content, isPasswordProtected);
                            break;
                    }

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
            let fileData = null;
            switch (activeTab) {
                case 's3':
                    fileData = await getFileFromS3(filename);
                    break;
                case 'dropbox':
                    fileData = await getFileFromDropbox(filename);
                    break;
                case 'postgres':
                    fileData = await getFileFromPostgres(filename);
                    break;
                case 'firebase':
                    fileData = await getFileFromFirebase(filename);
                    break;
            }

            if (!fileData || !fileData.content) {
                return false;
            }

            // Create a new File object for local storage
            const file = new File(
                new Date().toString(), // created
                new Date().toString(), // modified
                fileData.content, // content (encode for storage)
                filename, // name
                1,  // billType - default value
                fileData.isPasswordProtected || false,
                fileData.isPasswordProtected ? undefined : null // If protected, password is unknown
            );

            await props.store._saveFile(file, false);
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
            switch (activeTab) {
                case 's3':
                    loadFilesFromS3();
                    break;
                case 'dropbox':
                    loadFilesFromDropbox();
                    break;
                case 'postgres':
                    loadFilesFromPostgres();
                    break;
                case 'firebase':
                    loadFilesFromFirebase();
                    break;
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
                        <button
                            className={`tab-button ${activeTab === 'postgres' ? 'active' : ''}`}
                            onClick={() => switchTab('postgres')}
                            disabled={loading}
                        >
                            🐘 PostgreSQL
                        </button>
                        <button
                            className={`tab-button ${activeTab === 'firebase' ? 'active' : ''}`}
                            onClick={() => switchTab('firebase')}
                            disabled={loading}
                        >
                            🔥 Firebase
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

                        {hasSelectedCloudFiles() && (
                            <IonButton
                                className="download-all-button"
                                color="secondary"
                                onClick={moveToLocal}
                                disabled={loading}
                            >
                                Download All ({getSelectedCloudFiles().length})
                            </IonButton>
                        )}

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
                    {(
                        <div className="file-list-container">
                            {loading && (
                                <div className="loading-message">
                                    Loading files from {
                                        activeTab === 's3' ? 'S3' :
                                            activeTab === 'dropbox' ? 'Dropbox' :
                                                activeTab === 'postgres' ? 'PostgreSQL' :
                                                    'Firebase'
                                    }...
                                </div>
                            )}

                            {!loading && filteredFiles.length === 0 && searchTerm && (
                                <div className="no-results-message">
                                    No files found matching "{searchTerm}"
                                </div>
                            )}

                            {!loading && Object.keys(files).length === 0 && !searchTerm && (
                                <div className="no-files-message">
                                    No files found in {
                                        activeTab === 's3' ? 'S3' :
                                            activeTab === 'dropbox' ? 'Dropbox' :
                                                activeTab === 'postgres' ? 'PostgreSQL' :
                                                    'Firebase'
                                    }
                                </div>
                            )}

                            {!loading && filteredFiles.length > 0 && (
                                <IonList className="file-list">
                                    {filteredFiles.map((key) => (
                                        <IonItem key={key} className="file-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedCloudFiles[key] || false}
                                                onChange={() => toggleCloudFileSelection(key)}
                                                disabled={loading}
                                                className="file-checkbox"
                                            />
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
