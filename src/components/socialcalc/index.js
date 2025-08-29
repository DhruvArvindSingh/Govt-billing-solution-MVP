const SocialCalc = require("./aspiring/SocialCalc.js");

export function getDeviceType() {
  /* Returns the type of the device */
  var device = "default";
  if (navigator.userAgent.match(/iPod/)) device = "iPod";
  if (navigator.userAgent.match(/iPad/)) device = "iPad";
  if (navigator.userAgent.match(/iPhone/)) device = "iPhone";
  if (navigator.userAgent.match(/Android/)) device = "Android";
  return device;
}

export function initializeApp(data) {
  /* Initializes the spreadsheet */

  let tableeditor = document.getElementById("tableeditor");
  let spreadsheet = new SocialCalc.SpreadsheetControl();
  let workbook = new SocialCalc.WorkBook(spreadsheet);
  workbook.InitializeWorkBook("sheet1");

  spreadsheet.InitializeSpreadsheetControl(tableeditor, 0, 0, 0);
  spreadsheet.ExecuteCommand("redisplay", "");

  let workbookcontrol = new SocialCalc.WorkBookControl(
    workbook,
    "workbookControl",
    "sheet1"
  );
  workbookcontrol.InitializeWorkBookControl();
  // alert("app: "+JSON.stringify(data));
  SocialCalc.WorkBookControlLoad(data);
  let ele = document.getElementById("te_griddiv");

  // Set dynamic height based on viewport instead of fixed 1600px
  function setGridHeight() {
    const viewport = SocialCalc.GetViewportInfo();
    const dynamicHeight = Math.max(
      viewport.height - 100, // Account for header/controls
      600 // Minimum height for usability
    );
    ele.style.height = dynamicHeight + "px";
    console.log("Grid height set to: " + dynamicHeight + "px for viewport: " + viewport.width + "x" + viewport.height);
  }

  setGridHeight();
  spreadsheet.DoOnResize();

  // Add orientation change listener to recalculate grid height
  if (window.addEventListener) {
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        setGridHeight();
        spreadsheet.DoOnResize();
      }, 500); // Delay to allow orientation change to complete
    });

    // Also listen for resize events
    window.addEventListener("resize", function () {
      setTimeout(function () {
        setGridHeight();
        spreadsheet.DoOnResize();
      }, 300);
    });
  }
}

export function activateFooterButton(index) {
  /* Activates the sheet according to the index*/
  if (index === SocialCalc.oldBtnActive) return;
  var control = SocialCalc.GetCurrentWorkBookControl();

  var sheets = [];
  for (var key in control.sheetButtonArr) {
    //console.log(key);
    sheets.push(key);
  }
  var spreadsheet = control.workbook.spreadsheet;
  var ele = document.getElementById(spreadsheet.formulabarDiv.id);
  if (ele) {
    SocialCalc.ToggleInputLineButtons(false);
    var input = ele.firstChild;
    input.style.display = "none";
    spreadsheet.editor.state = "start";
  }
  SocialCalc.WorkBookControlActivateSheet(sheets[index - 1]);

  SocialCalc.oldBtnActive = index;
}

// Helper function to decode URL-encoded content if needed
export function decodeFileContent(content) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  try {
    // Check if content is URL-encoded by trying to decode it
    const decoded = decodeURIComponent(content);
    // If decoding succeeds and it looks like JSON, use the decoded version
    if (decoded !== content && (decoded.startsWith('{') || decoded.startsWith('['))) {
      return decoded;
    }
  } catch (error) {
    // If decoding fails, use original content
    console.log("Content not URL-encoded, using as-is");
  }

  return content;
}

export function viewFile(filename, data) {
  // Ensure data is properly decoded before passing to SocialCalc
  const decodedData = decodeFileContent(data);
  SocialCalc.WorkBookControlInsertWorkbook(decodedData);

  SocialCalc.GetCurrentWorkBookControl().workbook.spreadsheet.editor.state =
    "start";

  SocialCalc.GetCurrentWorkBookControl().workbook.spreadsheet.ExecuteCommand(
    "redisplay",
    ""
  );

  window.setTimeout(function () {
    SocialCalc.ScrollRelativeBoth(
      SocialCalc.GetCurrentWorkBookControl().workbook.spreadsheet.editor,
      1,
      0
    );
    SocialCalc.ScrollRelativeBoth(
      SocialCalc.GetCurrentWorkBookControl().workbook.spreadsheet.editor,
      -1,
      0
    );
  }, 1000);
}

