import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast, IonLoading } from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import { saveOutline, documentText, lockClosed, mail, print, download, documentOutline, documentsOutline, layersOutline, imageOutline } from "ionicons/icons";
import { APP_NAME, LOGO } from "../../app-data.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import PasswordModal from '../PasswordModal/PasswordModal';
import { exportSpreadsheetAsPDF } from '../../services/exportAsPdf';
import { exportCSV, parseSocialCalcCSV, cleanCSVContent, validateCSVContent } from '../../services/exportAsCsv';
import { exportAllSheetsAsPDF as exportWorkbookPDFService } from '../../services/exportAllSheetsAsPdf';
import ApiService from '../service/Apiservice';
// import JSZip from 'jszip'; // Will be added later for zip functionality










const Menu: React.FC<{
  showM: boolean;
  setM: Function;
  file: string;
  updateSelectedFile: Function;
  store: Local;
  bT: number;
  currentFilePassword?: string | null;
  setCurrentFilePassword?: Function;
}> = (props) => {
  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [showAlert4, setShowAlert4] = useState(false);
  const [textFieldValue, setTextFieldValue] = useState("");
  const [showToast1, setShowToast1] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [nameError, setNameError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showLogoAlert, setShowLogoAlert] = useState(false);
  const [showCameraAlert, setShowCameraAlert] = useState(false);
  /* Utility functions */
  const _validateName = async (filename: string): Promise<boolean> => {
    filename = filename.trim();

    // Check for reserved names
    if (filename === "default" || filename === "Untitled") {
      setToastMessage("Cannot update default file!");
      return false;
    }

    // Check for empty filename
    if (filename === "" || !filename) {
      setToastMessage("Filename cannot be empty");
      return false;
    }

    // Check filename length
    if (filename.length > 30) {
      setToastMessage("Filename too long (max 30 characters)");
      return false;
    }

    if (filename.length < 2) {
      setToastMessage("Filename too short (min 2 characters)");
      return false;
    }

    // Check for valid characters (alphanumeric, spaces, hyphens, underscores only)
    if (!/^[a-zA-Z0-9-_ ]*$/.test(filename)) {
      setToastMessage("Only letters, numbers, spaces, hyphens and underscores are allowed");
      return false;
    }

    // Check if filename already exists
    if (await props.store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }

    return true;
  };

  const getCurrentFileName = (): string => {
    return props.file;
  };

  const _formatString = (filename: string): string => {
    /* Remove whitespaces */
    while (filename.indexOf(" ") !== -1) {
      filename = filename.replace(" ", "");
    }
    return filename;
  };

  const doPrint = () => {
    if (isPlatform("hybrid")) {
      const printer = Printer;
      printer.print(AppGeneral.getCurrentHTMLContent());
    } else {
      const content = AppGeneral.getCurrentHTMLContent();
      // useReactToPrint({ content: () => content });
      const printWindow = window.open("/printwindow", "Print Invoice");
      printWindow.document.write(content);
      printWindow.print();
    }
  };
  const doSave = async () => {
    if (props.file === "default") {
      setShowAlert1(true);
      return;
    }

    try {
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
      const data = await props.store._getFile(props.file);

      if (!data) {
        setToastMessage("File not found. Please save as a new file.");
        setShowToast1(true);
        return;
      }

      const file = new File(
        (data as any).created,
        new Date().toString(),
        content,
        props.file,
        props.bT
      );

      // Check if current file is password protected and we have the password
      if (props.currentFilePassword && props.store.isProtectedFile((data as any).content)) {
        // Save as protected file with the same password
        await props.store._saveProtectedFile(file, props.currentFilePassword);
      } else {
        // Save as regular file
        await props.store._saveFile(file);
      }

      props.updateSelectedFile(props.file);

      // Save as last opened file
      props.store._saveLastOpenedFile(props.file).catch(error => {
        console.error('Error saving last opened filename:', error);
      });

      setShowAlert2(true);
    } catch (error) {
      setToastMessage("Error saving file. Please try again.");
      setShowToast1(true);
    }
  };

  const doSaveAs = async (filename: string) => {
    if (!filename) {
      setToastMessage("Filename is required");
      setShowToast1(true);
      return;
    }

    try {
      if (await _validateName(filename)) {
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        const file = new File(
          new Date().toString(),
          new Date().toString(),
          content,
          filename,
          props.bT
        );

        await props.store._saveFile(file);
        props.updateSelectedFile(filename);

        // Save as last opened file
        props.store._saveLastOpenedFile(filename).catch(error => {
          console.error('Error saving last opened filename:', error);
        });

        // Clear password since this is a new unprotected file
        if (props.setCurrentFilePassword) {
          props.setCurrentFilePassword(null);
        }

        setShowAlert4(true);
      } else {
        setShowToast1(true);
      }
    } catch (error) {
      setToastMessage("Error saving file. Please try again.");
      setShowToast1(true);
    }
  };

  const doSaveAsProtected = async (name: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setLoadingMessage("Saving protected file...");

    try {
      if (await _validateName(name)) {
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        const file = new File(
          new Date().toString(),
          new Date().toString(),
          content,
          name,
          props.bT
        );

        // Save as protected file with AES encryption
        await props.store._saveProtectedFile(file, password);
        props.updateSelectedFile(name);

        // Save as last opened file
        props.store._saveLastOpenedFile(name).catch(error => {
          console.error('Error saving last opened filename:', error);
        });

        // Store password for future saves
        if (props.setCurrentFilePassword) {
          props.setCurrentFilePassword(password);
        }

        setIsLoading(false);
        setShowPasswordModal(false);
        setNameError("");
        setToastMessage("Protected file saved successfully!");
        setShowToast1(true);
        return true;
      } else {
        setNameError("Invalid filename");
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      setIsLoading(false);
      setNameError("Error saving protected file. Please try again.");
      return false;
    }
  };

  const sendEmail = () => {
    if (isPlatform("hybrid")) {
      const content = AppGeneral.getCurrentHTMLContent();
      const base64 = btoa(content);

      EmailComposer.open({
        to: ["jackdwell08@gmail.com"],
        cc: [],
        bcc: [],
        body: "PFA",
        attachments: [{ type: "base64", path: base64, name: "Invoice.html" }],
        subject: `${APP_NAME} attached`,
        isHtml: true,
      });
    } else {
      alert("This Functionality works on Anroid/IOS devices");
    }
  };

  const exportAsCsv = async () => {
    setIsLoading(true);
    setLoadingMessage("Preparing CSV export...");

    try {
      // Get and validate CSV content from SocialCalc
      const rawCsvContent = AppGeneral.getCleanCSVContent();

      // Validate CSV content
      const validation = validateCSVContent(rawCsvContent);
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid CSV content");
      }

      // Clean and parse the CSV content
      const cleanedCsvContent = cleanCSVContent(rawCsvContent);

      // Use the new export service
      await exportCSV(cleanedCsvContent, {
        filename: getCurrentFileName(),
        onProgress: setLoadingMessage,
      });

      setToastMessage('CSV file exported successfully!');
      setShowToast1(true);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setToastMessage(`Error exporting CSV: ${(error as Error).message}`);
      setShowToast1(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const exportAsPdf = async () => {
    setIsLoading(true);
    setLoadingMessage("Preparing PDF export...");

    try {
      // Get the spreadsheet container
      const spreadsheetContainer = AppGeneral.getSpreadsheetElement();

      if (!spreadsheetContainer) {
        throw new Error('Spreadsheet container not found');
      }

      // Use the new export service
      await exportSpreadsheetAsPDF(spreadsheetContainer, {
        filename: getCurrentFileName(),
        orientation: 'portrait',
        format: 'a4',
        quality: 2,
        onProgress: setLoadingMessage,
      });

      setToastMessage('PDF file exported successfully!');
      setShowToast1(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setToastMessage('Error generating PDF file. Please try again.');
      setShowToast1(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  // Logo functionality
  const addLogo = () => {
    setShowLogoAlert(true);
  };

  const removeLogo = async () => {
    setIsLoading(true);
    setLoadingMessage("Removing logo...");

    try {
      // Get device type for logo removal
      const deviceType = AppGeneral.getDeviceType ? AppGeneral.getDeviceType() : "default";

      // Call AppGeneral.removeLogo if it exists
      if (AppGeneral.removeLogo) {
        await AppGeneral.removeLogo(LOGO[deviceType] || LOGO.default);
        setToastMessage("Logo removed successfully");
        setShowToast1(true);
      } else {
        // Fallback implementation - remove logo from current spreadsheet
        // This would depend on how logos are stored in the spreadsheet
        setToastMessage("Logo removal functionality not available");
        setShowToast1(true);
      }
    } catch (error) {
      console.error('Error removing logo:', error);
      setToastMessage("Error removing logo. Please try again.");
      setShowToast1(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const sendLogoToServer = async (source: CameraSource) => {
    setIsLoading(true);
    setLoadingMessage("Taking photo...");

    try {
      // Request camera permissions for mobile
      if (isPlatform('hybrid')) {
        // Check camera permissions
        const permissions = await Camera.requestPermissions();
        if (permissions.camera !== 'granted') {
          setToastMessage("Camera permission is required to add logo");
          setShowToast1(true);
          return;
        }
      }

      setLoadingMessage("Opening camera...");

      // Take photo using Capacitor Camera
      const image = await Camera.getPhoto({
        quality: 50,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      console.log('image', image);

      if (!image.dataUrl) {
        setToastMessage("No image captured");
        setShowToast1(true);
        return;
      }

      setLoadingMessage("Processing image...");

      // The image.dataUrl already contains the base64 data URI
      const base64Image = image.dataUrl;

      // For now, we'll store the logo locally and add it to the spreadsheet
      // In a real implementation, you might want to upload to a server
      await addLogoToApp(base64Image);

    } catch (error) {
      console.error('Error capturing image:', error);
      setToastMessage("Error capturing image. Please try again.");
      setShowToast1(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const addLogoToApp = async (imageDataUrl: string) => {
    setLoadingMessage("Uploading logo to server...");

    try {
      // Extract base64 content from data URL
      const base64Content = imageDataUrl.split(',')[1]; // Remove "data:image/...;base64," prefix

      // Generate a unique filename for the logo
      const timestamp = Date.now();
      const fileName = `logo_${timestamp}.png`;

      // Upload logo to server using the uploadLogo endpoint
      const response = await ApiService.uploadLogo(fileName, base64Content);

      if (response.success && response.data.signedUrl) {
        setLoadingMessage("Adding logo to spreadsheet...");

        // Use the signed URL instead of the base64 data
        if (AppGeneral.addLogo) {
          const deviceType = AppGeneral.getDeviceType ? AppGeneral.getDeviceType() : "default";
          await AppGeneral.addLogo(LOGO[`${deviceType}`], response.data.signedUrl);
          setToastMessage("Logo added successfully");
          setShowToast1(true);
        } else {
          // Fallback: Store logo URL in localStorage for future use
          localStorage.setItem('spreadsheet_logo_url', response.data.signedUrl);
          setToastMessage("Logo uploaded successfully. Please refresh to see changes.");
          setShowToast1(true);
        }
      } else {
        throw new Error(response.message || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      setToastMessage("Error uploading logo. Please try again.");
      setShowToast1(true);
    }
  };

  // Workbook PDF export function using the new service
  const exportWorkbookAsPdf = async () => {
    setIsLoading(true);
    setLoadingMessage("Preparing workbook export...");

    try {
      // Get all sheets data from SocialCalc
      const sheetsData = AppGeneral.getAllSheetsData();

      if (!sheetsData || sheetsData.length === 0) {
        throw new Error("No sheets found to export");
      }

      // Use the new export service
      await exportWorkbookPDFService(sheetsData, {
        filename: "workbook_export",
        format: "a4",
        orientation: "landscape",
        margin: 15,
        quality: 1.5,
        onProgress: setLoadingMessage,
      });

      setToastMessage(`Workbook PDF with ${sheetsData.length} sheets exported successfully!`);
      setShowToast1(true);
    } catch (error) {
      console.error('Error exporting workbook PDF:', error);
      setToastMessage(`Error exporting workbook PDF: ${(error as Error).message}`);
      setShowToast1(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  return (
    <React.Fragment>
      <IonLoading
        isOpen={isLoading}
        message={loadingMessage || "Processing..."}
        spinner="crescent"
      />

      <IonActionSheet
        animated
        keyboardClose
        isOpen={props.showM}
        onDidDismiss={() => props.setM()}
        buttons={[
          {
            text: "Save",
            icon: saveOutline,
            handler: () => {
              doSave();
            },
          },
          {
            text: "Save As",
            icon: documentText,
            handler: () => {
              setShowAlert3(true);
            },
          },
          {
            text: "Save As Protected",
            icon: lockClosed,
            handler: () => {
              setShowPasswordModal(true);
            },
          },
          {
            text: "Print",
            icon: print,
            handler: () => {
              doPrint();
            },
          },
          {
            text: "Email",
            icon: mail,
            handler: () => {
              sendEmail();
            },
          },
          {
            text: "Export as CSV",
            icon: documentsOutline,
            handler: () => {
              exportAsCsv();
            },
          },
          {
            text: "Export as PDF",
            icon: documentOutline,
            handler: () => {
              exportAsPdf();
            },
          },
          {
            text: "Export Workbook as PDF",
            icon: layersOutline,
            handler: () => {
              exportWorkbookAsPdf();
            },
          },
          {
            text: "Add/Remove Logo",
            icon: imageOutline,
            handler: () => {
              addLogo();
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert1}
        onDidDismiss={() => setShowAlert1(false)}
        header="Alert Message"
        message={
          "Cannot update " + getCurrentFileName() + " file!"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert2}
        onDidDismiss={() => setShowAlert2(false)}
        header="Save"
        message={
          "File " +
          getCurrentFileName() +
          " updated successfully"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert3}
        onDidDismiss={() => setShowAlert3(false)}
        header="Save As"
        inputs={[
          { name: "filename", type: "text", placeholder: "Enter filename" },
        ]}
        buttons={[
          {
            text: "Ok",
            handler: (alertData) => {
              doSaveAs(alertData.filename);
            },
          },
        ]}
      />
      <IonAlert
        animated
        isOpen={showAlert4}
        onDidDismiss={() => setShowAlert4(false)}
        header="Save As"
        message={
          "File " +
          getCurrentFileName() +
          " saved successfully"
        }
        buttons={["Ok"]}
      />
      <IonToast
        animated
        isOpen={showToast1}
        onDidDismiss={() => {
          setShowToast1(false);
        }}
        position="bottom"
        message={toastMessage}
        duration={3000}
      />

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setNameError("");
        }}
        onSubmit={doSaveAsProtected}
        title="Save As Protected"
        submitText="Save Protected"
        showNameField={true}
        nameError={nameError}
      />

      {/* Logo Alert */}
      <IonAlert
        animated
        isOpen={showLogoAlert}
        onDidDismiss={() => setShowLogoAlert(false)}
        header="Logo"
        message="Do you want to Add or Remove Logo?"
        buttons={[
          {
            text: "Remove",
            handler: () => {
              removeLogo();
            },
          },
          {
            text: "Add",
            handler: () => {
              setShowCameraAlert(true);
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              console.log("Cancel clicked");
            },
          },
        ]}
      />

      {/* Camera Source Alert */}
      <IonAlert
        animated
        isOpen={showCameraAlert}
        onDidDismiss={() => setShowCameraAlert(false)}
        header="Complete action using"
        message="Do you want to add image from Camera or Photos?"
        buttons={[
          {
            text: "Camera",
            handler: () => {
              sendLogoToServer(CameraSource.Camera);
            },
          },
          {
            text: "Photos",
            handler: () => {
              sendLogoToServer(CameraSource.Photos);
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              console.log("Cancel clicked");
            },
          },
        ]}
      />
    </React.Fragment>
  );
};

export default Menu;
