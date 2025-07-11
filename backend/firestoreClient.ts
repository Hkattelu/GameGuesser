import { Firestore } from '@google-cloud/firestore';

/**
* Singleton Firestore client used by the backend.  The connection parameters are
* pulled from environment variables so the deployment environment can supply
* the correct Google Cloud credentials without hard-coding them in the repo.
*
* Required environment variables (all optional for local development):
* - `GCLOUD_PROJECT_ID`   – Google Cloud project that hosts Firestore.
* - `FIRESTORE_KEYFILE`   – Absolute path to a service-account JSON key file.
*
* You may instead rely on the default credentials lookup (e.g. `gcloud auth`
* on your dev machine or Workload Identity on Cloud Run).  Uncomment the
* `credentials` property below if you prefer to inject the private key and
* client email directly via env vars.
*
* Auth setup is intentionally left as *place-holders* so sensitive secrets do
* not live in the public repo.  See CHR-14 for details.
*/

const projectId = process.env.GCLOUD_PROJECT_ID;
const keyFilename = process.env.FIRESTORE_KEYFILE;

export const firestore = new Firestore({
  // `projectId` and `keyFilename` are optional – Firestore will fall back to
  // ADC (Application Default Credentials) if they are not provided.
  ...(projectId ? { projectId } : {}),
  ...(keyFilename ? { keyFilename } : {}),

  // ---------------------------------------------------------------------
  // Service-account JSON creds (alternative to keyFilename)
  // ---------------------------------------------------------------------
  // credentials: {
  //   client_email: process.env.GCLOUD_CLIENT_EMAIL!,
  //   private_key: process.env.GCLOUD_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  // },
});

export default firestore;
