
import google from 'googleapis'


function authFromEnv() {
  const b64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64;
  if (!b64) throw new Error('Falta GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64');
  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  return new google.auth.GoogleAuth({
    credentials: json,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

export async function guardarLeadEnSheets({ nombre, telefono }) {
  try {
    const auth = authFromEnv();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || 'Hoja 1!A:C';

    const values = [[nombre, telefono, new Date().toLocaleDateString('es-AR')]];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    console.log('✅ Lead guardado en Google Sheets');
  } catch (err) {
    console.error('💥 Error guardando lead en Google Sheets:', err.message);
  }
}



