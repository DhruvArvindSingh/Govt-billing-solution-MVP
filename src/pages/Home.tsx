import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  isPlatform,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { APP_NAME, DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { useEffect, useState, useRef } from "react";
import { File, Local } from "../components/Storage/LocalStorage";
import { menu, arrowUndo, arrowRedo } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import Files from "../components/Files/Files";
import Cloud from "../components/Cloud/Cloud";
import NewFile from "../components/NewFile/NewFile";
import Login from "../components/Login/Login";
import FooterSelector from "../components/FooterSelector/FooterSelector";
import ApiService from "../components/service/Apiservice";
import { useApp } from "../contexts/AppContext";
import AUTO_SAVE_CONFIG, { isAutoSaveEnabled } from "../config/autosave.config";
import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';

const Home: React.FC = () => {
  // Use AppContext for state management
  const {
    selectedFile,
    billType,
    store,
    updateSelectedFile,
    updateBillType,
    autoSaveStatus,
    setAutoSaveStatus
  } = useApp();

  const [showMenu, setShowMenu] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentFilePassword, setCurrentFilePassword] = useState<string | null>(null);
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Auto-save related state
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cellChangeListenerRef = useRef<(() => void) | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  const containerScrollTopRef = useRef<number>(0);
  const getDeviceType = () => {
    // Use Ionic's isPlatform for more reliable detection
    if (isPlatform("android")) {
      console.log("android from isPlatform");
      return "Android";
    }
    if (isPlatform("ipad")) {
      console.log("ipad from isPlatform");
      return "iPad";
    }
    if (isPlatform("iphone")) {
      console.log("iphone from isPlatform");
      return "iPhone";
    }
    // Ionic's isPlatform does not support "ipod", so check user agent for iPod
    if (/iPod/.test(navigator.userAgent)) {
      console.log("ipod from user agent");
      return "iPod";
    }

    //   // Fallback to user agent detection for web browsers
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua)) {
      console.log("android from user agent");
      return "Android";
    }
    if (/iPad/.test(ua) && !(window as any).MSStream) {
      console.log("ipad from user agent");
      return "iPad";
    }
    if (/iPhone/.test(ua) && !(window as any).MSStream) {
      console.log("iphone from user agent");
      return "iPhone";
    }
    if (/iPod/.test(ua) && !(window as any).MSStream) {
      console.log("ipod from user agent");
      return "iPod";
    }
    return "default";
  };
  const [device] = useState("default");

  const closeMenu = () => {
    setShowMenu(false);
  };

  const activateFooter = (footer) => {
    AppGeneral.activateFooterButton(footer);
  };

  const handleFooterSelect = (index: number) => {
    updateBillType(index);
    activateFooter(index);
  };

  useEffect(() => {
    const waitForDOM = () => {
      return new Promise<void>((resolve) => {
        const checkDOM = () => {
          const container = document.getElementById('container');
          const tableeditor = document.getElementById('tableeditor');
          const workbookControl = document.getElementById('workbookControl');

          if (container && tableeditor && workbookControl) {
            resolve();
          } else {
            setTimeout(checkDOM, 100);
          }
        };
        checkDOM();
      });
    };

    const initializeApplication = async () => {
      try {
        // Wait for DOM elements to be ready
        await waitForDOM();

        // Add a small delay to ensure everything is properly rendered
        await new Promise(resolve => setTimeout(resolve, 200));

        // Check if there's a "___default___" file in localStorage
        console.log("Checking for '___default___' file in localStorage...");

        // First check if the key exists
        const defaultFileExists = await store._checkKey("___default___");
        console.log("___default___ file exists in storage:", defaultFileExists);

        if (defaultFileExists) {
          try {
            const defaultFile = await store._getFile("___default___");
            console.log("Retrieved ___default___ file:", defaultFile ? "Found" : "Not found");

            if (defaultFile && defaultFile.content) {
              console.log("Loading saved ___default___ file from localStorage");
              console.log("___default___ file content length:", defaultFile.content.length);
              console.log("___default___ file billType:", defaultFile.billType);

              // Load the saved default file
              AppGeneral.viewFile("default", decodeURIComponent(defaultFile.content));
              updateSelectedFile("default");
              updateBillType(defaultFile.billType || 1);

              // Delete the ___default___ file after loading it
              await store._deleteFile("___default___");
              console.log("___default___ file loaded and deleted from localStorage");
              return;
            } else {
              console.log("___default___ file exists but has no content");
            }
          } catch (error) {
            console.error("Error loading ___default___ file:", error);
          }
        } else {
          console.log("No '___default___' file key found in localStorage");
        }

        // If no default file exists, load template data from app-data
        console.log("Loading template data from app-data");
        const data = DATA["home"][getDeviceType()]["msc"];
        AppGeneral.initializeApp(JSON.stringify(data));
        updateSelectedFile("default");
      } catch (error) {
        console.error("Error during app initialization:", error);
        // Ultimate fallback: load template data with DOM check
        try {
          await waitForDOM();
          await new Promise(resolve => setTimeout(resolve, 200));
          const data = DATA["home"][getDeviceType()]["msc"];
          AppGeneral.initializeApp(JSON.stringify(data));
          updateSelectedFile("default");
        } catch (fallbackError) {
          console.error("Fallback initialization also failed:", fallbackError);
        }
      }
    };

    initializeApplication();

    // Check authentication status on app start
    // This will set the login button to logout if token is present
    checkAuthStatus();

    // Add beforeunload event listener to handle app close (web browsers)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      handleAppClose();
      // For some browsers, we need to set returnValue to trigger the beforeunload
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Add mobile app lifecycle listeners (mobile apps)
    let appStateListener: any;
    let backButtonListener: any;
    let keyboardWillShowListener: any;
    let keyboardWillHideListener: any;

    if (isPlatform('hybrid')) {
      // Listen for app state changes (background/foreground)
      appStateListener = App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          // App is going to background, save current work
          handleAppClose();
        }
      });

      // Listen for back button (Android)
      backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          // App is about to exit, save current work
          handleAppClose();
          App.exitApp();
        }
      });

      // Handle keyboard events
      keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
        // Store current scroll position before keyboard appears
        const container = document.getElementById('container');
        if (container) {
          containerScrollTopRef.current = container.scrollTop || 0;
        }
      });

      keyboardWillHideListener = Keyboard.addListener('keyboardWillHide', () => {
        // Restore scroll position after keyboard disappears
        setTimeout(() => {
          const container = document.getElementById('container');
          if (container) {
            container.scrollTop = containerScrollTopRef.current;
          }
          // Also ensure ion-content scrolls back to original position
          const ionContent = document.querySelector('ion-content');
          if (ionContent) {
            ionContent.scrollToTop(300);
          }
        }, 150); // Small delay to ensure keyboard is fully hidden
      });
    }

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (appStateListener) {
        appStateListener.remove();
      }
      if (backButtonListener) {
        backButtonListener.remove();
      }
      if (keyboardWillShowListener) {
        keyboardWillShowListener.remove();
      }
      if (keyboardWillHideListener) {
        keyboardWillHideListener.remove();
      }
    };
  }, []);

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

  // Set up auto-save with cell change listener
  useEffect(() => {
    // Set up cell change listener
    const removeListener = AppGeneral.setupCellChangeListener((eventData) => {
      triggerAutoSave();
    });

    // Store cleanup function
    cellChangeListenerRef.current = removeListener;

    // Cleanup function
    return () => {
      if (cellChangeListenerRef.current) {
        cellChangeListenerRef.current();
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [selectedFile, billType, currentFilePassword]); // Re-setup when dependencies change

  const checkAuthStatus = async () => {
    try {
      // First check if token exists in localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      // If token exists, verify it with the server
      const response = await ApiService.checkAuth();
      if (response.success && response.authenticated) {
        setIsLoggedIn(true);
      } else {
        // Token is invalid, clear it and set logged out state
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      // On error, check if we have a token and assume logged in state
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setAuthLoading(true);

    // Clear token and email from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('email');

    // Update local state
    setIsLoggedIn(false);
    alert('Successfully logged out!');

    setAuthLoading(false);
  };


  // Handle app close - save current file if needed
  const handleAppClose = () => {
    try {
      // Get current spreadsheet content (decrypted/plain text)
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());

      // Check if we have content to save
      if (!content || content === encodeURIComponent('')) {
        return;
      }

      // Show save notification
      setShowSaveNotification(true);

      // Save the last opened filename for restoration on next app start
      store._saveLastOpenedFile(selectedFile).catch(error => {
        console.error('Error saving last opened filename:', error);
      });

      // ALWAYS save DECRYPTED content as "___default___" for easy recovery (no password protection)
      // This ensures the user can always recover their work even if they forget the password
      const defaultFile = new File(
        new Date().toString(),
        new Date().toString(),
        content,
        '___default___',
        billType,
        false, // Never password protected - for crash recovery
        null   // No password for default file
      );

      // Save the file with "___default___" name (fire and forget for beforeunload)
      store._saveFile(defaultFile).then(() => {
        console.log(`Current file saved as ___default___ (decrypted for recovery)`);
        setShowSaveNotification(false);
      }).catch(error => {
        console.error('Error saving ___default___ file on app close:', error);
        setShowSaveNotification(false);
      });

      // Also save the file with its original name if it's not "default"
      if (selectedFile !== 'default') {
        store._getFile(selectedFile).then(existingData => {
          // Check if the current file is password protected
          const isCurrentFileProtected = existingData?.isPasswordProtected === true ||
            (existingData && store.isProtectedFile(existingData.content));

          // If file is password protected, save ENCRYPTED content with original filename
          // If file is not protected, save as regular file
          const file = new File(
            existingData?.created || new Date().toString(),
            new Date().toString(),
            content, // This will be encrypted automatically if password protected
            selectedFile,
            billType,
            isCurrentFileProtected, // Maintain password protection status
            currentFilePassword || existingData?.password // Use session password or stored password
          );

          // Save using the unified method (handles AES encryption automatically for protected files)
          return store._saveFile(file);
        }).then(() => {
          console.log(`File also saved with original name: ${selectedFile} (encrypted if password protected)`);
        }).catch(error => {
          console.error('Error saving file with original name on app close:', error);
        });
      }
    } catch (error) {
      console.error('Error during app close save:', error);
      setShowSaveNotification(false);
    }
  };

  // Auto-save function with debouncing and retry logic
  const handleAutoSave = async (isRetry = false) => {
    // Check if auto-save is enabled (check user preference first)
    if (!isAutoSaveEnabled()) {
      return;
    }

    // Check if file should be excluded from auto-save
    if (AUTO_SAVE_CONFIG.EXCLUDED_FILES.includes(selectedFile.toLowerCase())) {
      return;
    }

    // Prevent excessive saving - enforce minimum interval
    const now = Date.now();
    if (now - lastSaveTimeRef.current < AUTO_SAVE_CONFIG.MIN_SAVE_INTERVAL && !isRetry) {
      return;
    }

    lastSaveTimeRef.current = now;
    setAutoSaveStatus('saving');

    try {
      // Get current spreadsheet content
      const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());

      // Get existing file data for created timestamp
      let existingData;
      try {
        existingData = await store._getFile(selectedFile);
      } catch (error) {
        // File doesn't exist yet
        existingData = null;
      }

      // Create file object with unified schema
      const file = new File(
        existingData?.created || new Date().toString(),
        new Date().toString(), // Updated modified time
        content,
        selectedFile,
        billType,
        existingData?.isPasswordProtected || (currentFilePassword ? true : false),
        currentFilePassword || existingData?.password
      );

      // Save using the unified method
      await store._saveFile(file);

      setAutoSaveStatus('saved');
      retryCountRef.current = 0; // Reset retry count on successful save

      // Reset status to idle after configured duration
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, AUTO_SAVE_CONFIG.SAVED_STATUS_DURATION);

    } catch (error) {
      console.error("Auto-save failed:", error);

      // Implement retry logic
      if (retryCountRef.current < AUTO_SAVE_CONFIG.MAX_RETRY_ATTEMPTS) {
        retryCountRef.current++;
        setTimeout(() => {
          handleAutoSave(true); // Retry
        }, AUTO_SAVE_CONFIG.RETRY_DELAY);
        return; // Don't show error status during retry
      }

      // Show error after all retries failed
      setAutoSaveStatus('error');
      retryCountRef.current = 0; // Reset retry count

      // Reset status to idle after configured duration
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, AUTO_SAVE_CONFIG.ERROR_STATUS_DURATION);
    }
  };

  // Debounced auto-save trigger
  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer with configured delay
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
      autoSaveTimerRef.current = null;
    }, AUTO_SAVE_CONFIG.DEBOUNCE_DELAY);
  };

  const footers = DATA["home"][getDeviceType()]["footers"];
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Editing : {selectedFile}</span>
              {autoSaveStatus !== 'idle' && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', gap: '4px' }}>
                  {autoSaveStatus === 'saving' && (
                    <>
                      <div className="saving-spinner" style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid #f3f3f3',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <span style={{ color: '#ffffff', fontSize: '11px' }}>
                        {retryCountRef.current > 0 ? `Retrying... (${retryCountRef.current}/${AUTO_SAVE_CONFIG.MAX_RETRY_ATTEMPTS})` : 'Saving...'}
                      </span>
                    </>
                  )}
                  {autoSaveStatus === 'saved' && (
                    <>
                      <span style={{ color: '#90EE90' }}>✓</span>
                      <span style={{ color: '#90EE90' }}>Saved</span>
                    </>
                  )}
                  {autoSaveStatus === 'error' && (
                    <>
                      <span style={{ color: '#FFB6C1' }}>⚠</span>
                      <span style={{ color: '#FFB6C1', fontSize: '11px' }}>Save Failed</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </IonTitle>
          <Login
            slot="end"
            isLoggedIn={isLoggedIn}
            loading={authLoading}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        </IonToolbar>
      </IonHeader>
      <IonToolbar color="primary">
        <IonIcon
          icon={arrowUndo}
          size="large"
          onClick={() => AppGeneral.undo()}
          className="ion-padding-end"
          slot="end"
        />
        <IonIcon
          icon={arrowRedo}
          size="large"
          onClick={() => AppGeneral.redo()}
          slot="end"
        />
        <FooterSelector
          footers={footers}
          currentBillType={billType}
          onFooterSelect={handleFooterSelect}
        />
        <Cloud
          store={store}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          updateBillType={updateBillType}
        />
        <Files
          store={store}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          updateBillType={updateBillType}
          setCurrentFilePassword={setCurrentFilePassword}
          isLoggedIn={isLoggedIn}
        />

        <NewFile
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          store={store}
          billType={billType}
          currentFilePassword={currentFilePassword}
          setCurrentFilePassword={setCurrentFilePassword}
        />
      </IonToolbar>
      <IonContent fullscreen>
        {/* <IonToolbar color="secondary">
          <IonGrid>
            <IonRow className="ion-nowrap">
              {footers.map((footerArray) => (
                <IonCol key={footerArray.index} size="auto">
                  <IonButton
                    expand="block"
                    color="light"
                    size="small"
                    className="ion-no-margin"
                    onClick={() => {
                      updateBillType(footerArray.index);
                      activateFooter(footerArray.index);
                    }}
                  >
                    {footerArray.name}
                  </IonButton>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </IonToolbar> */}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton type="button" onClick={() => setShowMenu(true)}>
            <IonIcon icon={menu} />
          </IonFabButton>
        </IonFab>

        {/* Footer Selector Component */}

        <Menu
          showM={showMenu}
          setM={closeMenu}
          file={selectedFile}
          updateSelectedFile={updateSelectedFile}
          store={store}
          bT={billType}
          currentFilePassword={currentFilePassword}
          setCurrentFilePassword={setCurrentFilePassword}
        />

        <div id="container">
          <div id="workbookControl"></div>
          <div id="tableeditor"></div>
          <div id="msg"></div>
        </div>


        {/* Save notification */}
        {showSaveNotification && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #ffffff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Saving file...</span>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
