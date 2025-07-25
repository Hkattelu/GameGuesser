import admin from 'firebase-admin';

import serviceAccount from './firebase-admin-keys.json' with {type: 'json'};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

export default admin;
