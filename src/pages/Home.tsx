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
import { useEffect, useState, useCallback, useMemo } from "react";
import { Local } from "../components/Storage/LocalStorage";
import { menu, arrowUndo, arrowRedo } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import Files from "../components/Files/Files";
import Cloud from "../components/Cloud/Cloud";
import NewFile from "../components/NewFile/NewFile";
import Login from "../components/Login/Login";
import SimpleModal from "../components/Login/SimpleModal";
import ApiService from "../components/service/Apiservice";

interface FooterItem {
  name: string;
  index: number;
  isActive: boolean;
}

const Home: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedFile, updateSelectedFile] = useState("default");
  const [billType, updateBillType] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentFilePassword, setCurrentFilePassword] = useState<string | null>(null);
  const getDeviceType = () => {
    // Use Ionic's isPlatform for more reliable detection
    if (isPlatform("android")) {
      return "Android";
    }
    if (isPlatform("ipad")) {
      return "iPad";
    }
    if (isPlatform("iphone")) {
      return "iPhone";
    }
    // Ionic's isPlatform does not support "ipod", so check user agent for iPod
    if (/iPod/.test(navigator.userAgent)) {
      return "iPod";
    }

    // Fallback to user agent detection for web browsers
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua)) {
      return "Android";
    }
    if (/iPad/.test(ua) && !(window as any).MSStream) {
      return "iPad";
    }
    if (/iPhone/.test(ua) && !(window as any).MSStream) {
      return "iPhone";
    }
    if (/iPod/.test(ua) && !(window as any).MSStream) {
      return "iPod";
    }
    return "default";
  };
  const [device] = useState("default");

  const store = new Local();

  const closeMenu = () => {
    setShowMenu(false);
  };

  const activateFooter = useCallback((footer: number) => {
    AppGeneral.activateFooterButton(footer);
  }, []);

  const footers = useMemo(() => DATA["home"][getDeviceType()]["footers"], []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await ApiService.checkAuth();
      if (response.success && response.authenticated) {
        setIsLoggedIn(true);
      }
    } catch (error) {
      // Silently handle auth check failure in production
      setIsLoggedIn(false);
    }
  }, []);

  const handleLoginSuccess = useCallback(() => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await ApiService.logout();
      setIsLoggedIn(false);
      // Show success message could be added here if needed
    } catch (error: any) {
      // Even if logout API fails, clear local state for security
      setIsLoggedIn(false);
      // Could show a warning toast here if needed
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    const data = DATA["home"][getDeviceType()]["msc"];
    AppGeneral.initializeApp(JSON.stringify(data));
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    activateFooter(billType);
  }, [billType, activateFooter]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Editing : {selectedFile}</IonTitle>
          <Login
            slot="end"
            onLoginClick={() => {
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
              {footers.map((footerArray: FooterItem) => (
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
            setShowLoginModal(false);
          }}
          onLoginSuccess={handleLoginSuccess}
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;
