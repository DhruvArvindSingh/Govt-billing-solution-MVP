// Simplified OrbitDB-like service using IndexedDB directly
// This avoids the complex Node.js dependencies while providing the same API

interface FileRecord {
    fileName: string;
    fileContent: string;
    isPasswordProtected: boolean;
    created_at: string;
    modified_at: string;
}

// IndexedDB database interface
interface SimpleDB {
    db: IDBDatabase | null;
}

class OrbitDBService {
    private static instance: OrbitDBService;
    private simpleDB: SimpleDB = { db: null };
    private isInitialized = false;
    private readonly DB_NAME = 'OrbitDB-Files';
    private readonly DB_VERSION = 1;
    private readonly STORE_NAME = 'files';

    private constructor() { }

    static getInstance(): OrbitDBService {
        if (!OrbitDBService.instance) {
            OrbitDBService.instance = new OrbitDBService();
        }
        return OrbitDBService.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized && this.simpleDB.db) {
            return;
        }

        return new Promise((resolve, reject) => {
            console.log('Initializing IndexedDB for OrbitDB-like storage...');

            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(new Error('Failed to initialize IndexedDB'));
            };

            request.onsuccess = () => {
                this.simpleDB.db = request.result;
                this.isInitialized = true;
                console.log('IndexedDB initialized successfully');

                // Cleanup on window unload
                if (typeof window !== 'undefined') {
                    window.addEventListener('beforeunload', () => {
                        this.cleanup();
                    });
                }

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create the files object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'fileName' });
                    store.createIndex('created_at', 'created_at', { unique: false });
                    store.createIndex('modified_at', 'modified_at', { unique: false });
                    store.createIndex('isPasswordProtected', 'isPasswordProtected', { unique: false });
                }
            };
        });
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized || !this.simpleDB.db) {
            await this.initialize();
        }
    }

    async uploadFile(fileName: string, content: string, isPasswordProtected: boolean = false): Promise<void> {
        await this.ensureInitialized();

        const fileRecord: FileRecord = {
            fileName,
            fileContent: content,
            isPasswordProtected,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString()
        };

        return new Promise((resolve, reject) => {
            const transaction = this.simpleDB.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put(fileRecord);

            request.onsuccess = () => {
                console.log('File uploaded to OrbitDB-like storage:', fileName);
                resolve();
            };

            request.onerror = () => {
                console.error('Failed to upload file:', request.error);
                reject(new Error(`Failed to upload file: ${fileName}`));
            };
        });
    }

    async getFile(fileName: string): Promise<FileRecord | null> {
        await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.simpleDB.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(fileName);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('Error getting file from storage:', request.error);
                reject(new Error(`Failed to get file: ${fileName}`));
            };
        });
    }

    async listAllFiles(): Promise<{ files: { [fileName: string]: number }, passwordProtectedFiles: { [fileName: string]: number } }> {
        await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.simpleDB.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allEntries = request.result as FileRecord[];
                const files: { [fileName: string]: number } = {};
                const passwordProtectedFiles: { [fileName: string]: number } = {};

                allEntries.forEach((fileRecord) => {
                    const timestamp = new Date(fileRecord.modified_at).getTime();

                    if (fileRecord.isPasswordProtected) {
                        passwordProtectedFiles[fileRecord.fileName] = timestamp;
                    } else {
                        files[fileRecord.fileName] = timestamp;
                    }
                });

                resolve({ files, passwordProtectedFiles });
            };

            request.onerror = () => {
                console.error('Error listing files from storage:', request.error);
                resolve({ files: {}, passwordProtectedFiles: {} });
            };
        });
    }

    async deleteFile(fileName: string): Promise<void> {
        await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.simpleDB.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(fileName);

            request.onsuccess = () => {
                console.log('File deleted from OrbitDB-like storage:', fileName);
                resolve();
            };

            request.onerror = () => {
                console.error('Error deleting file from storage:', request.error);
                reject(new Error(`Failed to delete file: ${fileName}`));
            };
        });
    }

    async getAllFiles(): Promise<Record<string, FileRecord>> {
        await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = this.simpleDB.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const allEntries = request.result as FileRecord[];
                const result: Record<string, FileRecord> = {};

                allEntries.forEach((fileRecord) => {
                    result[fileRecord.fileName] = fileRecord;
                });

                resolve(result);
            };

            request.onerror = () => {
                console.error('Error getting all files from storage:', request.error);
                resolve({});
            };
        });
    }

    async cleanup(): Promise<void> {
        if (this.simpleDB.db) {
            try {
                console.log('Cleaning up IndexedDB...');
                this.simpleDB.db.close();
                console.log('IndexedDB cleanup completed');
            } catch (error) {
                console.error('Error during IndexedDB cleanup:', error);
            }
            this.simpleDB.db = null;
            this.isInitialized = false;
        }
    }

    // Get database status
    getStatus(): { initialized: boolean; connected: boolean } {
        return {
            initialized: this.isInitialized,
            connected: this.simpleDB.db !== null
        };
    }
}

export default OrbitDBService;
export type { FileRecord };
