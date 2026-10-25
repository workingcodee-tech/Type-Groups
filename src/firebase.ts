import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Configure log level to suppress non-fatal connection warnings
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Use experimentalAutoDetectLongPolling for ultra low latency WebSockets streaming,
// with graceful fallback only if streaming is unavailable
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
