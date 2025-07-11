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
// import JSZip from 'jszip'; // Will be added later for zip functionality

// Export interfaces and types
export interface ExportAllSheetsOptions {
  filename?: string;
  format?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  margin?: number;
  quality?: number;
  onProgress?: (message: string) => void;
  returnBlob?: boolean;
}

export interface SheetData {
  id: string;
  name: string;
  element: HTMLElement;
}

// Function to export all sheets as PDF using the new logic structure
const exportWorkbookAsPdf = async () => {
  const options: ExportAllSheetsOptions = {
    filename: "workbook_export",
    format: "a4",
    orientation: "portrait",
    margin: 15,
    quality: 1.5,
    returnBlob: false,
  };

  // Show loading overlay with progress
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'pdf-export-loading';
  loadingOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    color: white;
    font-family: Arial, sans-serif;
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  `;

  const loadingText = document.createElement('div');
  loadingText.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    text-align: center;
  `;
  loadingText.textContent = 'Exporting Workbook as PDF...';

  const progressText = document.createElement('div');
  progressText.id = 'export-progress';
  progressText.style.cssText = `
    font-size: 14px;
    margin-top: 10px;
    text-align: center;
  `;
  progressText.textContent = 'Preparing export...';

  // Add CSS animation for spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  loadingOverlay.appendChild(spinner);
  loadingOverlay.appendChild(loadingText);
  loadingOverlay.appendChild(progressText);
  document.body.appendChild(loadingOverlay);

  const updateProgress = (message: string) => {
    const progressElement = document.getElementById('export-progress');
    if (progressElement) {
      progressElement.textContent = message;
    }
  };

  // Set progress callback
  options.onProgress = updateProgress;

  try {
    updateProgress('Getting sheet information...');

    // Get device type to determine footer structure
    const getDeviceType = () => {
      if (navigator.userAgent.match(/iPod/)) return "iPod";
      if (navigator.userAgent.match(/iPad/)) return "iPad";
      if (navigator.userAgent.match(/iPhone/)) return "iPhone";
      if (navigator.userAgent.match(/Android/)) return "Android";
      return "default";
    };

    // Import DATA dynamically to get the current footers
    const { DATA } = await import("../../app-data.js");
    const deviceType = getDeviceType();
    const footers = DATA["home"][deviceType]["footers"];

    if (!footers || footers.length === 0) {
      throw new Error("No sheets found to export");
    }

    updateProgress(`Found ${footers.length} sheets to collect...`);

    // Collect all sheet data
    const sheetsData: SheetData[] = [];
    const spreadsheetContainer = document.getElementById('te_fullgrid');

    if (!spreadsheetContainer) {
      throw new Error('Spreadsheet container not found');
    }

    // Store original sheet index to restore later
    const originalSheet = 1;

    for (let i = 1; i <= footers.length; i++) {
      const currentFooter = footers[i - 1];
      const sheetName = currentFooter?.name || `Sheet ${i}`;

      updateProgress(`Collecting data from ${sheetName} (${i}/${footers.length})...`);

      try {
        // Switch to the sheet
        AppGeneral.activateFooterButton(i);

        // Wait for sheet to render
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clone the spreadsheet container
        const clonedElement = spreadsheetContainer.cloneNode(true) as HTMLElement;

        // Store the sheet data
        sheetsData.push({
          id: `sheet_${i}`,
          name: sheetName,
          element: clonedElement
        });

      } catch (error) {
        console.error(`Error collecting sheet ${i}:`, error);
        // Continue with other sheets even if one fails
      }
    }

    // Return to original sheet
    AppGeneral.activateFooterButton(originalSheet);

    if (sheetsData.length === 0) {
      throw new Error("No sheet data could be collected");
    }

    updateProgress(`Processing ${sheetsData.length} sheets for PDF export...`);

    // Use the new export logic
    await exportAllSheetsAsPDF(sheetsData, options);

  } catch (error) {
    console.error('Error in workbook PDF export:', error);
    alert(`Error exporting workbook: ${(error as Error).message}`);
  } finally {
    // Clean up loading overlay
    const loadingElement = document.getElementById('pdf-export-loading');
    if (loadingElement) {
      loadingElement.remove();
    }

    // Remove the animation style
    const styleElements = document.querySelectorAll('style');
    styleElements.forEach(style => {
      if (style.textContent?.includes('@keyframes spin')) {
        style.remove();
      }
    });
  }
};

