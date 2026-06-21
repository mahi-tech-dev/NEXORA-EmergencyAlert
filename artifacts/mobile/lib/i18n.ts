export type Locale = "en" | "hi" | "mr";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};

export interface Strings {
  // Common
  cancel: string;
  save: string;
  done: string;
  close: string;
  edit: string;
  loading: string;
  retry: string;
  share: string;
  back: string;
  language: string;
  selectLanguage: string;

  // SOS screen
  sosWelcome: string;
  sosGreeting: string;
  sosHint: string;
  sosLabel: string;
  sosSubLabel: string;
  sosSelectType: string;
  sosSelectedPrefix: string;
  sosSectionLabel: string;
  sosCooldown: string;
  sosCountdownLabel: string;
  sosCountdownSub: (n: number) => string;
  sosGettingLocation: string;
  sosCapturingGPS: string;
  sosSentTitle: string;
  sosSentSub: (type: string) => string;
  sosWhatToDo: string;
  sosTestMode: string;
  sosVoiceBtn: string;
  sosVoiceListening: string;
  sosVoiceStop: string;
  sosVoiceDetected: (phrase: string) => string;
  sosVoiceUnavailable: string;
  sosVoiceNoPerm: string;
  sosVoiceNone: string;

  // Emergency types
  typeAccident: string;
  typeFire: string;
  typeHeartAttack: string;
  typeTheft: string;

  // Safety Dashboard
  dashLastAlert: string;
  dashActive: string;
  dashContacts: string;
  dashMedicalID: string;
  dashOffline: string;
  dashNever: string;
  dashReady: string;
  dashNotSet: string;
  dashNone: string;

  // Readiness
  readinessTitle: string;
  readinessGPS: string;
  readinessGPSOn: string;
  readinessGPSOff: string;
  readinessInternet: string;
  readinessOnline: string;
  readinessOffline: string;
  readinessBattery: string;
  readinessBatteryLow: string;
  readinessOfflineMedID: string;
  readinessOfflineMedIDReady: string;
  readinessOfflineMedIDNot: string;
  readinessWarnings: string;

  // Nearby
  nearbyTitle: string;
  nearbyAll: string;
  nearbyHospitals: string;
  nearbyPolice: string;
  nearbyFire: string;
  nearbyOpenMaps: string;
  nearbyCall: string;
  nearbyNoResults: string;
  nearbyError: string;
  nearbyGPSError: string;
  nearbyRetryGPS: string;
  nearbyLoading: string;

  // History
  historyTitle: string;
  historyActive: string;
  historyResolved: string;
  historyNoAlerts: string;
  historyImSafe: string;
  historyViewMap: string;
  historyMarkSafe: string;
  historyConfirm: string;

  // Profile
  profileTitle: string;
  profileEdit: string;
  profileSaving: string;
  profileSaved: string;
  profilePersonal: string;
  profileMedical: string;
  profileContacts: string;
  profileDOB: string;
  profileGender: string;
  profileBloodGroup: string;
  profileAddress: string;
  profileAllergies: string;
  profileConditions: string;
  profileMedications: string;
  profileAddContact: string;
  profileMedicalID: string;
  profileLanguage: string;
  profileUnsaved: string;
  profileUnsavedMsg: string;
  profileStay: string;
  profileDiscard: string;

  // Medical ID
  medicalIDTitle: string;
  medicalIDAllergies: string;
  medicalIDConditions: string;
  medicalIDMedications: string;
  medicalIDContacts: string;
  medicalIDNone: string;
  medicalIDOffline: string;
  medicalIDBloodGroup: string;
  medicalIDQRCode: string;
  medicalIDPDF: string;
  medicalIDWallpaper: string;
  medicalIDEmergencyNum: string;
  medicalIDCall112: string;
}

