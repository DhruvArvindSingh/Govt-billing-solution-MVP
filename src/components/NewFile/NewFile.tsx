import React, { useState } from "react";
import * as AppGeneral from "../socialcalc/index.js";
import { File, Local } from "../Storage/LocalStorage";
import { DATA } from "../../app-data.js";
import { IonAlert, IonIcon } from "@ionic/react";
import { add } from "ionicons/icons";

const NewFile: React.FC<{
  file: string;
  updateSelectedFile: Function;
  store: Local;
  billType: number;
  currentFilePassword?: string | null;
  setCurrentFilePassword?: Function;
}> = (props) => {
  const [showAlertNewFileCreated, setShowAlertNewFileCreated] = useState(false);
  const newFile = async () => {
    if (props.file !== "default") {
      try {
        const content = encodeURIComponent(AppGeneral.getSpreadsheetContent());
        const data = await props.store._getFile(props.file);
        const file = new File(
          (data as any).created,
          new Date().toString(),
          content,
          props.file,
          props.billType
        );

        // Check if current file is protected and save accordingly
        if (props.currentFilePassword && props.store.isProtectedFile((data as any).content)) {
          await props.store._saveProtectedFile(file, props.currentFilePassword);
        } else {
          await props.store._saveFile(file);
        }

        props.updateSelectedFile(props.file);
      } catch (error) {
        console.error("Error saving current file before creating new one:", error);
      }
    }

    // Clear password since we're creating a new default file
    if (props.setCurrentFilePassword) {
      props.setCurrentFilePassword(null);
    }

    const msc = DATA["home"][AppGeneral.getDeviceType()]["msc"];
    AppGeneral.viewFile("default", JSON.stringify(msc));
    props.updateSelectedFile("default");

    // Save as last opened file
    props.store._saveLastOpenedFile("default").catch(error => {
      console.error('Error saving last opened filename:', error);
    });

    setShowAlertNewFileCreated(true);
  };

  return (
    <React.Fragment>
      <IonIcon
        icon={add}
        slot="end"
        className="ion-padding-end"
        size="large"
        onClick={() => {
          newFile();
          // console.log("New file clicked");
        }}
      />
      <IonAlert
        animated
        isOpen={showAlertNewFileCreated}
        onDidDismiss={() => setShowAlertNewFileCreated(false)}
        header="Alert Message"
        message={"New file created!"}
        buttons={["Ok"]}
      />
    </React.Fragment>
  );
};

export default NewFile;
