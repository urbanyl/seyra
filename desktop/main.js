const { app, BrowserWindow, Menu, session, shell } = require('electron');
const crypto = require('crypto');
const config = require('./config.json');

const TARGET = process.env.SEYRA_URL || config.url;
const PIN = (config.fingerprint || '').replace(/:/g, '').toUpperCase();

function sha256OfPem(pem) {
  if (!pem) return '';
  const b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').toUpperCase();
}

// The deployment uses a self-signed certificate: only that exact certificate is trusted.
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  const ok = PIN && (
    sha256OfPem(certificate.data) === PIN ||
    String(certificate.fingerprint || '').replace(/^sha256\//i, '').replace(/:/g, '').toUpperCase() === PIN
  );
  if (ok && url.startsWith(new URL(TARGET).origin)) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#0a0f15',
    title: 'Seyra',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(['media', 'audioCapture', 'videoCapture', 'notifications', 'clipboard-sanitized-write'].includes(permission));
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(TARGET);
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Seyra',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: (i, w) => w?.reload() },
        { label: 'Outils de développement', accelerator: 'F12', click: (i, w) => w?.webContents.toggleDevTools() },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
  ]));
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
