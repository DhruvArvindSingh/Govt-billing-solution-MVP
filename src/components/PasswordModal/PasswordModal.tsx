import React, { useState } from "react";
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonText,
    IonIcon,
} from "@ionic/react";
import { checkmark, close } from "ionicons/icons";
import { Local } from "../Storage/LocalStorage";

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, password: string) => Promise<boolean>;
    title?: string;
    submitText?: string;
    showNameField?: boolean;
    nameError?: string;
    passwordError?: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    title = "Save As Protected",
    submitText = "Save",
    showNameField = true,
    nameError = "",
    passwordError = "",
}) => {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [localNameError, setLocalNameError] = useState("");
    const [localPasswordError, setLocalPasswordError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const localStore = new Local();

    const validatePassword = (pwd: string): string => {
        if (pwd.length < 4) {
            return "Password must be at least 8 characters long";
        }
        if (pwd.length > 128) {
            return "Password cannot exceed 128 characters";
        }
        return "";
    };

    const validateName = async (fileName: string): Promise<string> => {
        if (!fileName.trim()) {
            return "File name is required";
        }
        if (fileName.trim().length < 3) {
            return "File name must be at least 3 characters long";
        }
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(fileName.trim())) {
            return "File name can only contain letters, numbers, spaces, hyphens, and underscores";
        }
        // console.log(`localStore._checkKey(fileName.trim()): `, await localStore._checkKey(fileName.trim()));
        if (await localStore._checkKey(fileName.trim())) {
            return "File name already exists";
        }

        if (fileName.trim() === "default") {
            return "File name cannot be 'default'";
        }
        if (fileName.trim() === "__last_opened_file__") {
            return "File name cannot be '__last_opened_file__'";
        }
        return "";
    };

    const handleSubmit = async () => {
        setLocalNameError("");
        setLocalPasswordError("");

        let hasError = false;

        if (showNameField) {
            const nameValidationError = await validateName(name);
            if (nameValidationError) {
                setLocalNameError(nameValidationError);
                hasError = true;
            }
        }

        const passwordValidationError = validatePassword(password);
        if (passwordValidationError) {
            setLocalPasswordError(passwordValidationError);
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await onSubmit(name.trim(), password);
            if (success) {
                handleClose();
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName("");
        setPassword("");
        setLocalNameError("");
        setLocalPasswordError("");
        onClose();
    };

    const currentNameError = nameError || localNameError;
    const currentPasswordError = passwordError || localPasswordError;

    return (
        <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
            <IonHeader>
                <IonToolbar color="primary">
                    <IonTitle>{title}</IonTitle>
                    <IonButton
                        slot="end"
                        fill="clear"
                        color="light"
                        onClick={handleClose}
                    >
                        <IonIcon icon={close} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>
            <IonContent className="ion-padding">
                {showNameField && (
                    <IonItem>
                        <IonLabel position="stacked">File Name *</IonLabel>
                        <IonInput
                            value={name}
                            placeholder="Enter file name"
                            onIonInput={(e) => setName(e.detail.value!)}
                            clearInput
                        />
                    </IonItem>
                )}
                {currentNameError && (
                    <IonText color="danger">
                        <p style={{ fontSize: "0.8rem", marginLeft: "16px", marginTop: "4px" }}>
                            {currentNameError}
                        </p>
                    </IonText>
                )}

                <IonItem style={{ marginTop: showNameField ? "16px" : "0" }}>
                    <IonLabel position="stacked">Password *</IonLabel>
                    <IonInput
                        type="password"
                        value={password}
                        placeholder="Enter password"
                        onIonInput={(e) => setPassword(e.detail.value!)}
                        clearInput
                    />
                </IonItem>
                {currentPasswordError && (
                    <IonText color="danger">
                        <p style={{ fontSize: "0.8rem", marginLeft: "16px", marginTop: "4px" }}>
                            {currentPasswordError}
                        </p>
                    </IonText>
                )}

                <div style={{ marginTop: "24px" }}>
                    <IonButton
                        expand="block"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        <IonIcon icon={checkmark} slot="start" />
                        {isSubmitting ? "Processing..." : submitText}
                    </IonButton>
                    <IonButton
                        expand="block"
                        fill="outline"
                        color="medium"
                        onClick={handleClose}
                        style={{ marginTop: "8px" }}
                    >
                        Cancel
                    </IonButton>
                </div>

                {showNameField && (
                    <IonText color="medium">
                        <p style={{ fontSize: "0.7rem", marginTop: "16px", textAlign: "center" }}>
                            Password requirements: 8+ characters, uppercase, lowercase, number, and special character (@$!%*?&)
                        </p>
                    </IonText>
                )}
            </IonContent>
        </IonModal>
    );
};

export default PasswordModal; 