import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { isPlatform, IonToast } from "@ionic/react";
import { EmailComposer } from "capacitor-email-composer";
import { Printer } from "@ionic-native/printer";
import { IonActionSheet, IonAlert } from "@ionic/react";
import { saveOutline, save, mail, print, download } from "ionicons/icons";
import { APP_NAME } from "../../app-data.js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const Menu: React.FC<{
  showM: boolean;
  setM: Function;
  file: string;
  updateSelectedFile: Function;
  store: Local;
  bT: number;
}> = (props) => {
  const [showAlert1, setShowAlert1] = useState(false);
  const [showAlert2, setShowAlert2] = useState(false);
  const [showAlert3, setShowAlert3] = useState(false);
  const [showAlert4, setShowAlert4] = useState(false);
  const [showToast1, setShowToast1] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  /* Utility functions */
  const _validateName = async (filename) => {
    filename = filename.trim();
    if (filename === "default" || filename === "Untitled") {
      setToastMessage("Cannot update default file!");
      return false;
    } else if (filename === "" || !filename) {
      setToastMessage("Filename cannot be empty");
      return false;
    } else if (filename.length > 30) {
      setToastMessage("Filename too long");
      return false;
    } else if (/^[a-zA-Z0-9- ]*$/.test(filename) === false) {
      setToastMessage("Special Characters cannot be used");
      return false;
    } else if (await props.store._checkKey(filename)) {
      setToastMessage("Filename already exists");
      return false;
    }
    return true;
  };

  const getCurrentFileName = () => {
    return props.file;
  };

  const _formatString = (filename) => {
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
  const doSave = () => {
    if (props.file === "default") {
      setShowAlert1(true);
      return;
    }
    const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
    const data = props.store._getFile(props.file);
    const file = new File(
      (data as any).created,
      new Date().toString(),
      content,
      props.file,
      props.bT
    );
    props.store._saveFile(file);
    props.updateSelectedFile(props.file);
    setShowAlert2(true);
  };

  const doSaveAs = async (filename) => {
    // event.preventDefault();
    if (filename) {
      // console.log(filename, _validateName(filename));
      if (await _validateName(filename)) {
        // filename valid . go on save
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        // console.log(content);
        const file = new File(
          new Date().toString(),
          new Date().toString(),
          content,
          filename,
          props.bT
        );
        // const data = { created: file.created, modified: file.modified, content: file.content, password: file.password };
        // console.log(JSON.stringify(data));
        props.store._saveFile(file);
        props.updateSelectedFile(filename);
        setShowAlert4(true);
      } else {
        setShowToast1(true);
      }
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
    try {
      // Get CSV content from SocialCalc
      const csvContent = AppGeneral.getCSVContent();

      // Generate filename with current date and selected file name
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `${getCurrentFileName()}_${currentDate}.csv`;

      if (isPlatform('hybrid')) {
        // Mobile device - use Capacitor Filesystem and Share
        try {
          // Write file to device storage
          const result = await Filesystem.writeFile({
            path: filename,
            data: csvContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
          });

          console.log('File written to:', result.uri);

          // Share the file
          await Share.share({
            title: 'Export CSV',
            text: `${APP_NAME} - ${filename}`,
            url: result.uri,
            dialogTitle: 'Share CSV File'
          });

          console.log('CSV exported and shared successfully');
          setSuccessMessage('CSV file exported and ready to share!');
          setShowSuccessToast(true);
        } catch (mobileError) {
          console.error('Mobile CSV export error:', mobileError);
          alert('Error exporting CSV file on mobile. Please try again.');
        }
      } else {
        // Web browser - use traditional download
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
        console.log('CSV downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading CSV:', error);
      alert('Error downloading CSV file. Please try again.');
    }
  };

  const exportAsPdf = async () => {
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

      console.log("spreadsheetContainer", spreadsheetClone);
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


      console.log('Using DOM capture method for PDF export');
      console.log(AppGeneral.getCurrentSheet());

      // Find the grid container specifically (where the data is displayed)
      const gridContainer = spreadsheetContainer;
      // const gridContainer = spreadsheetContainer[0].querySelector('#te_griddiv') ||
      // spreadsheetContainer[0].querySelector('.te_griddiv') ||
      // spreadsheetContainer[0];

      console.log('Grid container found:', gridContainer);

      // Ensure the spreadsheet is fully rendered and visible
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create PDF directly from the visible spreadsheet element
      console.log("Before canvas");
      const canvas = await html2canvas(gridContainer as HTMLElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: true,
        width: gridContainer.scrollWidth,
        height: gridContainer.scrollHeight,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: false
      } as any);
      console.log("After canvas");

      console.log('Canvas created with dimensions:', canvas.width, 'x', canvas.height);

      // Create PDF with automatic orientation based on content aspect ratio
      const imgData = canvas.toDataURL('image/png');
      const canvasAspectRatio = canvas.width / canvas.height;

      // Choose orientation based on content - landscape for wide content, portrait for tall
      const orientation = canvasAspectRatio > 1.4 ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4'
      });

      console.log(`Creating PDF in ${orientation} orientation (aspect ratio: ${canvasAspectRatio.toFixed(2)})`);

      // Calculate dimensions to fill the entire A4 page optimally
      // Adjust dimensions based on orientation
      const pdfWidth = orientation === 'landscape' ? 297 : 210; // A4 dimensions
      const pdfHeight = orientation === 'landscape' ? 210 : 297; // A4 dimensions
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

      console.log(`Final PDF dimensions: ${imgWidth.toFixed(1)}mm x ${imgHeight.toFixed(1)}mm at position (${xPos.toFixed(1)}, ${yPos.toFixed(1)})`);

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

          console.log('PDF file written to:', result.uri);

          // Share the PDF file
          await Share.share({
            title: 'Export PDF',
            text: `${APP_NAME} - ${filename}`,
            url: result.uri,
            dialogTitle: 'Share PDF File'
          });

          console.log('PDF exported and shared successfully');
          setSuccessMessage('PDF file exported and ready to share!');
          setShowSuccessToast(true);
        } catch (mobileError) {
          console.error('Mobile PDF export error:', mobileError);
          alert('Error exporting PDF file on mobile. Please try again.');
        }
      } else {
        // Web browser - use traditional download
        pdf.save(filename);
        console.log('PDF downloaded successfully using DOM capture');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF file. Please try again.');
    }
  };

  return (
    <React.Fragment>
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
              console.log("Save clicked");
            },
          },
          {
            text: "Save As",
            icon: save,
            handler: () => {
              setShowAlert3(true);
              console.log("Save As clicked");
            },
          },
          {
            text: "Print",
            icon: print,
            handler: () => {
              doPrint();
              console.log("Print clicked");
            },
          },
          {
            text: "Email",
            icon: mail,
            handler: () => {
              sendEmail();
              console.log("Email clicked");
            },
          },
          {
            text: "Export as CSV",
            icon: download,
            handler: () => {
              exportAsCsv();
              console.log("Download CSV clicked");
            },
          },
          {
            text: "Export as PDF",
            icon: download,
            handler: () => {
              exportAsPdf();
              console.log("Download PDF clicked");
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
          setShowAlert3(true);
        }}
        position="bottom"
        message={toastMessage}
        duration={500}
      />
      <IonToast
        animated
        isOpen={showSuccessToast}
        onDidDismiss={() => setShowSuccessToast(false)}
        position="bottom"
        message={successMessage}
        duration={3000}
        color="success"
      />
    </React.Fragment>
  );
};

export default Menu;