const en: Strings = {
  cancel: "Cancel",
  save: "Save",
  done: "Done",
  close: "Close",
  edit: "Edit",
  loading: "Loading…",
  retry: "Retry",
  share: "Share",
  back: "Back",
  language: "Language",
  selectLanguage: "Select Language",

  sosWelcome: "Welcome back,",
  sosGreeting: "Responder",
  sosHint: "Emergency SOS",
  sosLabel: "SOS",
  sosSubLabel: "PRESS & HOLD",
  sosSelectType: "Select an emergency type below",
  sosSelectedPrefix: "Emergency: ",
  sosSectionLabel: "Emergency Type",
  sosCooldown: "Emergency alert already active. Please wait 30 seconds.",
  sosCountdownLabel: "Sending Emergency Alert",
  sosCountdownSub: (n) => `Alerting emergency services and your contacts in ${n} second${n !== 1 ? "s" : ""}`,
  sosGettingLocation: "Getting your location…",
  sosCapturingGPS: "Capturing GPS coordinates before sending",
  sosSentTitle: "Alert Sent",
  sosSentSub: (type) => `${type} emergency reported. Help is on the way.`,
  sosWhatToDo: "What to do now",
  sosTestMode: "⚠ TEST MODE — No real emergency services are contacted.",
  sosVoiceBtn: "Voice SOS",
  sosVoiceListening: "Listening for trigger phrase…",
  sosVoiceStop: "Stop Listening",
  sosVoiceDetected: (phrase) => `Trigger phrase detected: "${phrase}"`,
  sosVoiceUnavailable: "Voice recognition is not available on this device or platform.",
  sosVoiceNoPerm: "Microphone permission is required for Voice SOS.",
  sosVoiceNone: "No trigger phrase detected. Tap SOS to send alert manually.",

  typeAccident: "Accident",
  typeFire: "Fire",
  typeHeartAttack: "Heart Attack",
  typeTheft: "Theft / Harassment",

  dashLastAlert: "Last Alert",
  dashActive: "Active",
  dashContacts: "Contacts",
  dashMedicalID: "Medical ID",
  dashOffline: "Offline",
  dashNever: "Never",
  dashReady: "Ready",
  dashNotSet: "Not Set",
  dashNone: "None",

  readinessTitle: "Readiness Status",
  readinessGPS: "GPS",
  readinessGPSOn: "Active",
  readinessGPSOff: "Disabled",
  readinessInternet: "Internet",
  readinessOnline: "Connected",
  readinessOffline: "Offline",
  readinessBattery: "Battery",
  readinessBatteryLow: "Low Battery",
  readinessOfflineMedID: "Offline Medical ID",
  readinessOfflineMedIDReady: "Ready",
  readinessOfflineMedIDNot: "Not Cached",
  readinessWarnings: "Warnings",

  nearbyTitle: "Nearby Services",
  nearbyAll: "All",
  nearbyHospitals: "Hospitals",
  nearbyPolice: "Police",
  nearbyFire: "Fire Stations",
  nearbyOpenMaps: "Open Maps",
  nearbyCall: "Call",
  nearbyNoResults: "No nearby services found in this area.",
  nearbyError: "Could not load nearby services.",
  nearbyGPSError: "Location access is required to find nearby services.",
  nearbyRetryGPS: "Retry Location",
  nearbyLoading: "Finding nearby services…",

  historyTitle: "Emergency History",
  historyActive: "Active",
  historyResolved: "Resolved",
  historyNoAlerts: "No emergency alerts yet.",
  historyImSafe: "I'm Safe",
  historyViewMap: "View on Map",
  historyMarkSafe: "Mark as Safe",
  historyConfirm: "Confirm you are safe — this will resolve the alert.",

  profileTitle: "Profile",
  profileEdit: "Edit",
  profileSaving: "Saving…",
  profileSaved: "Profile Saved Successfully",
  profilePersonal: "Personal Information",
  profileMedical: "Medical Information",
  profileContacts: "Emergency Contacts",
  profileDOB: "Date of Birth",
  profileGender: "Gender",
  profileBloodGroup: "Blood Group",
  profileAddress: "Home Address",
  profileAllergies: "Allergies",
  profileConditions: "Medical Conditions",
  profileMedications: "Current Medications",
  profileAddContact: "Add Contact",
  profileMedicalID: "Medical ID",
  profileLanguage: "App Language",
  profileUnsaved: "Unsaved Changes",
  profileUnsavedMsg: "You have unsaved changes. Do you want to discard them?",
  profileStay: "Stay",
  profileDiscard: "Discard",

  medicalIDTitle: "Emergency Medical ID",
  medicalIDAllergies: "Allergies",
  medicalIDConditions: "Medical Conditions",
  medicalIDMedications: "Current Medications",
  medicalIDContacts: "Emergency Contacts",
  medicalIDNone: "None listed",
  medicalIDOffline: "Showing cached data · Connect to refresh",
  medicalIDBloodGroup: "BLOOD GROUP",
  medicalIDQRCode: "QR Code",
  medicalIDPDF: "PDF Card",
  medicalIDWallpaper: "ICE Wallpaper",
  medicalIDEmergencyNum: "IN EMERGENCY, CALL",
  medicalIDCall112: "Call 112",
};

