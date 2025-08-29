import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast, IonLoading } from "@ionic/react";
import gmailService from '../../services/gmailService';
import AlternativeGmailService from '../../services/gmailServiceAlternative';
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
import { exportSpreadsheetAsPDF, exportSpreadsheetAsPDFForEmail } from '../../services/exportAsPdf';
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
  const [showEmailRecipientAlert, setShowEmailRecipientAlert] = useState(false);
  const [showFileTypeAlert, setShowFileTypeAlert] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [selectedFileType, setSelectedFileType] = useState("csv");
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

  const _validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (data:type;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper function to generate MSC file (SocialCalc format)
  const generateMSCFile = async (filename: string): Promise<Blob> => {
    setLoadingMessage("Generating MSC file...");

    // Get the current sheet data in SocialCalc native format
    // This uses the same method as getAllSheetsCSV but gets the raw save format
    try {
      const control = (window as any).SocialCalc?.GetCurrentWorkBookControl?.();
      if (!control?.workbook?.spreadsheet?.editor?.context) {
        throw new Error("No active sheet found for MSC export");
      }

      const sheet = control.workbook.spreadsheet.editor.context;
      const saveStr = sheet.CreateSheetSave();

      if (!saveStr) {
        throw new Error("Failed to generate SocialCalc save data");
      }

      // Create blob with proper MIME type for MSC (SocialCalc native format)
      const blob = new Blob([saveStr], {
        type: 'application/octet-stream'
      });

      return blob;
    } catch (error) {
      console.error("Error generating MSC file:", error);
      throw new Error("Failed to generate MSC file. Please ensure the document is loaded.");
    }
  };

  // Optimized file generation based on selected type with performance improvements
  const generateFileByType = async (fileType: string, filename: string) => {
    console.log("generateFileByType called with:", { fileType, filename });
    const startTime = performance.now();

    try {
      switch (fileType) {
        case 'csv':
          setLoadingMessage("Generating CSV file...");
          const rawCsvContent = AppGeneral.getCleanCSVContent();
          const validation = validateCSVContent(rawCsvContent);
          if (!validation.isValid) {
            throw new Error(`Invalid CSV content: ${validation.error}`);
          }
          const cleanedCsvContent = cleanCSVContent(rawCsvContent);
          return await exportCSV(cleanedCsvContent, {
            filename: filename,
            returnBlob: true,
            onProgress: setLoadingMessage,
          }) as Blob;

        case 'pdf':
          setLoadingMessage("Generating optimized PDF for email...");
          const spreadsheetContainer = AppGeneral.getSpreadsheetElement();
          if (!spreadsheetContainer) {
            throw new Error('Spreadsheet container not found');
          }
          // Use specialized email-optimized PDF function for faster generation and smaller size
          return await exportSpreadsheetAsPDFForEmail(spreadsheetContainer, {
            filename: filename,
            orientation: 'landscape',
            format: 'a4',
            quality: 0.6, // Optimized for email
            margin: 5,
            onProgress: setLoadingMessage,
          });

        case 'msc':
          return await generateMSCFile(filename);

        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } finally {
      const endTime = performance.now();
      console.log(`File generation (${fileType}) took ${(endTime - startTime).toFixed(2)}ms`);
    }
  };

  // Get file extension and MIME type based on file type
  const getFileInfo = (fileType: string) => {
    switch (fileType) {
      case 'csv':
        return { extension: '.csv', mimeType: 'text/csv' };
      case 'pdf':
        return { extension: '.pdf', mimeType: 'application/pdf' };
      case 'msc':
        return { extension: '.msc', mimeType: 'application/octet-stream' };
      default:
        return { extension: '.csv', mimeType: 'text/csv' };
    }
  };

  const sendEmailMobile = async (recipientEmail: string, fileType: string = "csv") => {
    setLoadingMessage("Preparing mobile email...");

    try {
      const filename = getCurrentFileName() || 'Document';
      const fileInfo = getFileInfo(fileType);

      // Generate only the selected file type for better performance
      setLoadingMessage(`Generating ${fileType.toUpperCase()} file for mobile...`);
      const fileBlob = await generateFileByType(fileType, filename);

      setLoadingMessage("Saving file for sharing...");

      // Save file to device using Capacitor Filesystem
      const fileName = `${filename}${fileInfo.extension}`;

      // Convert blob to base64 for Capacitor
      const fileBase64 = await blobToBase64(fileBlob);

      // Save file
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: fileBase64,
        directory: Directory.Cache,
      });

      setLoadingMessage("Opening email app...");

      const emailSubject = `${APP_NAME} - ${filename} attached (${fileType.toUpperCase()})`;
      const emailText = `Dear Recipient,

Please find attached the document generated from ${APP_NAME} in ${fileType.toUpperCase()} format.

Document: ${filename}
Generated on: ${new Date().toLocaleString()}

Attachment:
- ${fileName} - Document in ${fileType.toUpperCase()} format

Best regards,
${APP_NAME} Team

---
To: ${recipientEmail}`;

      // Use Capacitor Share API for mobile
      await Share.share({
        title: emailSubject,
        text: emailText,
        files: [savedFile.uri],
        dialogTitle: 'Share via Email'
      });

      setToastMessage(`Email app opened with ${fileType.toUpperCase()} attachment!`);
      setShowToast1(true);

    } catch (error) {
      console.error("Mobile email error:", error);
      throw new Error(`Mobile email failed: ${(error as Error).message}`);
    }
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

      // Check if current file is password protected
      const isCurrentFileProtected = (data as any).isPasswordProtected === true ||
        props.store.isProtectedFile((data as any).content);

      const file = new File(
        (data as any).created,
        new Date().toString(),
        content,
        props.file,
        props.bT,
        isCurrentFileProtected, // Pass the protection status
        props.currentFilePassword || (data as any).password // Use current password or stored password
      );

      // Save using the unified method (handles encryption automatically)
      await props.store._saveFile(file);

      props.updateSelectedFile(props.file);

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
    // First show file type selection
    setShowFileTypeAlert(true);
  };

  const doSendEmailWithRecipient = async (recipientEmail: string, fileType: string = "csv") => {
    if (!recipientEmail || !_validateEmail(recipientEmail)) {
      setToastMessage("Please enter a valid email address");
      setShowToast1(true);
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Preparing email...");

    // Check if running on mobile platform
    const isMobile = isPlatform('hybrid');
    const isAndroid = isPlatform('android');
    const isIOS = isPlatform('ios');

    console.log(`Platform detection - Mobile: ${isMobile}, Android: ${isAndroid}, iOS: ${isIOS}`);

    try {
      // For mobile platforms, try native email first if Gmail API fails
      if (isMobile) {
        try {
          await sendEmailMobile(recipientEmail, fileType);
          return;
        } catch (mobileError) {
          console.log("Mobile email failed, trying Gmail API:", mobileError);
          setLoadingMessage("Mobile email unavailable, trying Gmail API...");
        }
      }

      // Get the current HTML content
      const content = AppGeneral.getCurrentHTMLContent();

      if (!content || content.trim().length === 0) {
        throw new Error("No content available to send. Please ensure the document is loaded.");
      }

      setLoadingMessage("Initializing Gmail API...");

      // Initialize Gmail service with retry logic
      let initRetries = 0;
      const maxInitRetries = 3;

      while (initRetries < maxInitRetries) {
        try {
          await gmailService.initGoogleAuth();
          break;
        } catch (initError) {
          initRetries++;
          if (initRetries >= maxInitRetries) {
            throw new Error("Failed to initialize Gmail API after multiple attempts. Please refresh the page and try again.");
          }
          setLoadingMessage(`Retrying Gmail initialization... (${initRetries}/${maxInitRetries})`);
          // Wait a moment before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setLoadingMessage("Checking authentication...");

      // Check if user is signed in, if not, sign them in
      if (!gmailService.isUserSignedIn()) {
        setLoadingMessage("Please sign in to Gmail when prompted...");

        try {
          await gmailService.signIn();
        } catch (authError) {
          if (authError instanceof Error) {
            if (authError.message.includes("cancelled") || authError.message.includes("popup_closed_by_user")) {
              throw new Error("Sign-in was cancelled. Please try again to send the email.");
            } else if (authError.message.includes("popup_blocked")) {
              throw new Error("Popup was blocked. Please enable popups for this site and try again.");
            } else if (authError.message.includes("access_denied")) {
              throw new Error("Permission denied. Please allow the app to send emails on your behalf.");
            }
          }
          throw authError;
        }
      }

      setLoadingMessage("Preparing email attachment...");

      const filename = getCurrentFileName() || 'Document';
      const fileInfo = getFileInfo(fileType);

      // Generate only the selected file type for better performance
      const fileBlob = await generateFileByType(fileType, filename);

      // Convert blob to base64 for email attachment
      const fileBase64 = await blobToBase64(fileBlob);

      const attachments = [
        {
          name: `${filename}${fileInfo.extension}`,
          content: fileBase64,
          type: fileInfo.mimeType
        }
      ];

      setLoadingMessage("Sending email via Gmail...");

      // Send email using Gmail API
      await gmailService.sendHtmlEmail(
        [recipientEmail], // to - use user-provided email
        `${APP_NAME} - ${filename} attached (${fileType.toUpperCase()})`, // subject
        `<div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <p>Dear Recipient,</p>
          <p>Please find attached the document generated from ${APP_NAME} in ${fileType.toUpperCase()} format.</p>
          <p><strong>Document:</strong> ${filename}</p>
          <p><strong>Attachment:</strong></p>
          <ul>
            <li>${filename}${fileInfo.extension} - Document in ${fileType.toUpperCase()} format</li>
          </ul>
          <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          <p>Best regards,<br>
          ${APP_NAME} Team</p>
        </div>`, // HTML body
        attachments, // attachments
        {
          cc: [],
          bcc: []
        }
      );

      setToastMessage(`Email sent successfully via Gmail with ${fileType.toUpperCase()} attachment!`);
      setShowToast1(true);
    } catch (error) {
      console.error("Error sending email via Gmail API:", error);

      // Try fallback method
      setLoadingMessage("Trying alternative email method...");

      try {
        setLoadingMessage("Preparing fallback email with attachments...");

        // Generate CSV and PDF for fallback method
        const rawCsvContent = AppGeneral.getCleanCSVContent();
        console.log("Fallback raw CSV content:", rawCsvContent); // Debug log

        // Validate CSV content
        const validation = validateCSVContent(rawCsvContent);
        if (!validation.isValid) {
          console.warn(`CSV validation failed: ${validation.error}`);
        }

        const cleanedCsvContent = cleanCSVContent(rawCsvContent);
        console.log("Fallback cleaned CSV content:", cleanedCsvContent); // Debug log
        const csvBlob = await exportCSV(cleanedCsvContent, {
          filename: getCurrentFileName() || 'Document',
          returnBlob: true,
        }) as Blob;

        const spreadsheetContainer = AppGeneral.getSpreadsheetElement();
        const pdfBlob = spreadsheetContainer ? await exportSpreadsheetAsPDF(spreadsheetContainer, {
          filename: getCurrentFileName() || 'Document',
          orientation: 'landscape',
          format: 'a4',
          quality: 1.5,
          returnBlob: true,
        }) as Blob : null;

        // Convert blobs to downloadable content
        const csvContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsText(csvBlob);
        });

        // Convert PDF blob to text content if available
        const pdfContent = pdfBlob ? await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(pdfBlob);
        }) : null;

        const additionalAttachments = [];
        if (pdfContent) {
          additionalAttachments.push({
            name: `${getCurrentFileName() || 'Document'}.pdf`,
            content: pdfContent.split(',')[1], // Remove data URL prefix
            type: 'application/pdf'
          });
        }

        const emailData = {
          to: recipientEmail, // use user-provided email
          subject: `${APP_NAME} - ${getCurrentFileName() || 'Document'} with CSV and PDF attachments`,
          body: `Dear Recipient,

Please find the document generated from ${APP_NAME}.

Document: ${getCurrentFileName() || 'Document'}
Generated on: ${new Date().toLocaleString()}

This email includes:
- CSV file: ${getCurrentFileName() || 'Document'}.csv (spreadsheet data)
- PDF file: ${getCurrentFileName() || 'Document'}.pdf (formatted document)

Please download these files when the email compose window opens.

Best regards,
${APP_NAME} Team`,
          attachmentName: `${getCurrentFileName() || 'Document'}.csv`,
          attachmentContent: csvContent,
          additionalAttachments
        };

        // Use alternative email service
        AlternativeGmailService.sendEmailFallback(emailData);

        setToastMessage("Gmail API failed. Opening alternative email method...");
        setShowToast1(true);
      } catch (fallbackError) {
        console.error("Fallback email method also failed:", fallbackError);

        let errorMessage = "Failed to send email. ";

        if (error instanceof Error) {
          if (error.message.includes("credentials not configured")) {
            errorMessage = "Gmail API is not configured. Please check the setup documentation or use the file download feature.";
          } else if (error.message.includes("popup") || error.message.includes("blocked")) {
            errorMessage = "Popup was blocked. Please enable popups for this site and try again, or use the file download feature.";
          } else if (error.message.includes("cancelled")) {
            errorMessage = "Sign-in was cancelled. Please try again or use the file download feature.";
          } else if (error.message.includes("Permission") || error.message.includes("access_denied")) {
            errorMessage = "Permission denied. Please grant email permissions or use the file download feature.";
          } else if (error.message.includes("network") || error.message.includes("internet")) {
            errorMessage = "Network error. Please check your internet connection and try again.";
          } else if (error.message.includes("initialize") || error.message.includes("timeout")) {
            errorMessage = "Gmail API initialization failed. Please refresh the page and try again.";
          } else {
            errorMessage += error.message + " You can still download the file manually.";
          }
        } else {
          errorMessage += "An unknown error occurred. You can still download the file manually.";
        }

        setToastMessage(errorMessage);
        setShowToast1(true);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
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

      {/* File Type Selection Alert */}
      <IonAlert
        animated
        isOpen={showFileTypeAlert}
        onDidDismiss={() => {
          setShowFileTypeAlert(false);
        }}
        header="Select File Type"
        message="Choose the file format for email attachment:"
        buttons={[
          {
            text: "CSV File (Recommended)",
            handler: () => {
              console.log("CSV selected");
              setSelectedFileType("csv");
              setShowFileTypeAlert(false);
              setShowEmailRecipientAlert(true);
              return true;
            },
          },
          {
            text: "PDF File",
            handler: () => {
              console.log("PDF selected");
              setSelectedFileType("pdf");
              setShowFileTypeAlert(false);
              setShowEmailRecipientAlert(true);
              return true;
            },
          },
          {
            text: "MSC File",
            handler: () => {
              console.log("MSC selected");
              setSelectedFileType("msc");
              setShowFileTypeAlert(false);
              setShowEmailRecipientAlert(true);
              return true;
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setSelectedFileType("csv");
              return true;
            },
          },
        ]}
      />

      {/* Email Recipient Input Alert */}
      <IonAlert
        animated
        isOpen={showEmailRecipientAlert}
        onDidDismiss={() => {
          setShowEmailRecipientAlert(false);
          setRecipientEmail("");
        }}
        header="Send Email"
        message={`Enter recipient's email address (File type: ${selectedFileType.toUpperCase()}):`}
        inputs={[
          {
            name: "recipientEmail",
            type: "email",
            placeholder: "recipient@example.com",
            value: recipientEmail,
          },
        ]}
        buttons={[
          {
            text: "Back",
            handler: () => {
              setShowEmailRecipientAlert(false);
              setShowFileTypeAlert(true);
              return true;
            },
          },
          {
            text: "Cancel",
            role: "cancel",
            handler: () => {
              setRecipientEmail("");
              setSelectedFileType("csv");
            },
          },
          {
            text: "Send Email",
            handler: (alertData) => {
              const email = alertData.recipientEmail?.trim();

              if (!email) {
                setToastMessage("Please enter an email address");
                setShowToast1(true);
                return false; // Keep alert open
              }
              if (!_validateEmail(email)) {
                setToastMessage("Please enter a valid email address");
                setShowToast1(true);
                return false; // Keep alert open
              }
              console.log("Final email send - Selected file type:", selectedFileType);
              setRecipientEmail(email);
              setShowEmailRecipientAlert(false);
              doSendEmailWithRecipient(email, selectedFileType);
              return true;
            },
          },
        ]}
      />
    </React.Fragment>
  );
};

export default Menu;
