import React, { useState } from 'react';
import {
    IonButton,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
} from '@ionic/react';
import { layers, close, checkmark } from 'ionicons/icons';
import './FooterSelector.css';

interface Footer {
    name: string;
    index: number;
    isActive: boolean;
}

interface FooterSelectorProps {
    footers: Footer[];
    currentBillType: number;
    onFooterSelect: (index: number) => void;
}

const FooterSelector: React.FC<FooterSelectorProps> = ({
    footers,
    currentBillType,
    onFooterSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleFooterSelect = (index: number) => {
        onFooterSelect(index);
        setIsOpen(false);
    };

    return (
        <>
            {/* Toolbar Icon Button */}
            <IonButton
                fill="clear"
                onClick={() => setIsOpen(true)}
                title="Select Sheet"
                className="footer-selector-toolbar-button"
                slot="end"
            >
                <IonIcon icon={layers} size="large" />
                {/* Badge showing current sheet number */}
                {/* <div className="sheet-badge">{currentBillType}</div> */}
            </IonButton>

            {/* Modal with sheet selection */}
            <IonModal isOpen={isOpen} onDidDismiss={() => setIsOpen(false)} className="footer-selector-modal">
                <IonHeader>
                    <IonToolbar color="primary">
                        <IonTitle>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IonIcon icon={layers} />
                                <span>Select Sheet</span>
                            </div>
                        </IonTitle>
                        <IonButton
                            fill="clear"
                            slot="end"
                            onClick={() => setIsOpen(false)}
                            title="Close"
                        >
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonToolbar>
                </IonHeader>

                <IonContent className="footer-selector-content">
                    <IonList>
                        {footers.map((footer) => (
                            <IonItem
                                key={footer.index}
                                button
                                onClick={() => handleFooterSelect(footer.index)}
                                className={`footer-item ${currentBillType === footer.index ? 'active' : ''}`}
                            >
                                <IonLabel>
                                    <h2>{footer.name}</h2>
                                    <p>Sheet {footer.index}</p>
                                </IonLabel>
                                {currentBillType === footer.index && (
                                    <IonIcon
                                        icon={checkmark}
                                        color="primary"
                                        slot="end"
                                        className="active-indicator"
                                    />
                                )}
                                <IonCheckbox
                                    slot="start"
                                    checked={currentBillType === footer.index}
                                    onIonChange={() => handleFooterSelect(footer.index)}
                                />
                            </IonItem>
                        ))}
                    </IonList>

                    {/* Current sheet info */}
                    <div className="current-sheet-info">
                        <h3>Currently Active</h3>
                        <p>
                            {footers.find(f => f.index === currentBillType)?.name || 'Unknown Sheet'}
                            (Sheet {currentBillType})
                        </p>
                    </div>
                </IonContent>
            </IonModal>
        </>
    );
};

export default FooterSelector; 
