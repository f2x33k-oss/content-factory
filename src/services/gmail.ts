import { google } from 'googleapis';
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

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const message = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      options.html
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    logger.info(`Email sent: ${result.data.id}`);
    return result.data;
    
  } catch (error: any) {
    logger.error('Failed to send email:', error);
    throw error;
  }
}

export async function sendAlbumStartedEmail(
  userEmail: string,
  albumTitle: string,
  albumId: string,
  itemCount: number,
  estimatedTime: number
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🎉 Génération démarrée !</h2>
      
      <p>Votre album de recettes est en cours de génération :</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${albumTitle}</h3>
        <p>📊 Nombre de recettes : <strong>${itemCount}</strong></p>
        <p>⏱️ Temps estimé : <strong>~${Math.ceil(estimatedTime / 60)} minutes</strong></p>
        <p>🆔 ID : <code>${albumId}</code></p>
      </div>
      
      <p>Vous recevrez un email avec les fichiers une fois la génération terminée.</p>
      
      <p style="color: #666; font-size: 12px;">
        Note : Assurez-vous d'être connecté au compte Google autorisé pour accéder aux fichiers.
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: `🎉 Génération démarrée : ${albumTitle}`,
    html
  });
}

export async function sendAlbumCompletedEmail(
  userEmail: string,
  albumTitle: string,
  albumId: string,
  textFileUrl: string,
  zipFileUrl: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>🎊 Génération terminée !</h2>
      
      <p>Vos recettes sont prêtes !</p>
      
      <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #2e7d32;">${albumTitle}</h3>
        <p style="margin-bottom: 20px;">📦 2 fichiers disponibles sur Google Drive</p>
        
        <div style="margin: 15px 0;">
          <a href="${textFileUrl}" 
             style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
            📄 Ouvrir le document texte
          </a>
        </div>
        
        <div style="margin: 15px 0;">
          <a href="${zipFileUrl}" 
             style="display: inline-block; background: #34a853; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            🖼️ Télécharger les images (ZIP)
          </a>
        </div>
      </div>
      
      <p style="color: #666; font-size: 12px;">
        <strong>Note :</strong> Assurez-vous d'être connecté au compte Google autorisé pour accéder à ces fichiers.
      </p>
      
      <p style="color: #999; font-size: 11px; margin-top: 30px;">
        Album ID : ${albumId}
      </p>
    </div>
  `;

  await sendEmail({
    to: userEmail,
    subject: `🎊 Génération terminée : ${albumTitle}`,
    html
  });
}