export function getCSVContent() {
  var val = SocialCalc.WorkBookControlSaveSheet();
  var workBookObject = JSON.parse(val);
  var control = SocialCalc.GetCurrentWorkBookControl();
  var currentname = control.currentSheetButton.id;
  var savestrr = workBookObject.sheetArr[currentname].sheetstr.savestr;
  var res = SocialCalc.ConvertSaveToOtherFormat(savestrr, "csv", false);
  return res;
}

export function mustshowprompt(coord) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var editor = control.workbook.spreadsheet.editor;
  var cellname = editor.workingvalues.currentsheet + "!" + editor.ecell.coord;
  var constraint = SocialCalc.EditableCells.constraints[cellname];
  if (constraint) {
  }
  // for phone apps always show prompt
  return true;
}

export function getinputtype(coord) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var editor = control.workbook.spreadsheet.editor;
  var cellname = editor.workingvalues.currentsheet + "!" + editor.ecell.coord;
  var constraint = SocialCalc.EditableCells.constraints[cellname];
  if (constraint) {
  }
  return null;
}

export function prompttype(coord) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var editor = control.workbook.spreadsheet.editor;
  var cellname = editor.workingvalues.currentsheet + "!" + editor.ecell.coord;
  var constraint = SocialCalc.EditableCells.constraints[cellname];

  if (constraint) {
  }
  return null;
}