const hi: Strings = {
  cancel: "रद्द करें",
  save: "सहेजें",
  done: "हो गया",
  close: "बंद करें",
  edit: "संपादन",
  loading: "लोड हो रहा है…",
  retry: "पुनः प्रयास",
  share: "साझा करें",
  back: "वापस",
  language: "भाषा",
  selectLanguage: "भाषा चुनें",

  sosWelcome: "वापस स्वागत है,",
  sosGreeting: "रेस्पॉन्डर",
  sosHint: "आपातकाल SOS",
  sosLabel: "SOS",
  sosSubLabel: "दबाएं और रखें",
  sosSelectType: "नीचे से आपातकाल का प्रकार चुनें",
  sosSelectedPrefix: "आपातकाल: ",
  sosSectionLabel: "आपातकाल का प्रकार",
  sosCooldown: "आपातकाल अलर्ट पहले से सक्रिय है। 30 सेकंड प्रतीक्षा करें।",
  sosCountdownLabel: "आपातकाल अलर्ट भेजा जा रहा है",
  sosCountdownSub: (n) => `${n} सेकंड में आपातकालीन सेवाओं और संपर्कों को सूचित किया जाएगा`,
  sosGettingLocation: "आपका स्थान प्राप्त किया जा रहा है…",
  sosCapturingGPS: "भेजने से पहले GPS निर्देशांक कैप्चर किए जा रहे हैं",
  sosSentTitle: "अलर्ट भेजा गया",
  sosSentSub: (type) => `${type} आपातकाल की सूचना दी गई। सहायता आ रही है।`,
  sosWhatToDo: "अब क्या करें",
  sosTestMode: "⚠ परीक्षण मोड — कोई वास्तविक आपातकालीन सेवा से संपर्क नहीं किया गया।",
  sosVoiceBtn: "वॉइस SOS",
  sosVoiceListening: "ट्रिगर वाक्यांश सुन रहा है…",
  sosVoiceStop: "सुनना बंद करें",
  sosVoiceDetected: (phrase) => `ट्रिगर वाक्यांश मिला: "${phrase}"`,
  sosVoiceUnavailable: "इस डिवाइस या प्लेटफॉर्म पर वॉइस पहचान उपलब्ध नहीं है।",
  sosVoiceNoPerm: "वॉइस SOS के लिए माइक्रोफ़ोन अनुमति आवश्यक है।",
  sosVoiceNone: "कोई ट्रिगर वाक्यांश नहीं मिला। अलर्ट भेजने के लिए SOS दबाएं।",

  typeAccident: "दुर्घटना",
  typeFire: "आग",
  typeHeartAttack: "दिल का दौरा",
  typeTheft: "चोरी / उत्पीड़न",

  dashLastAlert: "अंतिम अलर्ट",
  dashActive: "सक्रिय",
  dashContacts: "संपर्क",
  dashMedicalID: "मेडिकल ID",
  dashOffline: "ऑफलाइन",
  dashNever: "कभी नहीं",
  dashReady: "तैयार",
  dashNotSet: "सेट नहीं",
  dashNone: "कोई नहीं",

  readinessTitle: "तैयारी स्थिति",
  readinessGPS: "GPS",
  readinessGPSOn: "सक्रिय",
  readinessGPSOff: "बंद",
  readinessInternet: "इंटरनेट",
  readinessOnline: "जुड़ा हुआ",
  readinessOffline: "ऑफलाइन",
  readinessBattery: "बैटरी",
  readinessBatteryLow: "बैटरी कम",
  readinessOfflineMedID: "ऑफलाइन मेडिकल ID",
  readinessOfflineMedIDReady: "तैयार",
  readinessOfflineMedIDNot: "कैश नहीं",
  readinessWarnings: "चेतावनियां",

  nearbyTitle: "नजदीकी सेवाएं",
  nearbyAll: "सभी",
  nearbyHospitals: "अस्पताल",
  nearbyPolice: "पुलिस",
  nearbyFire: "फायर स्टेशन",
  nearbyOpenMaps: "मैप खोलें",
  nearbyCall: "कॉल करें",
  nearbyNoResults: "इस क्षेत्र में कोई नजदीकी सेवा नहीं मिली।",
  nearbyError: "नजदीकी सेवाएं लोड नहीं हो सकीं।",
  nearbyGPSError: "नजदीकी सेवाएं खोजने के लिए स्थान अनुमति आवश्यक है।",
  nearbyRetryGPS: "स्थान पुनः प्रयास",
  nearbyLoading: "नजदीकी सेवाएं खोजी जा रही हैं…",

  historyTitle: "आपातकाल इतिहास",
  historyActive: "सक्रिय",
  historyResolved: "हल हुआ",
  historyNoAlerts: "अभी तक कोई आपातकाल अलर्ट नहीं।",
  historyImSafe: "मैं सुरक्षित हूं",
  historyViewMap: "मैप पर देखें",
  historyMarkSafe: "सुरक्षित चिह्नित करें",
  historyConfirm: "पुष्टि करें कि आप सुरक्षित हैं — इससे अलर्ट हल हो जाएगा।",

  profileTitle: "प्रोफ़ाइल",
  profileEdit: "संपादन",
  profileSaving: "सहेजा जा रहा है…",
  profileSaved: "प्रोफ़ाइल सफलतापूर्वक सहेजी गई",
  profilePersonal: "व्यक्तिगत जानकारी",
  profileMedical: "चिकित्सा जानकारी",
  profileContacts: "आपातकालीन संपर्क",
  profileDOB: "जन्म तिथि",
  profileGender: "लिंग",
  profileBloodGroup: "ब्लड ग्रुप",
  profileAddress: "घर का पता",
  profileAllergies: "एलर्जी",
  profileConditions: "चिकित्सा स्थितियां",
  profileMedications: "वर्तमान दवाएं",
  profileAddContact: "संपर्क जोड़ें",
  profileMedicalID: "मेडिकल ID",
  profileLanguage: "ऐप भाषा",
  profileUnsaved: "असहेजे परिवर्तन",
  profileUnsavedMsg: "आपके पास असहेजे परिवर्तन हैं। क्या आप उन्हें छोड़ना चाहते हैं?",
  profileStay: "रहें",
  profileDiscard: "छोड़ें",

  medicalIDTitle: "आपातकालीन चिकित्सा पहचान",
  medicalIDAllergies: "एलर्जी",
  medicalIDConditions: "चिकित्सा स्थितियां",
  medicalIDMedications: "वर्तमान दवाएं",
  medicalIDContacts: "आपातकालीन संपर्क",
  medicalIDNone: "कोई सूचीबद्ध नहीं",
  medicalIDOffline: "कैश डेटा दिखाया जा रहा है · ताज़ा करने के लिए जुड़ें",
  medicalIDBloodGroup: "ब्लड ग्रुप",
  medicalIDQRCode: "QR कोड",
  medicalIDPDF: "PDF कार्ड",
  medicalIDWallpaper: "ICE वॉलपेपर",
  medicalIDEmergencyNum: "आपातकाल में कॉल करें",
  medicalIDCall112: "112 पर कॉल करें",
};

