import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Local } from "../components/Storage/LocalStorage";

interface AppContextType {
    selectedFile: string;
    billType: number;
    store: Local;
    updateSelectedFile: (fileName: string) => void;
    updateBillType: (type: number) => void;
    autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
    setAutoSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error("useApp must be used within an AppProvider");
    }
    return context;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [selectedFile, setSelectedFile] = useState<string>("default");
    const [billType, setBillType] = useState<number>(1);
    const [store] = useState(() => new Local());
    const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load persisted state
    useEffect(() => {
        try {
            const savedFile = localStorage.getItem("app-selected-file");
            const savedBillType = localStorage.getItem("app-bill-type");

            if (savedFile && savedFile !== "null") setSelectedFile(savedFile);
            if (savedBillType) {
                const parsedBillType = parseInt(savedBillType, 10);
                if (!isNaN(parsedBillType)) setBillType(parsedBillType);
            }
        } catch (error) {
            // Silently fail and use defaults - this is not critical for app functionality
        }
    }, []);

    // Persist state changes
    useEffect(() => {
        try {
            localStorage.setItem("app-selected-file", selectedFile);
        } catch (error) {
            // Silently fail - not critical for app functionality
        }
    }, [selectedFile]);

    useEffect(() => {
        try {
            localStorage.setItem("app-bill-type", billType.toString());
        } catch (error) {
            // Silently fail - not critical for app functionality
        }
    }, [billType]);

    const updateSelectedFile = (fileName: string) => setSelectedFile(fileName);
    const updateBillType = (type: number) => setBillType(type);

    const value: AppContextType = {
        selectedFile,
        billType,
        store,
        updateSelectedFile,
        updateBillType,
        autoSaveStatus,
        setAutoSaveStatus,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}; 