export function showprompt(coord) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var editor = control.workbook.spreadsheet.editor;
  var cellname = editor.workingvalues.currentsheet + "!" + editor.ecell.coord;
  var constraint = SocialCalc.EditableCells.constraints[cellname];
  var highlights = editor.context.highlights;

  //alert(constraint);
  var wval = editor.workingvalues;
  if (wval.eccord) {
    wval.ecoord = null;
    console.log("return due to ecoord");
    return;
  }
  wval.ecoord = coord;
  if (!coord) coord = editor.ecell.coord;
  var text = SocialCalc.GetCellContents(editor.context.sheetobj, coord);
  console.log("in prompt, coord = " + coord + " text=" + text);

  if (
    SocialCalc.Constants.SCNoQuoteInInputBox &&
    text.substring(0, 1) === "'"
  ) {
    text = text.substring(1);
  }
  console.log("continue...");

  var cell = SocialCalc.GetEditorCellElement(
    editor,
    editor.ecell.row,
    editor.ecell.col
  );
  //alert(cell);

  /*var cancelfn = function() {
        wval.ecoord = null;
        delete highlights[editor.ecell.coord];
        editor.UpdateCellCSS(cell, editor.ecell.row, editor.ecell.col);
        
    };*/

  var okfn = function (val) {
    var callbackfn = function () {
      console.log("callback val " + val);
      SocialCalc.EditorSaveEdit(editor, val);
    };
    window.setTimeout(callbackfn, 100);
  };

  // highlight the cell
  delete highlights[editor.ecell.coord];
  highlights[editor.ecell.coord] = "cursor";
  editor.UpdateCellCSS(cell, editor.ecell.row, editor.ecell.col);

  var celltext = "Enter Value";
  var title = "Input";
  if (constraint) {
  } else {
    console.log("cell text is null");
  }

  var options = { title: title };

  options["message"] = celltext;
  console.log("text is " + text);
  options["textvalue"] = text;

  function onPrompt(results) {
    if (results.buttonIndex === 3) return;
    else if (results.buttonIndex === 2) {
      var onConfirm = function (buttonIndex) {
        console.log(buttonIndex);
        switch (buttonIndex) {
          case 1: //do nothing
            break;
          case 2:
            var onFontConfirm = function (fontIndex) {
              switch (fontIndex) {
                case 1: //do nothing
                  break;
                case 2:
                  SocialCalc.EditorChangefontFromWidget(editor, "a");
                  break;
                case 3:
                  SocialCalc.EditorChangefontFromWidget(editor, "b");
                  break;
                case 4:
                  SocialCalc.EditorChangefontFromWidget(editor, "c");
                  break;
                case 5:
                  SocialCalc.EditorChangefontFromWidget(editor, "d");
                  break;
                default:
                  break;
              }
            };

            navigator.notification.confirm(
              "Customise cell options", // message
              onFontConfirm, // callback to invoke with index of button pressed
              "Customise", // title
              ["Cancel", "Small:8pt", "Medium:12pt", "Big:14pt", "Large:16pt"] // buttonLabels
            );
            break;
          case 3:
            var onColorConfirm = function (colorIndex) {
              switch (colorIndex) {
                case 1: //do nothing
                  break;
                case 2:
                  SocialCalc.EditorChangecolorFromWidget(editor, "red");
                  break;
                case 3:
                  SocialCalc.EditorChangecolorFromWidget(editor, "yellow");
                  break;
                case 4:
                  SocialCalc.EditorChangecolorFromWidget(editor, "blue");
                  break;
                case 5:
                  SocialCalc.EditorChangecolorFromWidget(editor, "green");
                  break;
                case 6:
                  SocialCalc.EditorChangecolorFromWidget(editor, "purple");
                  break;
                case 7:
                  SocialCalc.EditorChangecolorFromWidget(editor, "black");
                  break;
                default:
                  break;
              }
            };

            navigator.notification.confirm(
              "Customise cell options", // message
              onColorConfirm, // callback to invoke with index of button pressed
              "Customise", // title
              ["Cancel", "Red", "Yellow", "Blue", "Green", "Purple", "Black"] // buttonLabels
            );
            break;
          case 4:
            editor.context.sheetobj.SheetUndo();
            break;
          case 5:
            editor.context.sheetobj.SheetRedo();
            break;
          case 6:
            SocialCalc.EditorCut(editor, "a");
            break;
          case 7:
            SocialCalc.EditorCut(editor, "b");
            break;
          case 8:
            SocialCalc.EditorCut(editor, "c");
            break;
          case 9:
            SocialCalc.EditorCut(editor, "d");
            break;
          default:
            break;
        }
      };
      navigator.notification.confirm(
        "Customise cell options", // message
        onConfirm, // callback to invoke with index of button pressed
        "Customise", // title
        [
          "Cancel",
          "Font",
          "Color",
          "Undo",
          "Redo",
          "Cut",
          "Copy",
          "Paste",
          "Clear",
        ] // buttonLabels
      );
    } else if (results.buttonIndex === 1) {
      okfn(results.input1);
    }
  }

  navigator.notification.prompt(
    "Enter value", // message
    onPrompt, // callback to invoke
    "Input", // title
    ["Ok", "Customise", "Cancel"], // buttonLabels
    "" + text + "" // defaultText
  );

  return true;
}

export function getSpreadsheetContent() {
  return SocialCalc.WorkBookControlSaveSheet();
}

// Auto-save functionality: Set up cell change listener
export function setupCellChangeListener(callback) {
  var control = SocialCalc.GetCurrentWorkBookControl();

  // Add safety check
  if (!control || !control.workbook || !control.workbook.spreadsheet) {
    setTimeout(() => setupCellChangeListener(callback), 100);
    return () => { }; // Return empty cleanup function
  }

  var editor = control.workbook.spreadsheet.editor;

  // Store original save edit method
  if (!SocialCalc.OriginalEditorSaveEdit) {
    SocialCalc.OriginalEditorSaveEdit = SocialCalc.EditorSaveEdit;
  }

  SocialCalc.EditorSaveEdit = function (editor, text) {
    var coord = editor.ecell.coord;
    var oldValue = SocialCalc.GetCellContents(editor.context.sheetobj, coord);

    // Call original method
    var result = SocialCalc.OriginalEditorSaveEdit.call(this, editor, text);

    // Trigger callback if value changed
    if (callback && oldValue !== text) {
      var currentControl = SocialCalc.GetCurrentWorkBookControl();
      if (currentControl && currentControl.currentSheetButton) {
        callback({
          coord: coord,
          oldValue: oldValue,
          newValue: text,
          timestamp: new Date(),
          sheetId: currentControl.currentSheetButton.id,
        });
      }
    }

    return result;
  };

  // Return cleanup function that restores original method
  return function cleanup() {
    if (SocialCalc.OriginalEditorSaveEdit) {
      SocialCalc.EditorSaveEdit = SocialCalc.OriginalEditorSaveEdit;
    }
  };
}

