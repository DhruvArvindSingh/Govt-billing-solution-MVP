import React, { useState, useEffect, useRef } from "react";
import "./Cloud.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { Local } from "../Storage/LocalStorage";
import ApiService, { DatabaseType } from "../service/Apiservice";
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
    IonSelect,
    IonSelectOption,
} from "@ionic/react";
import { cloud, trash, create, cloudUpload, close, shield, download, shuffle, chevronBack, chevronForward } from "ionicons/icons";
import { File } from "../Storage/LocalStorage";
import PasswordModal from "../PasswordModal/PasswordModal";
import CryptoJS from "crypto-js";

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
    const [activeTab, setActiveTab] = useState<'s3' | 'postgres' | 'firebase' | 'mongo' | 'neo4j' | 'orbitdb'>('s3');
    const [s3Files, setS3Files] = useState<{ [key: string]: number }>({});
    const [postgresFiles, setPostgresFiles] = useState<{ [key: string]: number }>({});
    const [firebaseFiles, setFirebaseFiles] = useState<{ [key: string]: number }>({});
    const [mongoFiles, setMongoFiles] = useState<{ [key: string]: number }>({});
    const [neo4jFiles, setNeo4jFiles] = useState<{ [key: string]: number }>({});
    const [orbitdbFiles, setOrbitdbFiles] = useState<{ [key: string]: number }>({});
    const [s3PasswordProtected, setS3PasswordProtected] = useState<{ [key: string]: boolean }>({});
    const [postgresPasswordProtected, setPostgresPasswordProtected] = useState<{ [key: string]: boolean }>({});
    const [firebasePasswordProtected, setFirebasePasswordProtected] = useState<{ [key: string]: boolean }>({});
    const [mongoPasswordProtected, setMongoPasswordProtected] = useState<{ [key: string]: boolean }>({});
    const [neo4jPasswordProtected, setNeo4jPasswordProtected] = useState<{ [key: string]: boolean }>({});
    const [orbitdbPasswordProtected, setOrbitdbPasswordProtected] = useState<{ [key: string]: boolean }>({});
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
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPasswordFile, setCurrentPasswordFile] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');
    const [encryptedContent, setEncryptedContent] = useState<string>('');
    const [showMigrationModal, setShowMigrationModal] = useState(false);
    const [targetDatabase, setTargetDatabase] = useState<DatabaseType | null>(null);
    const [migrationConflictFiles, setMigrationConflictFiles] = useState<string[]>([]);
    const [showMigrationConflictAlert, setShowMigrationConflictAlert] = useState(false);

    // Tab navigation scroll functionality
    const tabNavigationRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    // Unified function to load files from any database
    const loadFilesFromDatabase = async (database: DatabaseType) => {
        setLoading(true);
        try {
            const response = await ApiService.listAllFiles(database);

            // Merge regular files and password-protected files
            const allFiles = { ...(response.files || {}) };
            const passwordProtectedMap: { [key: string]: boolean } = {};

            if (response.passwordProtectedFiles) {
                Object.keys(response.passwordProtectedFiles).forEach(fileName => {
                    // Add password-protected files to the main files list if they don't exist
                    if (!allFiles[fileName]) {
                        allFiles[fileName] = new Date(response.passwordProtectedFiles[fileName]).getTime();
                    }
                    passwordProtectedMap[fileName] = true;
                });
            }

            // Update the appropriate state based on database type
            switch (database) {
                case 's3':
                    setS3Files(allFiles);
                    setS3PasswordProtected(passwordProtectedMap);
                    break;
                case 'postgres':
                    setPostgresFiles(allFiles);
                    setPostgresPasswordProtected(passwordProtectedMap);
                    break;
                case 'firebase':
                    setFirebaseFiles(allFiles);
                    setFirebasePasswordProtected(passwordProtectedMap);
                    break;
                case 'mongo':
                    setMongoFiles(allFiles);
                    setMongoPasswordProtected(passwordProtectedMap);
                    break;
                case 'neo4j':
                    setNeo4jFiles(allFiles);
                    setNeo4jPasswordProtected(passwordProtectedMap);
                    break;
                case 'orbitdb':
                    setOrbitdbFiles(allFiles);
                    setOrbitdbPasswordProtected(passwordProtectedMap);
                    break;
            }
        } catch (err) {
            console.error(`Failed to load files from ${database}`, err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else {
                setToastMessage(`Failed to load files from ${database}`);
            }
            setShowToast(true);
        }
        setLoading(false);
    };

    // Individual load functions for backward compatibility (calling the unified function)
    const loadFilesFromS3 = () => loadFilesFromDatabase('s3');
    const loadFilesFromPostgres = () => loadFilesFromDatabase('postgres');
    const loadFilesFromFirebase = () => loadFilesFromDatabase('firebase');
    const loadFilesFromMongo = () => loadFilesFromDatabase('mongo');
    const loadFilesFromNeo4j = () => loadFilesFromDatabase('neo4j');
    const loadFilesFromOrbitdb = () => loadFilesFromDatabase('orbitdb');

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
    const switchTab = async (tab: 's3' | 'postgres' | 'firebase' | 'mongo' | 'neo4j' | 'orbitdb') => {
        // Deselect all files when switching tabs
        setSelectedCloudFiles({});

        setActiveTab(tab);
        if (tab === 's3' && Object.keys(s3Files).length === 0) {
            await loadFilesFromS3();
        } else if (tab === 'postgres' && Object.keys(postgresFiles).length === 0) {
            await loadFilesFromPostgres();
        } else if (tab === 'firebase' && Object.keys(firebaseFiles).length === 0) {
            await loadFilesFromFirebase();
        } else if (tab === 'mongo' && Object.keys(mongoFiles).length === 0) {
            await loadFilesFromMongo();
        } else if (tab === 'neo4j' && Object.keys(neo4jFiles).length === 0) {
            await loadFilesFromNeo4j();
        } else if (tab === 'orbitdb' && Object.keys(orbitdbFiles).length === 0) {
            await loadFilesFromOrbitdb();
        }
    };

    // Get current files based on active tab
    const getCurrentFiles = () => {
        switch (activeTab) {
            case 's3':
                return s3Files;
            case 'postgres':
                return postgresFiles;
            case 'firebase':
                return firebaseFiles;
            case 'mongo':
                return mongoFiles;
            case 'neo4j':
                return neo4jFiles;
            case 'orbitdb':
                return orbitdbFiles;
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
                case 'postgres':
                    success = await saveFileToPostgres(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'firebase':
                    success = await saveFileToFirebase(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'mongo':
                    success = await saveFileToMongo(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'neo4j':
                    success = await saveFileToNeo4j(fullFileName, currentData, isPasswordProtected);
                    break;
                case 'orbitdb':
                    success = await saveFileToOrbitdb(fullFileName, currentData, isPasswordProtected);
                    break;
            }

            if (success) {
                let provider = '';
                switch (activeTab) {
                    case 's3':
                        provider = 'S3';
                        break;
                    case 'postgres':
                        provider = 'PostgreSQL';
                        break;
                    case 'firebase':
                        provider = 'Firebase';
                        break;
                    case 'mongo':
                        provider = 'MongoDB';
                        break;
                    case 'neo4j':
                        provider = 'Neo4j';
                        break;
                    case 'orbitdb':
                        provider = 'OrbitDB';
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

    // Unified function to save file to any database
    const saveFileToDatabase = async (database: DatabaseType, fileName: string, content: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.uploadFile(database, fileName, content, isPasswordProtected);
            await loadFilesFromDatabase(database);
            return true;
        } catch (err) {
            console.error(`Failed to save file to ${database}`, err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 403) {
                setToastMessage('Permission denied. Your app may not have sufficient permissions.');
            } else if (err.response?.status === 400) {
                setToastMessage('Bad request. Please check the file name and content.');
            } else {
                setToastMessage(`Failed to save file to ${database}. Please try again.`);
            }
            setShowToast(true);
            return false;
        }
    };

    // Individual save functions for backward compatibility (calling the unified function)
    const saveFileToS3 = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('s3', fileName, content, isPasswordProtected);
    const saveFileToPostgres = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('postgres', fileName, content, isPasswordProtected);
    const saveFileToFirebase = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('firebase', fileName, content, isPasswordProtected);
    const saveFileToMongo = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('mongo', fileName, content, isPasswordProtected);
    const saveFileToNeo4j = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('neo4j', fileName, content, isPasswordProtected);
    const saveFileToOrbitdb = (fileName: string, content: string, isPasswordProtected: boolean = false) =>
        saveFileToDatabase('orbitdb', fileName, content, isPasswordProtected);

    // Edit file from cloud
    const editFile = async (key: string) => {
        setLoading(true);
        try {
            let fileData = null;
            const isPasswordProtected = isFilePasswordProtected(key);
            fileData = await getFileFromDatabase(activeTab, key, isPasswordProtected);

            if (fileData && fileData.content) {
                if (isPasswordProtected) {
                    // For password-protected files, close cloud modal first, then show password modal
                    setShowModal(false);
                    setCurrentPasswordFile(key);
                    setEncryptedContent(fileData.content);
                    setPasswordError('');
                    setShowPasswordModal(true);
                    setLoading(false);
                } else {
                    // For regular files, open directly
                    AppGeneral.viewFile(key, fileData.content);
                    props.updateSelectedFile(key);
                    setShowModal(false);
                    setLoading(false);
                }
            } else {
                setToastMessage('Failed to load file');
                setShowToast(true);
                setLoading(false);
            }
        } catch (err) {
            console.error('Error loading file:', err);
            setToastMessage('Failed to load file');
            setShowToast(true);
            setLoading(false);
        }
    };

    // Unified function to get file from any database
    const getFileFromDatabase = async (database: DatabaseType, fileName: string, isPasswordProtected: boolean = false) => {
        try {
            console.log(`Getting file from ${database} via API:`, fileName);
            const response = await ApiService.getFile(database, fileName, isPasswordProtected);
            console.log(`${database} API response:`, response);

            // Check if we have content in the response
            if (!response) {
                console.error(`No response received from ${database} API`);
                throw new Error(`No response received from ${database} API`);
            }

            // Handle different possible response formats - ApiService now returns FileContent directly
            let content = null;
            if (response.content !== undefined) {
                content = response.content;
            } else if (typeof response === 'string') {
                content = response;
            } else {
                console.error("Unexpected response format:", response);
                throw new Error(`Unexpected response format from ${database} API`);
            }

            if (content === null || content === undefined) {
                console.error("No content found in response");
                throw new Error(`No file content received from ${database}`);
            }

            console.log("Successfully extracted content, length:", content.length);

            // Get the appropriate files object based on database type
            let filesObject: { [key: string]: number };
            switch (database) {
                case 's3':
                    filesObject = s3Files;
                    break;
                case 'postgres':
                    filesObject = postgresFiles;
                    break;
                case 'firebase':
                    filesObject = firebaseFiles;
                    break;
                case 'mongo':
                    filesObject = mongoFiles;
                    break;
                case 'neo4j':
                    filesObject = neo4jFiles;
                    break;
                case 'orbitdb':
                    filesObject = orbitdbFiles;
                    break;
                default:
                    filesObject = {};
            }

            // The new API format returns content directly (not wrapped in JSON)
            // For password-protected files, content is encrypted and should not be parsed as JSON
            return {
                content: content,
                isPasswordProtected: isPasswordProtected,
                modified: filesObject[fileName] || Date.now(),
                created: filesObject[fileName] || Date.now()
            };
        } catch (err) {
            console.error(`Failed to get file from ${database}`, err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage(`File not found in ${database}. The file may have been moved or deleted.`);
            } else if (err.response?.status === 403) {
                setToastMessage('Permission denied. Your app may not have read access to this file.');
            } else {
                setToastMessage(`Failed to load file from ${database}. Please check the console for details.`);
            }
            setShowToast(true);
            return null;
        }
    };

    // Individual get functions for backward compatibility (calling the unified function)
    const getFileFromS3 = (key: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('s3', key, isPasswordProtected);
    const getFileFromPostgres = (fileName: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('postgres', fileName, isPasswordProtected);
    const getFileFromFirebase = (fileName: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('firebase', fileName, isPasswordProtected);
    const getFileFromMongo = (fileName: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('mongo', fileName, isPasswordProtected);
    const getFileFromNeo4j = (fileName: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('neo4j', fileName, isPasswordProtected);
    const getFileFromOrbitdb = (fileName: string, isPasswordProtected: boolean = false) =>
        getFileFromDatabase('orbitdb', fileName, isPasswordProtected);

    // Delete file
    const deleteFile = (key: string) => {
        setCurrentKey(key);
        let provider = '';
        switch (activeTab) {
            case 's3':
                provider = 'S3';
                break;
            case 'postgres':
                provider = 'PostgreSQL';
                break;
            case 'firebase':
                provider = 'Firebase';
                break;
            case 'mongo':
                provider = 'MongoDB';
                break;
            case 'neo4j':
                provider = 'Neo4j';
                break;
            case 'orbitdb':
                provider = 'OrbitDB';
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
        const isPasswordProtected = isFilePasswordProtected(currentKey);
        success = await deleteFileFromDatabase(activeTab, currentKey, isPasswordProtected);

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

    // Unified function to delete file from any database
    const deleteFileFromDatabase = async (database: DatabaseType, fileName: string, isPasswordProtected: boolean = false): Promise<boolean> => {
        try {
            await ApiService.deleteFile(database, fileName, isPasswordProtected);
            await loadFilesFromDatabase(database);
            return true;
        } catch (err) {
            console.error(`Failed to delete file from ${database}`, err);
            if (err.response?.status === 401) {
                setToastMessage('Authentication failed. Please login and try again.');
            } else if (err.response?.status === 404) {
                setToastMessage(`File not found in ${database}.`);
            } else {
                setToastMessage(`Failed to delete file from ${database}. Please try again.`);
            }
            setShowToast(true);
            return false;
        }
    };

    // Tab navigation scroll functions
    const checkScrollArrows = () => {
        if (tabNavigationRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabNavigationRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
        }
    };

    const scrollLeft = () => {
        if (tabNavigationRef.current) {
            tabNavigationRef.current.scrollBy({
                left: -120,
                behavior: 'smooth'
            });
        }
    };

    const scrollRight = () => {
        if (tabNavigationRef.current) {
            tabNavigationRef.current.scrollBy({
                left: 120,
                behavior: 'smooth'
            });
        }
    };

    // Check scroll arrows on resize and scroll
    useEffect(() => {
        const handleResize = () => {
            checkScrollArrows();
        };

        const handleScroll = () => {
            checkScrollArrows();
        };

        window.addEventListener('resize', handleResize);
        if (tabNavigationRef.current) {
            tabNavigationRef.current.addEventListener('scroll', handleScroll);
        }

        // Initial check
        checkScrollArrows();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (tabNavigationRef.current) {
                tabNavigationRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const loadDefault = () => {
        const msc = DATA["home"]["default"]["msc"];
        AppGeneral.viewFile("default", JSON.stringify(msc));
        props.updateSelectedFile("default");
    };

    const _formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    // Helper function to check if file is password protected
    const isFilePasswordProtected = (fileName: string): boolean => {
        switch (activeTab) {
            case 's3':
                return s3PasswordProtected[fileName] || false;
            case 'postgres':
                return postgresPasswordProtected[fileName] || false;
            case 'firebase':
                return firebasePasswordProtected[fileName] || false;
            case 'mongo':
                return mongoPasswordProtected[fileName] || false;
            case 'neo4j':
                return neo4jPasswordProtected[fileName] || false;
            case 'orbitdb':
                return orbitdbPasswordProtected[fileName] || false;
            default:
                return false;
        }
    };

    // Function to decrypt file content with password (matching LocalStorage logic)
    const decryptFileContent = (encryptedContent: string, password: string): string | null => {
        try {
            console.log("Attempting to decrypt content with provided password");

            // Handle both old format (with "Protected_" prefix) and new format (direct encrypted content)
            let actualEncryptedContent = encryptedContent;
            if (encryptedContent.startsWith('Protected_')) {
                // Old format - remove "Protected_" prefix
                actualEncryptedContent = encryptedContent.substring(10);
            }

            const decrypted = CryptoJS.AES.decrypt(actualEncryptedContent, password);
            const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

            if (!decryptedString || decryptedString.trim() === '') {
                console.log("Decryption failed - empty result");
                return null;
            }

            console.log("Successfully decrypted content, length:", decryptedString.length);
            return decryptedString;
        } catch (error) {
            console.log("Decryption error:", error);
            return null;
        }
    };

    // Handle password submission for encrypted files
    const handlePasswordSubmit = async (name: string, password: string): Promise<boolean> => {
        if (!encryptedContent || !currentPasswordFile) {
            setPasswordError('Missing file data');
            return false;
        }

        const decryptedContent = decryptFileContent(encryptedContent, password);

        if (decryptedContent) {
            // Password is correct, proceed with editing
            setPasswordError('');

            try {
                // viewFile now handles decoding internally, but we still need to decode for encrypted content
                AppGeneral.viewFile(currentPasswordFile, decodeURIComponent(decryptedContent));
                props.updateSelectedFile(currentPasswordFile);
                setToastMessage('File opened successfully');
                setShowToast(true);

                // Reset states
                setCurrentPasswordFile('');
                setEncryptedContent('');
                return true;
            } catch (error) {
                console.error('Error opening decrypted file:', error);
                setToastMessage('Failed to open file');
                setShowToast(true);
                return false;
            }
        } else {
            // Password is incorrect
            setPasswordError('Incorrect password or corrupted file. Please try again.');
            return false;
        }
    };

    // Handle password modal cancellation
    const handlePasswordClose = () => {
        setShowPasswordModal(false);
        setPasswordError('');
        setCurrentPasswordFile('');
        setEncryptedContent('');
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

    const deselectAllCloudFiles = () => {
        setSelectedCloudFiles({});
    };

    // Get available migration target databases (excluding current active tab)
    const getMigrationTargetDatabases = (): DatabaseType[] => {
        const allDatabases: DatabaseType[] = ['s3', 'postgres', 'firebase', 'mongo', 'neo4j', 'orbitdb'];
        return allDatabases.filter(db => db !== activeTab);
    };

    // Get database display name for migration
    const getDatabaseDisplayName = (database: DatabaseType): string => {
        switch (database) {
            case 's3': return 'S3';
            case 'postgres': return 'PostgreSQL';
            case 'firebase': return 'Firebase';
            case 'mongo': return 'MongoDB';
            case 'neo4j': return 'Neo4j';
            case 'orbitdb': return 'OrbitDB';
            default: return database;
        }
    };

    // Handle migration confirmation
    const handleMigrationConfirm = async (targetDb: DatabaseType) => {
        setTargetDatabase(targetDb);
        setLoading(true);

        try {
            // Get list of files in target database
            const targetResponse = await ApiService.listAllFiles(targetDb);
            const targetFiles = Object.keys(targetResponse.files || {});

            // Check for conflicts
            const selectedFiles = getSelectedCloudFiles();
            const conflicts = selectedFiles.filter(fileName => targetFiles.includes(fileName));

            if (conflicts.length > 0) {
                setMigrationConflictFiles(conflicts);
                setShowMigrationConflictAlert(true);
            } else {
                // No conflicts, proceed with migration
                await executeMigration(targetDb, selectedFiles);
            }
        } catch (error) {
            console.error('Error checking target database:', error);
            setToastMessage('Failed to check target database files');
            setShowToast(true);
        } finally {
            setLoading(false);
        }
    };

    // Execute file migration
    const executeMigration = async (targetDb: DatabaseType, filesToMigrate: string[], skipConflicts: boolean = false) => {
        setLoading(true);

        try {
            let successCount = 0;
            let errorCount = 0;
            const finalFilesToMigrate = skipConflicts
                ? filesToMigrate.filter(file => !migrationConflictFiles.includes(file))
                : filesToMigrate;

            for (const fileName of finalFilesToMigrate) {
                try {
                    // Get file from source database
                    const isPasswordProtected = isFilePasswordProtected(fileName);
                    const fileData = await getFileFromDatabase(activeTab, fileName, isPasswordProtected);

                    if (fileData && fileData.content) {
                        // Upload to target database
                        await ApiService.uploadFile(targetDb, fileName, fileData.content, isPasswordProtected);
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`Error migrating ${fileName}:`, error);
                    errorCount++;
                }
            }

            // Clear selections and show result
            setSelectedCloudFiles({});

            const sourceDbName = getDatabaseDisplayName(activeTab);
            const targetDbName = getDatabaseDisplayName(targetDb);

            if (successCount > 0 && errorCount === 0) {
                setToastMessage(`Successfully migrated ${successCount} file(s) from ${sourceDbName} to ${targetDbName}`);
            } else if (successCount > 0 && errorCount > 0) {
                setToastMessage(`Migrated ${successCount} file(s), ${errorCount} failed`);
            } else {
                setToastMessage(`Failed to migrate files to ${targetDbName}`);
            }
            setShowToast(true);

        } catch (error) {
            console.error('Migration error:', error);
            setToastMessage('Error during file migration');
            setShowToast(true);
        } finally {
            setLoading(false);
            setShowMigrationModal(false);
            setTargetDatabase(null);
            setMigrationConflictFiles([]);
        }
    };

    const toggleCloudFileSelection = (key: string) => {
        setSelectedCloudFiles(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Check if file exists locally
    const isFileExistsLocally = (filename: string): boolean => {
        return Object.keys(localFiles).includes(filename);
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
                    success = await saveFileToDatabase(activeTab, fileName, content, isPasswordProtected);

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
            const isPasswordProtected = isFilePasswordProtected(filename);
            fileData = await getFileFromDatabase(activeTab, filename, isPasswordProtected);

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
                case 'postgres':
                    loadFilesFromPostgres();
                    break;
                case 'firebase':
                    loadFilesFromFirebase();
                    break;
                case 'mongo':
                    loadFilesFromMongo();
                    break;
                case 'neo4j':
                    loadFilesFromNeo4j();
                    break;
                case 'orbitdb':
                    loadFilesFromOrbitdb();
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
            <IonModal isOpen={showModal} onDidDismiss={() => {
                setShowModal(false);
                setSelectedCloudFiles({});
            }} className="cloud-modal">
                <IonHeader>
                    <IonToolbar>
                        <IonTitle>Cloud Storage</IonTitle>
                        <IonButton
                            fill="clear"
                            slot="end"
                            onClick={() => {
                                setShowModal(false);
                                setSelectedCloudFiles({});
                            }}
                        >
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="cloud-content">
                    {/* Tab Navigation with Scroll Arrows */}
                    <div className="tab-navigation-container">
                        {showLeftArrow && (
                            <button className="tab-scroll-arrow left" onClick={scrollLeft}>
                                <IonIcon icon={chevronBack} />
                            </button>
                        )}
                        <div className="tab-navigation" ref={tabNavigationRef}>
                            <button
                                className={`tab-button ${activeTab === 's3' ? 'active' : ''}`}
                                onClick={() => switchTab('s3')}
                                disabled={loading}
                            >
                                🗄️ S3
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
                            <button
                                className={`tab-button ${activeTab === 'mongo' ? 'active' : ''}`}
                                onClick={() => switchTab('mongo')}
                                disabled={loading}
                            >
                                🍃 MongoDB
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'neo4j' ? 'active' : ''}`}
                                onClick={() => switchTab('neo4j')}
                                disabled={loading}
                            >
                                🔗 Neo4j
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'orbitdb' ? 'active' : ''}`}
                                onClick={() => switchTab('orbitdb')}
                                disabled={loading}
                            >
                                🌌 OrbitDB
                            </button>
                        </div>
                        {showRightArrow && (
                            <button className="tab-scroll-arrow right" onClick={scrollRight}>
                                <IonIcon icon={chevronForward} />
                            </button>
                        )}
                    </div>

                    {/* Search and Upload */}
                    <div className="search-upload-container">
                        <IonButton
                            className="upload-button"
                            onClick={hasSelectedCloudFiles() ? deselectAllCloudFiles : uploadCurrentInvoice}
                            disabled={loading}
                            color={hasSelectedCloudFiles() ? "medium" : "primary"}
                        >
                            <IonIcon icon={hasSelectedCloudFiles() ? close : cloudUpload} slot="start" />
                            {hasSelectedCloudFiles() ? "Deselect All" : "Upload Invoice"}
                        </IonButton>

                        {hasSelectedCloudFiles() && (
                            <div className="selected-actions-container" style={{ display: 'flex', gap: '8px' }}>
                                <IonButton
                                    size="small"
                                    color="secondary"
                                    onClick={moveToLocal}
                                    disabled={loading}
                                >
                                    <IonIcon icon={download} slot="icon-only" />
                                </IonButton>

                                <IonSelect
                                    value=""
                                    placeholder="Migrate"
                                    interface="popover"
                                    onIonChange={(e) => {
                                        if (e.detail.value) {
                                            handleMigrationConfirm(e.detail.value);
                                        }
                                    }}
                                    style={{
                                        minWidth: '100px',
                                        maxWidth: '120px',
                                        '--background': 'var(--ion-color-tertiary)',
                                        '--color': 'var(--ion-color-tertiary-contrast)',
                                        '--border-radius': '6px',
                                        '--padding': '8px 12px'
                                    }}
                                >
                                    <IonIcon icon={shuffle} slot="start" />
                                    {getMigrationTargetDatabases().map(db => (
                                        <IonSelectOption key={db} value={db}>
                                            {getDatabaseDisplayName(db)}
                                        </IonSelectOption>
                                    ))}
                                </IonSelect>
                            </div>
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
                                            activeTab === 'postgres' ? 'PostgreSQL' :
                                                activeTab === 'firebase' ? 'Firebase' :
                                                    activeTab === 'mongo' ? 'MongoDB' :
                                                        activeTab === 'neo4j' ? 'Neo4j' :
                                                            'OrbitDB'
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
                                            activeTab === 'postgres' ? 'PostgreSQL' :
                                                activeTab === 'firebase' ? 'Firebase' :
                                                    activeTab === 'mongo' ? 'MongoDB' :
                                                        activeTab === 'neo4j' ? 'Neo4j' :
                                                            'OrbitDB'
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
                                                <div className="file-name">
                                                    {key}
                                                    {isFilePasswordProtected(key) && (
                                                        <IonIcon
                                                            icon={shield}
                                                            className="password-shield-icon"
                                                            title="Password Protected"
                                                        />
                                                    )}
                                                </div>
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

            {/* Migration Conflict Alert */}
            <IonAlert
                animated
                isOpen={showMigrationConflictAlert}
                onDidDismiss={() => {
                    setShowMigrationConflictAlert(false);
                    setMigrationConflictFiles([]);
                    setTargetDatabase(null);
                }}
                header="Migration Conflicts"
                message={`${migrationConflictFiles.length} file(s) already exist in ${targetDatabase ? getDatabaseDisplayName(targetDatabase) : 'target database'}. What would you like to do?`}
                buttons={[
                    {
                        text: "Cancel",
                        role: "cancel",
                        handler: () => {
                            setMigrationConflictFiles([]);
                            setTargetDatabase(null);
                        }
                    },
                    {
                        text: "Skip Conflict Files",
                        handler: () => {
                            if (targetDatabase) {
                                const selectedFiles = getSelectedCloudFiles();
                                executeMigration(targetDatabase, selectedFiles, true);
                            }
                            setShowMigrationConflictAlert(false);
                        }
                    },
                    {
                        text: "Migrate All",
                        handler: () => {
                            if (targetDatabase) {
                                const selectedFiles = getSelectedCloudFiles();
                                executeMigration(targetDatabase, selectedFiles, false);
                            }
                            setShowMigrationConflictAlert(false);
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

            <PasswordModal
                isOpen={showPasswordModal}
                onSubmit={handlePasswordSubmit}
                onClose={handlePasswordClose}
                title="Enter Password"
                submitText="Decrypt File"
                showNameField={false}
                passwordError={passwordError}
            />
        </React.Fragment>
    );
};

export default Cloud;
