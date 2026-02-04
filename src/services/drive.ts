import { google } from 'googleapis';
import fs from 'fs';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

const oauth2Client = new google.auth.OAuth2(
  config.gmailClientId,
  config.gmailClientSecret,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: config.gmailRefreshToken
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export async function uploadFileToDrive(
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    const fileMetadata = {
      name: fileName,
      parents: [config.googleDriveFolderId]
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    // Make file publicly accessible
    await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    logger.info(`File uploaded to Drive: ${file.data.id}`);
    
    return file.data.webViewLink || '';
    
  } catch (error: any) {
    logger.error('Failed to upload to Drive:', error);
    throw error;
  }
}

export async function uploadAlbumFiles(
  textFilePath: string,
  zipFilePath: string,
  albumTitle: string
): Promise<{ textUrl: string; zipUrl: string }> {
  const textUrl = await uploadFileToDrive(
    textFilePath,
    `${albumTitle}.txt`,
    'text/plain'
  );

  const zipUrl = await uploadFileToDrive(
    zipFilePath,
    `${albumTitle}.zip`,
    'application/zip'
  );

  return { textUrl, zipUrl };
}