export function getCurrentHTMLContent() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  return control.workbook.spreadsheet.CreateSheetHTML();
}

export function getAllHTMLContent(sheetdata) {
  var appsheets = {};
  // var control = SocialCalc.GetCurrentWorkBookControl();

  for (var i = 1; i <= sheetdata.numsheets; i++) {
    var key = "sheet" + i;
    appsheets[key] = key;
  }

  return SocialCalc.WorkbookControlCreateSheetHTML(appsheets);
}

export function getAllSheetsHTML() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var appsheets = {};

  // Get all sheets from the workbook
  for (var sheetId in control.workbook.sheetArr) {
    appsheets[sheetId] = sheetId;
  }

  return SocialCalc.WorkbookControlCreateSheetHTML(appsheets);
}

export function getAllSheetsCSV() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var csvData = [];

  // Collect all sheets and their data
  for (var sheetId in control.workbook.sheetArr) {
    var sheet = control.workbook.sheetArr[sheetId].sheet;

    // Get the sheet save string and convert to CSV
    var saveStr = sheet.CreateSheetSave();
    var csvContent = SocialCalc.ConvertSaveToOtherFormat(saveStr, "csv", false);

    csvData.push({
      name: sheet.sheetname || sheetId,
      csv: csvContent
    });
  }

  return csvData;
}

export function getWorkbookInfo() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var sheets = [];

  for (var sheetId in control.workbook.sheetArr) {
    var sheet = control.workbook.sheetArr[sheetId].sheet;
    sheets.push({
      id: sheetId,
      name: sheet.sheetname || sheetId
    });
  }

  return {
    sheets: sheets,
    currentSheet: control.currentSheetButton.id,
    numSheets: sheets.length
  };
}

export function saveAs() {
  return new Promise(function (resolve, reject) {
    navigator.notification.prompt(
      "Please enter the filename", // message
      function (results) {
        if (results.buttonIndex === 2) {
          resolve(results.input1);
        }
      }, // callback to invoke
      "Save as", // title
      ["Cancel", "Save"], // buttonLabels
      "" // defaultText
    );
  });
}

export function getAllOldFiles() {
  return new Promise(function (resolve, reject) {
    var files = {};

    for (var i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i).length >= 30) continue;
      var filename = window.localStorage.key(i);

      if (filename === "logoArray") continue;
      if (filename === "inapp") continue;
      if (filename === "sound") continue;
      if (filename === "cloudInapp") continue;
      if (filename === "inapplocal") continue;
      if (filename === "inappPurchase") continue;
      if (filename === "flag") continue;
      if (filename === "share") continue;
      if (filename === "cellArray") continue;
      if (filename === "sk_receiptForProduct") continue;
      if (filename === "sk_receiptForTransaction") continue;
      if (
        filename === "didTutorial" ||
        filename === "customise" ||
        filename === "rename" ||
        filename === "choice"
      )
        continue;
      /// console.log(filename);
      var filedata = decodeURIComponent(window.localStorage.getItem(filename));

      files[filename] = filedata;
    }
    // console.log(files);
    resolve(files);
  });
}

export function deleteAllOldFiles(files) {
  return new Promise(function (resolve, reject) {
    for (var i in files) {
      console.log("Removing.." + i);
      window.localStorage.removeItem(i);
    }
    resolve(true);
  });
}

