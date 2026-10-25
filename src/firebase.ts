import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Configure log level to suppress non-fatal connection warnings
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Use experimentalForceLongPolling to eliminate the 10s streaming timeout in browser/iframe environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
