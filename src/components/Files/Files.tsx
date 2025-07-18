import React, { useState, useEffect } from "react";
import "./Files.css";
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
  IonSearchbar,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from "@ionic/react";
import { fileTrayFull, trash, create, shield } from "ionicons/icons";
import PasswordModal from "../PasswordModal/PasswordModal";

const Files: React.FC<{
  store: Local;
  file: string;
  updateSelectedFile: Function;
  updateBillType: Function;
  setCurrentFilePassword?: Function;
}> = (props) => {
  const [modal, setModal] = useState(null);
  const [listFiles, setListFiles] = useState(false);
  const [showAlert1, setShowAlert1] = useState(false);
  const [currentKey, setCurrentKey] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [protectedFileName, setProtectedFileName] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [searchText, setSearchText] = useState("");

  const editFile = (key) => {
    props.store._getFile(key).then((data) => {
      AppGeneral.viewFile(key, decodeURIComponent((data as any).content));
      props.updateSelectedFile(key);
      props.updateBillType((data as any).billType);
      // Clear password since this is a regular file
      if (props.setCurrentFilePassword) {
        props.setCurrentFilePassword(null);
      }

      // Save as last opened file
      props.store._saveLastOpenedFile(key).catch(error => {
        console.error('Error saving last opened filename:', error);
      });
    });
  };

  const editProtectedFile = async (key: string, password: string): Promise<boolean> => {
    try {
      setPasswordError("");
      const data = await props.store._getProtectedFile(key, password);
      AppGeneral.viewFile(key, decodeURIComponent(data.content));
      props.updateSelectedFile(key);
      props.updateBillType(data.billType);

      // Store password in parent component for future saves
      if (props.setCurrentFilePassword) {
        props.setCurrentFilePassword(password);
      }

      // Save as last opened file
      props.store._saveLastOpenedFile(key).catch(error => {
        console.error('Error saving last opened filename:', error);
      });

      return true;
    } catch (error) {
      console.error("Error opening protected file:", error);
      setPasswordError("Incorrect password or corrupted file. Please try again.");
      return false;
    }
  };

  const handleFileClick = async (key) => {
    try {
      // First check if it's a protected file
      const fileData = await props.store._getFile(key);

      if (props.store.isProtectedFile(fileData.content)) {
        // It's a protected file, show password modal
        setProtectedFileName(key);
        setShowPasswordModal(true);
      } else {
        // Regular file, open normally
        setListFiles(false);
        editFile(key);
      }
    } catch (error) {
      console.error("Error checking file:", error);
      // If there's an error, try to open as regular file
      setListFiles(false);
      editFile(key);
    }
  };

  const deleteFile = (key) => {
    setShowAlert1(true);
    setCurrentKey(key);
  };

  const loadDefault = () => {
    const msc = DATA["home"][AppGeneral.getDeviceType()]["msc"];
    AppGeneral.viewFile("default", JSON.stringify(msc));
    props.updateSelectedFile("default");

    // Save as last opened file
    props.store._saveLastOpenedFile("default").catch(error => {
      console.error('Error saving last opened filename:', error);
    });
  };

  const _formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const isProtectedFile = async (key: string): Promise<boolean> => {
    try {
      const fileData = await props.store._getFile(key);
      return props.store.isProtectedFile(fileData.content);
    } catch (error) {
      return false;
    }
  };

  const temp = async () => {
    const files = await props.store._getAllFiles();

    // Filter files based on search text
    const filteredFileKeys = Object.keys(files).filter(key =>
      key.toLowerCase().includes(searchText.toLowerCase())
    );

    const fileListPromises = filteredFileKeys.map(async (key) => {
      const isProtected = await isProtectedFile(key);

      return (
        <IonItemGroup key={key}>
          <IonItem>
            <IonLabel>
              {isProtected && (
                <IonIcon
                  icon={shield}
                  color="primary"
                  style={{ marginRight: '8px', fontSize: '16px' }}
                />
              )}
              {key}
            </IonLabel>
            {_formatDate(files[key])}

            <IonIcon
              icon={create}
              color="warning"
              slot="end"
              size="large"
              onClick={() => handleFileClick(key)}
            />

            <IonIcon
              icon={trash}
              color="danger"
              slot="end"
              size="large"
              onClick={() => {
                setListFiles(false);
                deleteFile(key);
              }}
            />
          </IonItem>
        </IonItemGroup>
      );
    });

    const fileList = await Promise.all(fileListPromises);

    const ourModal = (
      <IonModal isOpen={listFiles} onDidDismiss={() => setListFiles(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Files ({filteredFileKeys.length})</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <IonSearchbar
            value={searchText}
            placeholder="Search files..."
            onIonInput={(e) => setSearchText(e.detail.value!)}
            showClearButton="focus"
            debounce={300}
          />
          <IonList style={{ paddingBottom: '80px' }}>
            {fileList.length > 0 ? (
              fileList
            ) : (
              <IonItem>
                <IonLabel>
                  {searchText ? `No files found matching "${searchText}"` : "No files available"}
                </IonLabel>
              </IonItem>
            )}
          </IonList>
        </IonContent>
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
            onClick={() => {
              setListFiles(false);
              setSearchText(""); // Clear search when closing
            }}
          >
            Back
          </IonButton>
        </div>
      </IonModal>
    );
    setModal(ourModal);
  };

  useEffect(() => {
    temp();
  }, [listFiles, searchText]);

  return (
    <React.Fragment>
      <IonIcon
        icon={fileTrayFull}
        className="ion-padding-end"
        slot="end"
        size="large"
        onClick={() => {
          setListFiles(true);
        }}
      />
      {modal}
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Delete file"
        message={"Do you want to delete the " + currentKey + " file?"}
        buttons={[
          { text: "No", role: "cancel" },
          {
            text: "Yes",
            handler: () => {
              props.store._deleteFile(currentKey);
              loadDefault();
              setCurrentKey(null);
            },
          },
        ]}
      />
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setProtectedFileName("");
          setPasswordError("");
        }}
        onSubmit={async (name: string, password: string) => {
          const success = await editProtectedFile(protectedFileName, password);
          if (success) {
            setListFiles(false);
          }
          return success;
        }}
        title="Enter Password"
        submitText="Open File"
        showNameField={false}
        passwordError={passwordError}
      />
    </React.Fragment>
  );
};

export default Files;