export function addLogo(coord, url) {
  return new Promise(function (resolve, reject) {
    console.log(url);

    var control = SocialCalc.GetCurrentWorkBookControl();
    var currsheet = control.currentSheetButton.id;
    // var editor = control.workbook.spreadsheet.editor;

    var cmd = "";
    for (var sheetname in coord) {
      if (coord[sheetname] !== null) {
        if (currsheet === sheetname) {
          console.log(sheetname + " ," + coord[sheetname]); // eslint-disable-next-line
          cmd =
            "set " +
            coord[sheetname] +
            ' text t <img src="' +
            url +
            '" height="100" width="150"></img>' +
            "\n";
          cmd = {
            cmdtype: "scmd",
            id: currsheet,
            cmdstr: cmd,
            saveundo: false,
          };
          control.ExecuteWorkBookControlCommand(cmd, false);
        }
      }
    }
    resolve(true);
  });
}

export function removeLogo(coord) {
  return new Promise(function (resolve, reject) {
    var control = SocialCalc.GetCurrentWorkBookControl();
    var currsheet = control.currentSheetButton.id;
    // var editor = control.workbook.spreadsheet.editor;

    var cmd = "";
    for (var sheetname in coord) {
      if (coord[sheetname] !== null) {
        if (currsheet === sheetname) {
          console.log(sheetname + " ," + coord[sheetname]);
          cmd = "erase " + coord[sheetname] + " formulas";
          cmd = {
            cmdtype: "scmd",
            id: currsheet,
            cmdstr: cmd,
            saveundo: false,
          };
          control.ExecuteWorkBookControlCommand(cmd, false);
        }
      }
    }
    resolve(true);
  });
}

export function undo() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  //alert('control are'+control);
  var editor = control.workbook.spreadsheet.editor;
  editor.context.sheetobj.SheetUndo();
}

export function redo() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  //alert('control are'+control);
  var editor = control.workbook.spreadsheet.editor;
  editor.context.sheetobj.SheetRedo();
}

export function getCurrentSheet() {
  return SocialCalc.GetCurrentWorkBookControl().currentSheetButton.id;
}

export function changeSheetColor(name) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  var editor = control.workbook.spreadsheet.editor;

  name = name.toLowerCase();
  //console.log("changing sheet color to: "+name);
  SocialCalc.EditorChangeSheetcolor(editor, name);
}

export function changeFontSheet(cmdline) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  //alert('control are'+control);
  var editor = control.workbook.spreadsheet.editor;
  editor.EditorScheduleSheetCommands(cmdline, true, false);
}

export function executeCommand(cmdline) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  //alert('control are'+control);
  var editor = control.workbook.spreadsheet.editor;
  editor.EditorScheduleSheetCommands(cmdline, true, false);
}

// Enhanced export functions for new services

export function getAllSheetsData() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  if (!control || !control.sheetButtonArr) {
    throw new Error("No sheets available");
  }

  var sheetsData = [];
  var currentSheet = control.currentSheetButton.id;

  for (var sheetId in control.sheetButtonArr) {
    try {
      // Switch to each sheet to get its content
      SocialCalc.WorkBookControlActivateSheet(sheetId);

      var htmlContent = control.workbook.spreadsheet.CreateSheetHTML();
      var sheetName = control.sheetButtonArr[sheetId].value || sheetId;

      sheetsData.push({
        id: sheetId,
        name: sheetName,
        htmlContent: htmlContent
      });
    } catch (error) {
      console.error('Error getting data for sheet ' + sheetId + ':', error);
    }
  }

  // Switch back to original sheet
  SocialCalc.WorkBookControlActivateSheet(currentSheet);

  return sheetsData;
}

export function getEnhancedWorkbookInfo() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  if (!control) {
    return null;
  }

  return {
    numSheets: control.numSheets,
    currentSheet: control.currentSheetButton ? control.currentSheetButton.id : null,
    sheets: Object.keys(control.sheetButtonArr || {})
  };
}

export function getSheetContent(sheetId) {
  var control = SocialCalc.GetCurrentWorkBookControl();
  if (!control || !control.sheetButtonArr[sheetId]) {
    throw new Error('Sheet not found: ' + sheetId);
  }

  var currentSheet = control.currentSheetButton.id;

  try {
    // Switch to the requested sheet
    SocialCalc.WorkBookControlActivateSheet(sheetId);

    var htmlContent = control.workbook.spreadsheet.CreateSheetHTML();
    var csvContent = getCSVContent();
    var sheetName = control.sheetButtonArr[sheetId].value || sheetId;

    return {
      id: sheetId,
      name: sheetName,
      htmlContent: htmlContent,
      csvContent: csvContent
    };
  } finally {
    // Always switch back to original sheet
    SocialCalc.WorkBookControlActivateSheet(currentSheet);
  }
}

