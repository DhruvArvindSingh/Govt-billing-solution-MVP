import { Preferences } from "@capacitor/preferences";
import CryptoJS from "crypto-js";

export class File {
  created: string;
  modified: string;
  name: string;
  content: string;
  billType: number;

  constructor(
    created: string,
    modified: string,
    content: string,
    name: string,
    billType: number
  ) {
    this.created = created;
    this.modified = modified;
    this.content = content;
    this.name = name;
    this.billType = billType;
  }
}

export class Local {
  // Encrypt content using AES
  private _encryptContent = (content: string, password: string): string => {
    try {
      const encrypted = CryptoJS.AES.encrypt(content, password).toString();
      return `Protected_${encrypted}`;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt file content");
    }
  };

  // Decrypt content using AES
  private _decryptContent = (encryptedContent: string, password: string): string => {
    try {
      // Remove "Protected_" prefix
      const actualEncryptedContent = encryptedContent.substring(10);
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
      return this.isProtectedFile(fileData.content);
    } catch (error) {
      return false;
    }
  };

  // Save protected file with encryption
  _saveProtectedFile = async (file: File, password: string) => {
    try {
      const encryptedContent = this._encryptContent(file.content, password);
      let data = {
        created: file.created,
        modified: file.modified,
        content: encryptedContent,
        name: file.name,
        billType: file.billType,
      };
      await Preferences.set({
        key: file.name,
        value: JSON.stringify(data),
      });
    } catch (error) {
      console.error("Error saving protected file:", error);
      throw error;
    }
  };

  // Get protected file with decryption
  _getProtectedFile = async (name: string, password: string) => {
    try {
      const rawData = await Preferences.get({ key: name });
      const fileData = JSON.parse(rawData.value);

      if (this.isProtectedFile(fileData.content)) {
        const decryptedContent = this._decryptContent(fileData.content, password);
        return {
          ...fileData,
          content: decryptedContent
        };
      } else {
        throw new Error("File is not password protected");
      }
    } catch (error) {
      console.error("Error getting protected file:", error);
      throw error;
    }
  };

  _saveFile = async (file: File) => {
    let data = {
      created: file.created,
      modified: file.modified,
      content: file.content,
      name: file.name,
      billType: file.billType,
    };
    await Preferences.set({
      key: file.name,
      value: JSON.stringify(data),
    });
  };

  _getFile = async (name: string) => {
    const rawData = await Preferences.get({ key: name });
    return JSON.parse(rawData.value);
  };

  _getAllFiles = async () => {
    let arr = {};
    const { keys } = await Preferences.keys();
    for (let i = 0; i < keys.length; i++) {
      let fname = keys[i];
      const data = await this._getFile(fname);
      arr[fname] = (data as any).modified;
    }
    return arr;
  };

  _deleteFile = async (name: string) => {
    await Preferences.remove({ key: name });
  };

  _checkKey = async (key: string) => {
    const { keys } = await Preferences.keys();
    if (keys.includes(key, 0)) {
      return true;
    } else {
      return false;
    }
  };
}
