import React, { useState, useEffect } from "react";
import "./Files.css";
import * as AppGeneral from "../socialcalc/index.js";
import { DATA } from "../../app-data.js";
import { Local } from "../Storage/LocalStorage";
import {
  IonIcon,
  IonModal,
  IonButton,
  IonAlert,
  IonSearchbar,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCheckbox,
  IonRow,
  IonCol,
  IonGrid,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonLoading,
} from "@ionic/react";
import { fileTrayFull, trash, create, shield, cloudUpload, downloadOutline } from "ionicons/icons";
import PasswordModal from "../PasswordModal/PasswordModal";
import ApiService, { DatabaseType } from "../service/Apiservice";

const Files: React.FC<{
  store: Local;
  file: string;
  updateSelectedFile: Function;
  updateBillType: Function;
  setCurrentFilePassword?: Function;
  isLoggedIn?: boolean;
}> = (props) => {
  const [modal, setModal] = useState(null);
  const [listFiles, setListFiles] = useState(false);
  const [showAlert1, setShowAlert1] = useState(false);
  const [currentKey, setCurrentKey] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [protectedFileName, setProtectedFileName] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: boolean }>({});
  const [uploading, setUploading] = useState(false);
  const [uploadAlert, setUploadAlert] = useState(false);
  const [uploadAlertMessage, setUploadAlertMessage] = useState("");
  const [selectedDatabase, setSelectedDatabase] = useState<string>("s3");
  const [activeTab, setActiveTab] = useState<string>("local");
  const [issuedFiles, setIssuedFiles] = useState<{ [key: string]: string }>({});
  const [loadingIssuedFiles, setLoadingIssuedFiles] = useState(false);
  const [retrievingFileName, setRetrievingFileName] = useState<string>("");

  const editFile = (key) => {
    props.store._getFile(key).then((data: any) => {
      AppGeneral.viewFile(key, data.content);
      props.updateSelectedFile(key);
      props.updateBillType(data.billType);
      // Clear password since this is a regular file
      if (props.setCurrentFilePassword) {
        props.setCurrentFilePassword(null);
      }
    });
  };

  const editProtectedFile = async (key: string, password: string): Promise<boolean> => {
    try {
      console.log("editProtectedFile: ", key, password);
      setPasswordError("");
      const data = await props.store._getProtectedFile(key, password);
      console.log("data: ", data);
      AppGeneral.viewFile(key, decodeURIComponent(data.content));
      props.updateSelectedFile(key);
      props.updateBillType(data.billType);

      // Store password in parent component for future saves
      if (props.setCurrentFilePassword) {
        props.setCurrentFilePassword(password);
      }

      // Update the file's password in Local Storage after successful password entry
      try {
        // Get the file data from Local Storage
        const fileData = await props.store._getFile(key);

        // Update the password field in the file data
        fileData.password = password;

        // Save the updated file data back to Local Storage
        await props.store._saveFile(fileData, false);
      } catch (err) {
        console.error("Failed to update password in Local Storage:", err);
      }

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

      // Check both new format (isPasswordProtected field) and old format (Protected_ prefix)
      const isProtected = fileData.isPasswordProtected === true || props.store.isProtectedFile(fileData.content);

      if (isProtected) {
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
  };

  const _formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const isProtectedFile = async (key: string): Promise<boolean> => {
    try {
      const fileData = await props.store._getFile(key);
      // Check both new format (isPasswordProtected field) and old format (Protected_ prefix)
      return fileData.isPasswordProtected === true || props.store.isProtectedFile(fileData.content);
    } catch (error) {
      return false;
    }
  };

  // Checkbox helper functions
  const toggleFileSelection = (key: string) => {
    setSelectedFiles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getSelectedFiles = () => {
    return Object.keys(selectedFiles).filter(key => selectedFiles[key]);
  };

  const hasSelectedFiles = () => {
    return getSelectedFiles().length > 0;
  };

  const clearSelectedFiles = () => {
    setSelectedFiles({});
  };

  // Upload functions

  const handleUpload = async () => {
    if (!props.isLoggedIn) {
      const databaseName = getDatabaseDisplayName(selectedDatabase);
      setUploadAlertMessage(`Please login first to upload files to ${databaseName}.`);
      setUploadAlert(true);
      return;
    }

    const selectedFileKeys = getSelectedFiles();
    if (selectedFileKeys.length === 0) {
      setUploadAlertMessage("No files selected for upload.");
      setUploadAlert(true);
      return;
    }

    setUploading(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const databaseName = getDatabaseDisplayName(selectedDatabase);

      for (const fileName of selectedFileKeys) {
        try {
          const fileData = await props.store._getFile(fileName);
          const content = fileData.content;
          const isPasswordProtected = fileData.isPasswordProtected || false;

          // Call unified upload function with the selected database
          await ApiService.uploadFile(selectedDatabase as DatabaseType, fileName, content, isPasswordProtected);
          successCount++;
        } catch (error) {
          console.error(`Error uploading ${fileName} to ${databaseName}:`, error);
          errorCount++;
        }
      }

      // Clear selections and close modal
      clearSelectedFiles();
      setListFiles(false);

      // Show result message
      if (successCount > 0 && errorCount === 0) {
        setUploadAlertMessage(`Successfully uploaded ${successCount} file(s) to ${databaseName}`);
      } else if (successCount > 0 && errorCount > 0) {
        setUploadAlertMessage(`Uploaded ${successCount} file(s), ${errorCount} failed`);
      } else {
        setUploadAlertMessage(`Failed to upload files to ${databaseName}`);
      }
      setUploadAlert(true);

    } catch (error) {
      const databaseName = getDatabaseDisplayName(selectedDatabase);
      console.error(`Batch upload to ${databaseName} error:`, error);
      setUploadAlertMessage(`Error during batch upload to ${databaseName}`);
      setUploadAlert(true);
    } finally {
      setUploading(false);
    }
  };

  const getDatabaseDisplayName = (database: string): string => {
    switch (database) {
      case 's3':
        return 'S3';
      case 'postgres':
        return 'PostgreSQL';
      case 'firebase':
        return 'Firebase';
      case 'mongo':
        return 'MongoDB';
      case 'neo4j':
        return 'Neo4j';
      case 'orbitdb':
        return 'OrbitDB';
      default:
        return database;
    }
  };

  // Load issued documents from Lighthouse
  const loadIssuedFiles = async () => {
    if (!props.isLoggedIn) {
      setUploadAlertMessage("Please login first to view issued documents.");
      setUploadAlert(true);
      return;
    }

    setLoadingIssuedFiles(true);
    try {
      const response = await ApiService.listAllLighthouse();
      if (response && response.files) {
        // Convert the files object from {fileName: number} to {fileName: string} format for dates
        const convertedFiles: { [key: string]: string } = {};
        Object.entries(response.files).forEach(([fileName, timestamp]) => {
          convertedFiles[fileName] = typeof timestamp === 'number' ? new Date(timestamp).toISOString() : String(timestamp);
        });
        setIssuedFiles(convertedFiles);
      } else {
        console.error("Failed to load issued files:", response);
        setIssuedFiles({});
      }
    } catch (error) {
      console.error("Error loading issued files:", error);
      setUploadAlertMessage("Error loading issued documents. Please try again.");
      setUploadAlert(true);
      setIssuedFiles({});
    } finally {
      setLoadingIssuedFiles(false);
    }
  };

  // Retrieve and view an issued document
  const retrieveIssuedFile = async (fileName: string) => {
    if (!props.isLoggedIn) {
      setUploadAlertMessage("Please login first to retrieve documents.");
      setUploadAlert(true);
      return;
    }

    setRetrievingFileName(fileName);
    setLoadingIssuedFiles(true);
    try {
      const response = await ApiService.getFileLighthouse(fileName);

      if (response.content) {
        // Close the modal and load the retrieved content
        setListFiles(false);
        AppGeneral.viewFile(fileName, response.content);
        props.updateSelectedFile(fileName);

        setUploadAlertMessage(`Issued document "${fileName}" retrieved successfully.`);
        setUploadAlert(true);
      } else {
        throw new Error("No content received from the server");
      }
    } catch (error) {
      console.error("Error retrieving issued file:", error);
      setUploadAlertMessage(`Error retrieving document "${fileName}". Please try again.`);
      setUploadAlert(true);
    } finally {
      setLoadingIssuedFiles(false);
      setRetrievingFileName("");
    }
  };

  const temp = async () => {
    const files = await props.store._getAllFiles();

    // Filter files based on search text
    const filteredFileKeys = Object.keys(files || {}).filter(key =>
      key.toLowerCase().includes(searchText.toLowerCase())
    );

    const fileListPromises = filteredFileKeys.map(async (key) => {
      const isProtected = await isProtectedFile(key);

      return (
        <div key={key} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white',
          minHeight: '60px'
        }}>
          {/* Checkbox - isolated click area */}
          <div style={{ marginRight: '16px', flexShrink: 0 }}>
            <IonCheckbox
              checked={selectedFiles[key] || false}
              onIonChange={() => toggleFileSelection(key)}
            />
          </div>

          {/* File info - clickable to open file */}
          <div
            style={{
              flex: 1,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0 // Allow text truncation
            }}
            onClick={() => handleFileClick(key)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '4px'
            }}>
              {isProtected && (
                <IonIcon
                  icon={shield}
                  color="primary"
                  style={{ marginRight: '8px', fontSize: '16px' }}
                />
              )}
              <span style={{
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {key}
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {_formatDate(files[key])}
            </div>
          </div>

          {/* Action buttons - isolated click areas */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginLeft: '16px',
            flexShrink: 0
          }}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleFileClick(key);
              }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <IonIcon
                icon={create}
                color="warning"
                size="large"
              />
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                setListFiles(false);
                deleteFile(key);
              }}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <IonIcon
                icon={trash}
                color="danger"
                size="large"
              />
            </div>
          </div>
        </div>
      );
    });

    const fileList = await Promise.all(fileListPromises);

    // Render issued files list
    const renderIssuedFiles = () => {
      const filteredIssuedFiles = Object.keys(issuedFiles).filter(key =>
        key.toLowerCase().includes(searchText.toLowerCase())
      );

      if (loadingIssuedFiles) {
        return (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            Loading issued documents...
          </div>
        );
      }

      if (filteredIssuedFiles.length === 0) {
        return (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            {searchText ? `No issued documents found matching "${searchText}"` : "No issued documents available"}
          </div>
        );
      }

      return filteredIssuedFiles.map((fileName) => (
        <div key={fileName} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid #e0e0e0',
          backgroundColor: 'white',
          minHeight: '60px'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '4px'
            }}>
              <span style={{
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#2dd36f' // Green color to indicate issued status
              }}>
                📋 {fileName}
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: '#666',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              Issued: {_formatDate(issuedFiles[fileName])}
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '16px',
            marginLeft: '16px',
            flexShrink: 0
          }}>
            <div
              onClick={() => retrieveIssuedFile(fileName)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <IonIcon
                icon={downloadOutline}
                color="primary"
                size="large"
              />
            </div>
          </div>
        </div>
      ));
    };

    const ourModal = (
      <IonModal isOpen={listFiles} onDidDismiss={() => {
        setListFiles(false);
        clearSelectedFiles(); // Clear selections when modal closes
      }}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              {activeTab === "local"
                ? `Files (${filteredFileKeys.length})`
                : `Issued Docs (${Object.keys(issuedFiles).filter(key => key.toLowerCase().includes(searchText.toLowerCase())).length})`
              }
            </IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {/* Segment for switching between tabs */}
          <IonSegment
            value={activeTab}
            onIonChange={(e) => {
              const newTab = e.detail.value as string;
              setActiveTab(newTab);
              setSearchText(""); // Clear search when switching tabs
              if (newTab === "issued") {
                loadIssuedFiles(); // Load issued files when switching to that tab
              }
            }}
            style={{ margin: '16px' }}
          >
            <IonSegmentButton value="local">
              <IonLabel>Local Files</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="issued">
              <IonLabel>Issued Docs</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <IonSearchbar
            value={searchText}
            placeholder={activeTab === "local" ? "Search files..." : "Search issued documents..."}
            onIonInput={(e) => setSearchText(e.detail.value!)}
            showClearButton="focus"
            debounce={300}
          />

          {/* Upload controls - only show for local files tab */}
          {activeTab === "local" && hasSelectedFiles() && (
            <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
              <IonGrid>
                <IonRow>
                  <IonCol size="6">
                    <IonSelect
                      value={selectedDatabase}
                      placeholder="Select Database"
                      onIonChange={(e) => setSelectedDatabase(e.detail.value)}
                      interface="popover"
                      style={{
                        '--background': 'white',
                        '--border-radius': '8px',
                        '--padding': '8px 12px'
                      }}
                    >
                      <IonSelectOption value="s3">🗄️ S3</IonSelectOption>
                      <IonSelectOption value="postgres">🐘 PostgreSQL</IonSelectOption>
                      <IonSelectOption value="firebase">🔥 Firebase</IonSelectOption>
                      <IonSelectOption value="mongo">🍃 MongoDB</IonSelectOption>
                      <IonSelectOption value="neo4j">🔗 Neo4j</IonSelectOption>
                      <IonSelectOption value="orbitdb">🌌 OrbitDB</IonSelectOption>
                    </IonSelect>
                  </IonCol>
                  <IonCol size="6">
                    <IonButton
                      expand="block"
                      color="primary"
                      onClick={handleUpload}
                      disabled={uploading}
                    >
                      <IonIcon icon={cloudUpload} slot="start" />
                      Upload to
                    </IonButton>
                  </IonCol>
                </IonRow>
              </IonGrid>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginTop: '8px' }}>
                {getSelectedFiles().length} file(s) selected
              </div>
            </div>
          )}

          <div style={{ paddingBottom: '80px' }}>
            {activeTab === "local" ? (
              fileList.length > 0 ? (
                fileList
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px'
                }}>
                  {searchText ? `No files found matching "${searchText}"` : "No files available"}
                </div>
              )
            ) : (
              renderIssuedFiles()
            )}
          </div>
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
              clearSelectedFiles(); // Clear selections when closing
              setActiveTab("local"); // Reset to local tab when closing
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
  }, [listFiles, searchText, selectedFiles, selectedDatabase, activeTab, issuedFiles]);

  return (
    <React.Fragment>
      <IonLoading
        isOpen={loadingIssuedFiles && !!retrievingFileName}
        message={`Retrieving "${retrievingFileName}"...`}
        spinner="crescent"
      />

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
      <IonAlert
        animated
        isOpen={uploadAlert}
        onDidDismiss={() => setUploadAlert(false)}
        header="Upload Status"
        message={uploadAlertMessage}
        buttons={["OK"]}
      />
    </React.Fragment>
  );
};

export default Files;