export function getSpreadsheetElement() {
  return document.getElementById('te_fullgrid');
}

export function validateSpreadsheetState() {
  var control = SocialCalc.GetCurrentWorkBookControl();
  if (!control || !control.workbook || !control.workbook.spreadsheet) {
    throw new Error("Spreadsheet not initialized");
  }
  return true;
}

export function getCleanCSVContent() {
  try {
    // Try the comprehensive CSV generation first
    var csvContent = getComprehensiveCSVContent();
    if (csvContent) {
      return csvContent;
    }

    // Fallback to original method
    var csvContent = getCSVContent();
    if (!csvContent) {
      throw new Error("No CSV content available");
    }

    // Preserve all cells but clean up formatting
    var lines = csvContent.split('\n');
    var cleanedLines = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // Only remove completely empty lines at the end
      if (line.trim() !== '' || i < lines.length - 1) {
        cleanedLines.push(line);
      }
    }

    return cleanedLines.join('\n');
  } catch (error) {
    console.error('Error getting clean CSV content:', error);
    throw new Error('Failed to generate CSV content');
  }
}

export function getComprehensiveCSVContent() {
  try {
    var control = SocialCalc.GetCurrentWorkBookControl();
    if (!control || !control.workbook || !control.workbook.spreadsheet) {
      return null;
    }

    var editor = control.workbook.spreadsheet.editor;
    var sheet = editor.context;
    var cells = sheet.cellattribs.celllist;

    // Find the maximum row and column
    var maxRow = 0;
    var maxCol = 0;

    for (var cellname in cells) {
      var cr = SocialCalc.coordToCr(cellname);
      if (cr.row > maxRow) maxRow = cr.row;
      if (cr.col > maxCol) maxCol = cr.col;
    }

    // Also check sheet.cells for cell values
    for (var cellname in sheet.cells) {
      var cr = SocialCalc.coordToCr(cellname);
      if (cr.row > maxRow) maxRow = cr.row;
      if (cr.col > maxCol) maxCol = cr.col;
    }

    if (maxRow === 0 && maxCol === 0) {
      return null; // No data found
    }

    // Generate CSV content
    var csvLines = [];

    for (var row = 1; row <= maxRow; row++) {
      var csvRow = [];

      for (var col = 1; col <= maxCol; col++) {
        var cellname = SocialCalc.crToCoord(col, row);
        var cellvalue = "";

        // Get cell value
        if (sheet.cells[cellname]) {
          var cell = sheet.cells[cellname];
          if (cell.datavalue !== undefined) {
            cellvalue = cell.datavalue;
          } else if (cell.formula) {
            cellvalue = cell.formula;
          } else if (cell.value !== undefined) {
            cellvalue = cell.value;
          }
        }

        // Escape CSV special characters
        cellvalue = String(cellvalue || "");
        if (cellvalue.indexOf(',') !== -1 || cellvalue.indexOf('"') !== -1 || cellvalue.indexOf('\n') !== -1) {
          cellvalue = '"' + cellvalue.replace(/"/g, '""') + '"';
        }

        csvRow.push(cellvalue);
      }

      csvLines.push(csvRow.join(','));
    }

    return csvLines.join('\n');
  } catch (error) {
    console.error('Error generating comprehensive CSV:', error);
    return null;
  }
}

export function getExportReadyHTMLContent() {
  try {
    validateSpreadsheetState();
    var htmlContent = getCurrentHTMLContent();

    if (!htmlContent || htmlContent.trim() === '') {
      throw new Error("No HTML content available for export");
    }

    return htmlContent;
  } catch (error) {
    console.error('Error getting export-ready HTML content:', error);
    throw new Error('Failed to generate HTML content for export');
  }
}
