# Release Setup

The following GitHub Secrets must be configured in your repository settings (Settings > Secrets and variables > Actions) to enable automated Android App Bundle (AAB) building and deployment.

### Required Secrets

- **`ANDROID_KEYSTORE_BASE64`**: The base64-encoded `.keystore` file.
  - *To generate the keystore*: `keytool -genkey -v -keystore release.keystore -alias your-key-alias -keyalg RSA -keysize 2048 -validity 10000`
  - *To encode (macOS/Linux)*: `base64 -i release.keystore | pbcopy`
  - *To encode (Windows Git Bash)*: `base64 release.keystore > keystore.b64`
- **`KEYSTORE_PASSWORD`**: The password used when generating the keystore.
- **`KEY_ALIAS`**: The alias used when generating the keystore.
- **`KEY_PASSWORD`**: The key password (often the same as `KEYSTORE_PASSWORD`).
- **`NEXT_PUBLIC_API_URL`**: Vercel production URL for API calls.

### Optional Secrets

- **`PLAY_STORE_SERVICE_ACCOUNT_JSON`**: The raw JSON contents of a Google Cloud Service Account key that has permission to publish to the Google Play Developer Console. If present, the workflow will automatically upload the resulting AAB to the **internal** test track.
