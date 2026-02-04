# Gmail + Google Drive Integration Setup

## Overview

The system can automatically:
- Send email when album generation starts
- Upload TXT + ZIP files to Google Drive
- Send email with Drive links when generation completes

This feature is **OPTIONAL**. The system works without it.

---

## Prerequisites

- Google account
- Access to Google Cloud Console
- Gmail account for sending emails

---

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Note the project name/ID

---

## Step 2: Enable APIs

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search and enable:
   - **Gmail API**
   - **Google Drive API**

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application**
4. Name it (e.g., "Content Factory")
5. Add Authorized redirect URI: `https://developers.google.com/oauthplayground`
6. Click **Create**
7. Note your **Client ID** and **Client Secret**

---

## Step 4: Get Refresh Token

1. Go to https://developers.google.com/oauthplayground
2. Click the ⚙️ icon (top right)
3. Check **Use your own OAuth credentials**
4. Enter your **Client ID** and **Client Secret**
5. In the left panel, select:
   - **Gmail API v1** > `https://www.googleapis.com/auth/gmail.send`
   - **Drive API v3** > `https://www.googleapis.com/auth/drive.file`
6. Click **Authorize APIs**
7. Log in with your Gmail account
8. Click **Exchange authorization code for tokens**
9. Copy the **Refresh token**

---

## Step 5: Create Google Drive Folder

1. Go to https://drive.google.com
2. Create a new folder (e.g., "Content Factory Albums")
3. Open the folder
4. Copy the folder ID from the URL:
   ```
   https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j
                                           ^^^^^^^^^^^^^^^^^^^^^^
                                           This is the folder ID
   ```

---

## Step 6: Update .env File

Add these variables to your `.env` file:

```env
# Gmail API
GMAIL_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REFRESH_TOKEN=your_refresh_token_here
GMAIL_FROM_EMAIL=your_email@gmail.com

# Google Drive API
GOOGLE_DRIVE_FOLDER_ID=1a2b3c4d5e6f7g8h9i0j
```

---

## Step 7: Restart Services

```bash
# Stop API and Worker (Ctrl+C in terminals)

# Restart API
npm run dev

# Restart Worker
npm run worker:dev
```

---

## Testing

1. Create a new album in the frontend
2. Check your email for "Génération démarrée" notification
3. Wait for album to complete
4. Check your email for "Génération terminée" with Drive links
5. Click links to access TXT and ZIP files on Google Drive

---

## Troubleshooting

### "Failed to send email" error

- Check Gmail credentials are correct
- Verify Gmail API is enabled
- Try generating new refresh token

### "Failed to upload to Drive" error

- Check Drive API is enabled
- Verify folder ID is correct
- Check folder permissions (your account must have access)
- Verify refresh token has Drive scope

### No emails received

- Check spam folder
- Verify GMAIL_FROM_EMAIL is correct
- Check worker logs for errors

---

## Disabling Email/Drive

To disable this feature:
1. Remove Gmail/Drive variables from `.env`
2. Or leave them empty
3. Worker will skip email/upload steps automatically

The system will continue to work normally with manual downloads.
