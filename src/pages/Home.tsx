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
import SimpleModal from "../components/Login/SimpleModal";
import ApiService from "../components/service/Apiservice";
import { useApp } from "../contexts/AppContext";

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

  // Auto-save related state
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cellChangeListenerRef = useRef<(() => void) | null>(null);
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

  useEffect(() => {
    const data = DATA["home"][getDeviceType()]["msc"];
    AppGeneral.initializeApp(JSON.stringify(data));
    checkAuthStatus();
  }, []);

  useEffect(() => {
    activateFooter(billType);
  }, [billType]);

  // Set up auto-save with cell change listener
  useEffect(() => {
    // Set up cell change listener
    const removeListener = AppGeneral.setupCellChangeListener((eventData) => {
      console.log("Cell changed:", eventData.coord, "->", eventData.newValue, "triggering auto-save");
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
      const response = await ApiService.checkAuth();
      if (response.success && response.authenticated) {
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
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

  // Auto-save function with debouncing
  const handleAutoSave = async () => {
    if (selectedFile === "default") {
      console.log("Skipping auto-save for default template");
      return; // Don't save default template
    }

    console.log("Auto-saving file:", selectedFile);
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

      // Create file object
      const file = new File(
        existingData?.created || new Date().toString(),
        new Date().toString(), // Updated modified time
        content,
        selectedFile,
        billType
      );

      // Check if current file is password protected and we have the password
      if (currentFilePassword && existingData && store.isProtectedFile(existingData.content)) {
        // Save as protected file with the same password
        await store._saveProtectedFile(file, currentFilePassword);
        console.log("Auto-save completed (protected file)");
      } else {
        // Save as regular file
        await store._saveFile(file);
        console.log("Auto-save completed (regular file)");
      }

      setAutoSaveStatus('saved');

      // Reset status to idle after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);

    } catch (error) {
      console.error("Auto-save failed:", error);
      setAutoSaveStatus('error');

      // Reset status to idle after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
    }
  };

  // Debounced auto-save trigger
  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer with 2-second delay
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
      autoSaveTimerRef.current = null;
    }, 2000);
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
                      <span style={{ color: '#ffffff' }}>Saving...</span>
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
                      <span style={{ color: '#FFB6C1' }}>✗</span>
                      <span style={{ color: '#FFB6C1' }}>Error</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </IonTitle>
          <Login
            slot="end"
            onLoginClick={() => {
              console.log('Setting showLoginModal to true');
              setShowLoginModal(true);
            }}
            isLoggedIn={isLoggedIn}
            loading={authLoading}
            onLogout={handleLogout}
          />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
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
            className="ion-padding-end"
            slot="end"
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
        <IonToolbar color="secondary">
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
        </IonToolbar>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton type="button" onClick={() => setShowMenu(true)}>
            <IonIcon icon={menu} />
          </IonFabButton>
        </IonFab>

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

        <SimpleModal
          isOpen={showLoginModal}
          onClose={() => {
            console.log('Closing login modal');
            setShowLoginModal(false);
          }}
          onLoginSuccess={handleLoginSuccess}
        />

        <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'red', color: 'white', padding: '5px', zIndex: 99999 }}>
          Modal Open: {showLoginModal ? 'YES' : 'NO'}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