const mr: Strings = {
  cancel: "रद्द करा",
  save: "जतन करा",
  done: "झाले",
  close: "बंद करा",
  edit: "संपादन",
  loading: "लोड होत आहे…",
  retry: "पुन्हा प्रयत्न करा",
  share: "शेअर करा",
  back: "मागे",
  language: "भाषा",
  selectLanguage: "भाषा निवडा",

  sosWelcome: "पुन्हा स्वागत आहे,",
  sosGreeting: "रेस्पॉन्डर",
  sosHint: "आणीबाणी SOS",
  sosLabel: "SOS",
  sosSubLabel: "दाबा आणि धरा",
  sosSelectType: "खाली आणीबाणीचा प्रकार निवडा",
  sosSelectedPrefix: "आणीबाणी: ",
  sosSectionLabel: "आणीबाणीचा प्रकार",
  sosCooldown: "आणीबाणी अलर्ट आधीच सक्रिय आहे. 30 सेकंद थांबा.",
  sosCountdownLabel: "आणीबाणी अलर्ट पाठवला जात आहे",
  sosCountdownSub: (n) => `${n} सेकंदात आपत्कालीन सेवा आणि संपर्कांना सूचित केले जाईल`,
  sosGettingLocation: "तुमचे स्थान मिळवले जात आहे…",
  sosCapturingGPS: "पाठवण्यापूर्वी GPS निर्देशांक कॅप्चर केले जात आहेत",
  sosSentTitle: "अलर्ट पाठवला",
  sosSentSub: (type) => `${type} आणीबाणीची नोंद केली. मदत येत आहे.`,
  sosWhatToDo: "आता काय करावे",
  sosTestMode: "⚠ चाचणी मोड — कोणत्याही खऱ्या आपत्कालीन सेवेशी संपर्क केला नाही.",
  sosVoiceBtn: "व्हॉइस SOS",
  sosVoiceListening: "ट्रिगर वाक्यांश ऐकत आहे…",
  sosVoiceStop: "ऐकणे थांबवा",
  sosVoiceDetected: (phrase) => `ट्रिगर वाक्यांश आढळला: "${phrase}"`,
  sosVoiceUnavailable: "या डिव्हाइस किंवा प्लॅटफॉर्मवर व्हॉइस ओळख उपलब्ध नाही.",
  sosVoiceNoPerm: "व्हॉइस SOS साठी मायक्रोफोन परवानगी आवश्यक आहे.",
  sosVoiceNone: "कोणता ट्रिगर वाक्यांश आढळला नाही. अलर्ट पाठवण्यासाठी SOS दाबा.",

  typeAccident: "अपघात",
  typeFire: "आग",
  typeHeartAttack: "हृदयविकाराचा झटका",
  typeTheft: "चोरी / छळ",

  dashLastAlert: "अखेरचा अलर्ट",
  dashActive: "सक्रिय",
  dashContacts: "संपर्क",
  dashMedicalID: "मेडिकल ID",
  dashOffline: "ऑफलाइन",
  dashNever: "कधीही नाही",
  dashReady: "तयार",
  dashNotSet: "सेट नाही",
  dashNone: "काहीही नाही",

  readinessTitle: "तयारी स्थिती",
  readinessGPS: "GPS",
  readinessGPSOn: "सक्रिय",
  readinessGPSOff: "बंद",
  readinessInternet: "इंटरनेट",
  readinessOnline: "जोडलेले",
  readinessOffline: "ऑफलाइन",
  readinessBattery: "बॅटरी",
  readinessBatteryLow: "बॅटरी कमी",
  readinessOfflineMedID: "ऑफलाइन मेडिकल ID",
  readinessOfflineMedIDReady: "तयार",
  readinessOfflineMedIDNot: "कॅश नाही",
  readinessWarnings: "इशारे",

  nearbyTitle: "जवळील सेवा",
  nearbyAll: "सर्व",
  nearbyHospitals: "रुग्णालये",
  nearbyPolice: "पोलीस",
  nearbyFire: "अग्निशमन केंद्र",
  nearbyOpenMaps: "नकाशा उघडा",
  nearbyCall: "कॉल करा",
  nearbyNoResults: "या क्षेत्रात जवळील सेवा आढळल्या नाहीत.",
  nearbyError: "जवळील सेवा लोड होऊ शकल्या नाहीत.",
  nearbyGPSError: "जवळील सेवा शोधण्यासाठी स्थान परवानगी आवश्यक आहे.",
  nearbyRetryGPS: "स्थान पुन्हा प्रयत्न",
  nearbyLoading: "जवळील सेवा शोधत आहे…",

  historyTitle: "आणीबाणी इतिहास",
  historyActive: "सक्रिय",
  historyResolved: "निराकरण",
  historyNoAlerts: "अजून कोणतेही आणीबाणी अलर्ट नाहीत.",
  historyImSafe: "मी सुरक्षित आहे",
  historyViewMap: "नकाशावर पहा",
  historyMarkSafe: "सुरक्षित म्हणून चिन्हांकित करा",
  historyConfirm: "तुम्ही सुरक्षित असल्याची पुष्टी करा — यामुळे अलर्ट निराकरण होईल.",

  profileTitle: "प्रोफाइल",
  profileEdit: "संपादन",
  profileSaving: "जतन होत आहे…",
  profileSaved: "प्रोफाइल यशस्वीरित्या जतन केली",
  profilePersonal: "वैयक्तिक माहिती",
  profileMedical: "वैद्यकीय माहिती",
  profileContacts: "आणीबाणी संपर्क",
  profileDOB: "जन्मतारीख",
  profileGender: "लिंग",
  profileBloodGroup: "रक्तगट",
  profileAddress: "घराचा पत्ता",
  profileAllergies: "ॲलर्जी",
  profileConditions: "वैद्यकीय परिस्थिती",
  profileMedications: "सध्याची औषधे",
  profileAddContact: "संपर्क जोडा",
  profileMedicalID: "मेडिकल ID",
  profileLanguage: "ॲप भाषा",
  profileUnsaved: "न जतन केलेले बदल",
  profileUnsavedMsg: "तुमच्याकडे न जतन केलेले बदल आहेत. ते टाकून द्यायचे आहेत का?",
  profileStay: "राहा",
  profileDiscard: "टाका",

  medicalIDTitle: "आणीबाणी वैद्यकीय ओळख",
  medicalIDAllergies: "ॲलर्जी",
  medicalIDConditions: "वैद्यकीय परिस्थिती",
  medicalIDMedications: "सध्याची औषधे",
  medicalIDContacts: "आणीबाणी संपर्क",
  medicalIDNone: "काहीही सूचीबद्ध नाही",
  medicalIDOffline: "कॅश डेटा दाखवत आहे · रिफ्रेश करण्यासाठी जोडा",
  medicalIDBloodGroup: "रक्तगट",
  medicalIDQRCode: "QR कोड",
  medicalIDPDF: "PDF कार्ड",
  medicalIDWallpaper: "ICE वॉलपेपर",
  medicalIDEmergencyNum: "आणीबाणीत कॉल करा",
  medicalIDCall112: "112 ला कॉल करा",
};

export const translations: Record<Locale, Strings> = { en, hi, mr };
