import { Preferences } from "@capacitor/preferences";
import CryptoJS from "crypto-js";

export class File {
  created: string;
  modified: string;
  name: string;
  content: string;
  billType: number;
  isPasswordProtected: boolean;
  password?: string;

  constructor(
    created: string,
    modified: string,
    content: string,
    name: string,
    billType: number,
    isPasswordProtected: boolean = false,
    password?: string
  ) {
    this.created = created;
    this.modified = modified;
    this.content = content;
    this.name = name;
    this.billType = billType;
    this.isPasswordProtected = isPasswordProtected;
    this.password = password;
  }
}

export class Local {
  // Encrypt content using AES
  private _encryptContent = (content: string, password: string): string => {
    try {
      const encrypted = CryptoJS.AES.encrypt(content, password).toString();
      return encrypted; // Return only the encrypted content without prefix
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt file content");
    }
  };

  // Decrypt content using AES
  private _decryptContent = (encryptedContent: string, password: string): string => {
    try {
      // Handle both old format (with "Protected_" prefix) and new format (direct encrypted content)
      let actualEncryptedContent = encryptedContent;
      if (encryptedContent.startsWith('Protected_')) {
        // Old format - remove "Protected_" prefix
        actualEncryptedContent = encryptedContent.substring(10);
      }

      const decrypted = CryptoJS.AES.decrypt(actualEncryptedContent, password);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedString) {
        throw new Error("Invalid password or corrupted file");
      }

      return decryptedString;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt file. Invalid password or corrupted file.");
    }
  };

  // Check if content is protected (encrypted)
  public isProtectedFile = (content: string): boolean => {
    return typeof content === 'string' && content.startsWith('Protected_');
  };

  // Check if a file in storage is protected without loading it
  public isFileProtected = async (fileName: string): Promise<boolean> => {
    try {
      const fileData = await this._getFile(fileName);
      // Check new format first, then fall back to old format
      return fileData.isPasswordProtected === true || this.isProtectedFile(fileData.content);
    } catch (error) {
      return false;
    }
  };

  // Unified save method for both protected and regular files
  _saveFile = async (file: File, needEncrypt: boolean = true) => {
    try {
      let content = file.content;

      // If file is password protected, encrypt the content
      if (file.isPasswordProtected && file.password && needEncrypt) {
        content = this._encryptContent(file.content, file.password);
      }

      let data = {
        created: file.created,
        modified: file.modified,
        content: content,
        name: file.name,
        billType: file.billType,
        isPasswordProtected: file.isPasswordProtected,
        password: file.password || null
      };

      await Preferences.set({
        key: file.name,
        value: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  };

  // Legacy method for backward compatibility - now redirects to unified _saveFile
  _saveProtectedFile = async (file: File, password: string) => {
    const protectedFile = new File(
      file.created,
      file.modified,
      file.content,
      file.name,
      file.billType,
      true,
      password
    );
    return this._saveFile(protectedFile);
  };

  // Get file with automatic decryption if password protected
  _getFileWithPassword = async (name: string, password?: string) => {
    try {
      const rawData = await Preferences.get({ key: name });
      console.log("_getFileWithPassword rawData: ", rawData);
      const fileData = JSON.parse(rawData.value);

      // Handle backward compatibility - check for old "Protected_" format
      const isOldProtectedFormat = this.isProtectedFile(fileData.content);
      const isNewProtectedFormat = fileData.isPasswordProtected === true;

      if (isOldProtectedFormat || isNewProtectedFormat) {
        if (!password) {
          throw new Error("Password required for protected file");
        }

        let decryptedContent;
        if (isOldProtectedFormat) {
          // Handle old format
          decryptedContent = this._decryptContent(fileData.content, password);
        } else {
          // Handle new format
          decryptedContent = this._decryptContent(fileData.content, password);
        }

        return {
          ...fileData,
          content: decryptedContent,
          isPasswordProtected: true,
          password: password
        };
      } else {
        // Regular unprotected file
        return {
          ...fileData,
          isPasswordProtected: fileData.isPasswordProtected || false,
          password: fileData.password || null
        };
      }
    } catch (error) {
      console.error("Error getting file:", error);
      throw error;
    }
  };

  // Legacy method for backward compatibility
  _getProtectedFile = async (name: string, password: string) => {
    return this._getFileWithPassword(name, password);
  };

  _getFile = async (name: string) => {
    const rawData = await Preferences.get({ key: name });
    console.log("rawData", rawData.value);
    return JSON.parse(rawData.value);
  };

  _getAllFiles = async () => {
    let arr = {};
    const { keys } = await Preferences.keys();
    for (let i = 0; i < keys.length; i++) {
      let fname = keys[i];

      // Skip metadata keys that are not actual files
      if (fname === '__last_opened_file__') {
        continue;
      }

      try {
        const data = await this._getFile(fname);
        arr[fname] = (data as any).modified;
      } catch (error) {
        console.warn(`Skipping invalid file entry: ${fname}`, error);
        // Skip files that can't be parsed (corrupted or invalid format)
        continue;
      }
    }
    return arr;
  };

  _deleteFile = async (name: string) => {
    await Preferences.remove({ key: name });
  };

  // Save the last opened filename
  _saveLastOpenedFile = async (filename: string) => {
    await Preferences.set({
      key: '__last_opened_file__',
      value: filename,
    });
  };

  // Get the last opened filename
  _getLastOpenedFile = async (): Promise<string | null> => {
    try {
      const result = await Preferences.get({ key: '__last_opened_file__' });
      return result.value || null;
    } catch (error) {
      return null;
    }
  };

  // Clear the last opened filename
  _clearLastOpenedFile = async () => {
    await Preferences.remove({ key: '__last_opened_file__' });
  };

  _checkKey = async (key: string): Promise<boolean> => {
    const { keys } = await Preferences.keys();
    if (keys.includes(key, 0)) {
      return true;
    } else {
      return false;
    }
  };
}
