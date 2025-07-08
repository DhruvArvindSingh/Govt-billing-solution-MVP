import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonPage,
  IonPopover,
  IonTitle,
  IonToolbar,
  isPlatform,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { APP_NAME, DATA } from "../app-data";
import * as AppGeneral from "../components/socialcalc/index.js";
import { useEffect, useState } from "react";
import { Local } from "../components/Storage/LocalStorage";
import { menu, settings } from "ionicons/icons";
import "./Home.css";
import Menu from "../components/Menu/Menu";
import Files from "../components/Files/Files";
import Cloud from "../components/Cloud/Cloud";
import NewFile from "../components/NewFile/NewFile";
import Login from "../components/Login/Login";
import SimpleModal from "../components/Login/SimpleModal";
import ApiService from "../components/service/Apiservice";

const Home: React.FC = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [showPopover, setShowPopover] = useState<{
    open: boolean;
    event: Event | undefined;
  }>({ open: false, event: undefined });
  const [selectedFile, updateSelectedFile] = useState("default");
  const [billType, updateBillType] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentFilePassword, setCurrentFilePassword] = useState<string | null>(null);
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

  const store = new Local();

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

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      const response = await ApiService.logout();
      setIsLoggedIn(false);
      alert('Successfully logged out!');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local state
      setIsLoggedIn(false);
      alert('Logged out successfully!');
    } finally {
      setAuthLoading(false);
    }
  };

  const footers = DATA["home"][getDeviceType()]["footers"];
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Editing : {selectedFile}</IonTitle>
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
          <Cloud
            store={store}
            file={selectedFile}
            updateSelectedFile={updateSelectedFile}
            updateBillType={updateBillType}
          />
          <IonIcon
            icon={settings}
            slot="end"
            className="ion-padding-end"
            size="large"
            onClick={(e) => {
              setShowPopover({ open: true, event: e.nativeEvent });
              console.log("Popover clicked");
            }}
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
          <IonPopover
            animated
            keyboardClose
            backdropDismiss
            event={showPopover.event}
            isOpen={showPopover.open}
            onDidDismiss={() =>
              setShowPopover({ open: false, event: undefined })
            }
          >
          </IonPopover>
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
                      setShowPopover({ open: false, event: undefined });
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