// Main export function following the provided logic structure
const exportAllSheetsAsPDF = async (
  sheetsData: SheetData[],
  options: ExportAllSheetsOptions = {}
): Promise<void | Blob> => {
  const {
    filename = "workbook_export",
    format = "a4",
    orientation = "landscape",
    margin = 15,
    quality = 1.5,
    onProgress,
    returnBlob = false,
  } = options;

  try {
    if (!sheetsData || sheetsData.length === 0) {
      throw new Error("No sheets data provided");
    }

    onProgress?.(`Starting export of ${sheetsData.length} sheets...`);

    // Create PDF document
    const pdf = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: format,
    });

    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;

    // Remove the first empty page
    pdf.deletePage(1);

    for (let i = 0; i < sheetsData.length; i++) {
      const sheet = sheetsData[i];

      onProgress?.(
        `Processing sheet ${i + 1}/${sheetsData.length}: ${sheet.name}...`
      );

      // Create temporary container for each sheet
      const tempContainer = document.createElement("div");
      tempContainer.appendChild(sheet.element.cloneNode(true));
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = "210mm"; // A4 portrait width
      tempContainer.style.padding = "20px";
      tempContainer.style.backgroundColor = "white";
      tempContainer.style.color = "#000";
      tempContainer.style.fontFamily = "Arial, sans-serif";
      tempContainer.style.fontSize = "12px";
      tempContainer.style.lineHeight = "1.4";

      // Add sheet title
      const titleElement = document.createElement("h2");
      titleElement.textContent = sheet.name;
      titleElement.style.marginBottom = "20px";
      titleElement.style.color = "#333";
      titleElement.style.borderBottom = "2px solid #333";
      titleElement.style.paddingBottom = "10px";
      titleElement.style.fontSize = "16px";
      titleElement.style.fontWeight = "bold";
      tempContainer.insertBefore(titleElement, tempContainer.firstChild);

      document.body.appendChild(tempContainer);

      try {
        onProgress?.(`Rendering sheet ${i + 1} to canvas...`);

        // Convert HTML to canvas with higher quality
        const canvas = await html2canvas(tempContainer, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          width: tempContainer.scrollWidth,
          height: tempContainer.scrollHeight,
          scale: quality,
          logging: false,
          removeContainer: false,
        } as any);

        // Calculate dimensions for PDF
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add new page for each sheet
        pdf.addPage();

        onProgress?.(`Adding sheet ${i + 1} to PDF...`);

        // If content fits on one page
        if (imgHeight <= pageHeight) {
          pdf.addImage(
            canvas.toDataURL("image/png", 0.95),
            "PNG",
            margin,
            margin,
            imgWidth,
            imgHeight,
            undefined,
            "FAST"
          );
        } else {
          // Content spans multiple pages
          let heightLeft = imgHeight;
          let position = margin;

          // Add first part
          pdf.addImage(
            canvas.toDataURL("image/png", 0.95),
            "PNG",
            margin,
            position,
            imgWidth,
            imgHeight,
            undefined,
            "FAST"
          );

          heightLeft -= pageHeight;

          // Add continuation pages for this sheet if needed
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight + margin;
            pdf.addPage();
            pdf.addImage(
              canvas.toDataURL("image/png", 0.95),
              "PNG",
              margin,
              position,
              imgWidth,
              imgHeight,
              undefined,
              "FAST"
            );
            heightLeft -= pageHeight;
          }
        }
      } finally {
        // Always remove the temporary container
        document.body.removeChild(tempContainer);
      }
    }

    onProgress?.("Finalizing PDF...");

    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const finalFilename = `${filename}_${currentDate}`;

    if (returnBlob) {
      onProgress?.("PDF generated successfully!");
      return pdf.output("blob");
    } else {
      // Handle mobile vs web differently
      if (isPlatform('hybrid')) {
        onProgress?.("Preparing file for mobile sharing...");
        // Mobile - save and share
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const result = await Filesystem.writeFile({
          path: `${finalFilename}.pdf`,
          data: pdfBase64,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });

        await Share.share({
          title: 'Export Workbook PDF',
          text: `${APP_NAME} - ${finalFilename}.pdf`,
          url: result.uri,
          dialogTitle: 'Share Workbook PDF'
        });
      } else {
        // Web - direct download
        pdf.save(`${finalFilename}.pdf`);
      }

      onProgress?.(`PDF with ${sheetsData.length} sheets saved successfully!`);
    }
  } catch (error) {
    console.error("Error generating combined PDF:", error);
    throw new Error("Failed to generate combined PDF. Please try again.");
  }
};


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
    setLoadingMessage("Exporting CSV file...");

    try {
      // Get CSV content from SocialCalc
      const csvContent = AppGeneral.getCSVContent();

      // Generate filename with current date and selected file name
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${getCurrentFileName()}_${currentDate}.csv`;

      if (isPlatform('hybrid')) {
        // Mobile device - use Capacitor Filesystem and Share
        setLoadingMessage("Preparing CSV for mobile sharing...");
        try {
          // Write file to device storage
          const result = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });

          setLoadingMessage("Sharing CSV file...");

          // Share the file
          await Share.share({
            title: 'Export CSV',
            text: `${APP_NAME} - ${filename}`,
            url: result.uri,
            dialogTitle: 'Share CSV File'
          });

          setToastMessage('CSV file exported and ready to share!');
          setShowToast1(true);
        } catch (mobileError) {
          console.error('Mobile CSV export error:', mobileError);
          setToastMessage('Error exporting CSV file on mobile. Please try again.');
          setShowToast1(true);
        }
      } else {
        // Web browser - use traditional download
        setLoadingMessage("Preparing CSV download...");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);

        // Trigger download
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up URL
        URL.revokeObjectURL(url);

        setToastMessage('CSV file downloaded successfully!');
        setShowToast1(true);
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      setToastMessage('Error downloading CSV file. Please try again.');
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
      // Always use DOM capture method for more reliable results
      // Get the spreadsheet container by id and clone it
      const spreadsheetContainer = document.getElementById('te_fullgrid');
      const spreadsheetClone = spreadsheetContainer ? spreadsheetContainer.cloneNode(true) as HTMLElement : null;
      // Remove all child HTML inside the cloned spreadsheet container
      if (spreadsheetClone) {
        while (spreadsheetClone.firstChild) {
          spreadsheetClone.removeChild(spreadsheetClone.firstChild);
        }
      }

      if (!spreadsheetContainer) {
        throw new Error('Spreadsheet container not found');
      }
      // Append the colgroup tag present in the spreadsheetContainer into the spreadsheetClone
      if (spreadsheetContainer && spreadsheetClone) {
        const colgroup = spreadsheetContainer.querySelector('colgroup');
        if (colgroup) {
          spreadsheetClone.appendChild(colgroup.cloneNode(true));
        }
      }

      // Find the grid container specifically (where the data is displayed)
      const gridContainer = spreadsheetContainer;

      setLoadingMessage("Rendering spreadsheet content...");

      // Ensure the spreadsheet is fully rendered and visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      setLoadingMessage("Creating PDF image...");

      // Create PDF directly from the visible spreadsheet element
      const canvas = await html2canvas(gridContainer as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        width: gridContainer.scrollWidth,
        height: gridContainer.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: false
      } as any);

      setLoadingMessage("Generating PDF document...");

      // Create PDF with A4 portrait orientation
      const imgData = canvas.toDataURL('image/png');

      // Always use portrait orientation for A4 size
      const orientation = 'portrait';

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      // Calculate dimensions for A4 portrait
      const pdfWidth = 210; // A4 portrait width
      const pdfHeight = 297; // A4 portrait height
      const margin = 8; // Small margin for professional look
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);

      // For invoice documents, we want to maximize the size while maintaining readability
      // Scale the content to use most of the available space
      const scaleFactor = Math.min(
        availableWidth / (canvas.width * 0.75), // Scale based on canvas width with padding
        availableHeight / (canvas.height * 0.75) // Scale based on canvas height with padding
      );

      // Calculate final dimensions with scaling
      let imgWidth = canvas.width * scaleFactor;
      let imgHeight = canvas.height * scaleFactor;

      // Ensure minimum size for readability
      const minWidth = availableWidth * 0.8; // At least 80% of available width
      const minHeight = availableHeight * 0.6; // At least 60% of available height

      if (imgWidth < minWidth) {
        const widthScale = minWidth / imgWidth;
        imgWidth = minWidth;
        imgHeight = imgHeight * widthScale;
      }

      if (imgHeight < minHeight && imgHeight <= availableHeight) {
        const heightScale = minHeight / imgHeight;
        imgHeight = minHeight;
        imgWidth = imgWidth * heightScale;
      }

      // Ensure we don't exceed page boundaries
      if (imgWidth > availableWidth) {
        const widthScale = availableWidth / imgWidth;
        imgWidth = availableWidth;
        imgHeight = imgHeight * widthScale;
      }

      // Center the image on the page
      const xPos = (pdfWidth - imgWidth) / 2;
      const yPos = (pdfHeight - imgHeight) / 2; // Center vertically

      // Check if content fits on one page
      if (imgHeight <= availableHeight) {
        // Single page - perfectly centered
        pdf.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
      } else {
        // Multi-page handling for tall content
        // For multi-page documents, we'll scale down to fit pages better
        const pageScale = availableHeight / imgHeight;
        const scaledWidth = imgWidth * pageScale;
        const scaledHeight = availableHeight;
        const scaledXPos = (pdfWidth - scaledWidth) / 2;

        let remainingHeight = canvas.height;
        let sourceY = 0;
        let pageCount = 0;
        const pixelsPerPage = canvas.height * pageScale;

        while (remainingHeight > 0) {
          if (pageCount > 0) {
            pdf.addPage();
          }

          const currentPagePixels = Math.min(remainingHeight, pixelsPerPage);
          const currentPageHeight = (currentPagePixels / canvas.height) * scaledHeight;

          // Create a temporary canvas for this page section
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = canvas.width;
          tempCanvas.height = currentPagePixels;

          if (tempCtx) {
            // Draw the portion of the original canvas for this page
            tempCtx.drawImage(canvas, 0, sourceY, canvas.width, currentPagePixels, 0, 0, canvas.width, currentPagePixels);
            const tempImgData = tempCanvas.toDataURL('image/png');

            // Add this section to the PDF, centered on page
            const pageYPos = margin + ((availableHeight - currentPageHeight) / 2);
            pdf.addImage(tempImgData, 'PNG', scaledXPos, pageYPos, scaledWidth, currentPageHeight);
          }

          sourceY += currentPagePixels;
          remainingHeight -= currentPagePixels;
          pageCount++;
        }
      }

      // Generate filename with current date and selected file name
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${getCurrentFileName()}_${currentDate}.pdf`;

      if (isPlatform('hybrid')) {
        // Mobile device - use Capacitor Filesystem and Share
        setLoadingMessage("Preparing PDF for mobile sharing...");
        try {
          // Convert PDF to base64
          const pdfBase64 = pdf.output('datauristring').split(',')[1];

          // Write file to device storage
          const result = await Filesystem.writeFile({
            path: filename,
            data: pdfBase64,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });

          setLoadingMessage("Sharing PDF file...");

          // Share the PDF file
          await Share.share({
            title: 'Export PDF',
            text: `${APP_NAME} - ${filename}`,
            url: result.uri,
            dialogTitle: 'Share PDF File'
          });

          setToastMessage('PDF file exported and ready to share!');
          setShowToast1(true);
        } catch (mobileError) {
          console.error('Mobile PDF export error:', mobileError);
          setToastMessage('Error exporting PDF file on mobile. Please try again.');
          setShowToast1(true);
        }
      } else {
        // Web browser - use traditional download
        setLoadingMessage("Downloading PDF file...");
        pdf.save(filename);

        setToastMessage('PDF file downloaded successfully!');
        setShowToast1(true);
      }
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
    setLoadingMessage("Adding logo to spreadsheet...");

    try {
      // Check if AppGeneral has an addLogo method
      if (AppGeneral.addLogo) {
        const deviceType = AppGeneral.getDeviceType ? AppGeneral.getDeviceType() : "default";
        await AppGeneral.addLogo(LOGO[`${deviceType}`], imageDataUrl);
        setToastMessage("Logo added successfully");
        setShowToast1(true);
      } else {
        // Fallback: Store logo in localStorage for future use
        localStorage.setItem('spreadsheet_logo', imageDataUrl);

        // You could also insert the logo into a specific cell or header
        // This would depend on your spreadsheet implementation
        setToastMessage("Logo stored successfully. Please refresh to see changes.");
        setShowToast1(true);
      }
    } catch (error) {
      console.error('Error adding logo to app:', error);
      setToastMessage("Error adding logo. Please try again.");
      setShowToast1(true);
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
          "Cannot update <strong>" + getCurrentFileName() + "</strong> file!"
        }
        buttons={["Ok"]}
      />
      <IonAlert
        animated
        isOpen={showAlert2}
        onDidDismiss={() => setShowAlert2(false)}
        header="Save"
        message={
          "File <strong>" +
          getCurrentFileName() +
          "</strong> updated successfully"
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
          "File <strong>" +
          getCurrentFileName() +
          "</strong> saved successfully"
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
