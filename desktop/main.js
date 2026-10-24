const { app, BrowserWindow, Menu, session, shell, dialog } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const config = require('./config.json');
const TARGET = process.env.SEYRA_URL || config.url || 'https://seyra.website/';
const PIN = (config.fingerprint || '').replace(/:/g, '').toUpperCase();
const ORIGIN = new URL(TARGET).origin;

function sha256OfPem(pem) {
  if (!pem) return '';
  const b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return crypto.createHash('sha256').update(Buffer.from(b64, 'base64')).digest('hex').toUpperCase();
}

// Le certificat n'est épinglé que si un fingerprint est fourni dans config.json.
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (!PIN) return callback(false);
  const ok =
    sha256OfPem(certificate.data) === PIN ||
    String(certificate.fingerprint || '').replace(/^sha256\//i, '').replace(/:/g, '').toUpperCase() === PIN;
  if (ok && url.startsWith(ORIGIN)) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

function windowState() {
  try {
    const raw = fs.readFileSync(path.join(app.getPath('userData'), 'window.json'), 'utf8');
    const s = JSON.parse(raw);
    if (s && s.width > 300 && s.height > 300) return s;
  } catch {}
  return { width: 1280, height: 840 };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(
      path.join(app.getPath('userData'), 'window.json'),
      JSON.stringify({ width: b.width, height: b.height, maximized: win.isMaximized() })
    );
  } catch {}
}

function createWindow() {
  const state = windowState();
  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    minWidth: 360,
    minHeight: 520,
    backgroundColor: '#1c232a',
    title: 'Seyra',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      backgroundThrottling: false,
    },
  });

  if (state.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());

  const allowed = new Set([
    'media', 'audioCapture', 'videoCapture', 'display-capture',
    'notifications', 'clipboard-read', 'clipboard-sanitized-write',
    'fullscreen', 'pointerLock',
  ]);
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    callback(allowed.has(permission));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => allowed.has(permission));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ORIGIN)) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.on('close', () => saveWindowState(win));

  win.loadURL(TARGET);
  return win;
}

app.setAppUserModelId('com.seyra.chat');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // Enregistré après « ready » : session n'existe pas avant.
    session.defaultSession.on('will-download', (event, item) => {
      const dir = app.getPath('downloads');
      item.setSavePath(path.join(dir, item.getFilename()));
    });

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {
        label: 'Fichier',
        submenu: [
          { label: 'Nouvelle fenêtre', accelerator: 'CmdOrCtrl+N', click: () => createWindow() },
          { type: 'separator' },
          { role: 'quit', label: 'Quitter' },
        ],
      },
      {
        label: 'Édition',
        submenu: [
          { role: 'undo', label: 'Annuler' },
          { role: 'redo', label: 'Rétablir' },
          { type: 'separator' },
          { role: 'cut', label: 'Couper' },
          { role: 'copy', label: 'Copier' },
          { role: 'paste', label: 'Coller' },
          { role: 'selectAll', label: 'Tout sélectionner' },
        ],
      },
      {
        label: 'Affichage',
        submenu: [
          { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: (i, w) => w?.reload() },
          { role: 'resetZoom', label: 'Taille normale' },
          { role: 'zoomIn', label: 'Agrandir' },
          { role: 'zoomOut', label: 'Réduire' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Plein écran' },
          { label: 'Outils de développement', accelerator: 'F12', click: (i, w) => w?.webContents.toggleDevTools() },
        ],
      },
      {
        label: 'Aide',
        submenu: [
          { label: 'Ouvrir seyra.website', click: () => shell.openExternal(ORIGIN) },
          {
            label: 'À propos',
            click: () => dialog.showMessageBox({
              type: 'info',
              title: 'Seyra',
              message: 'Seyra — sessions privées, éphémères et chiffrées.',
              detail: `Version ${app.getVersion()}\n${ORIGIN}`,
            }),
          },
        ],
      },
    ]));

    createWindow();

    if (app.isPackaged) {
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on('error', () => {});
      setTimeout(() => { autoUpdater.checkForUpdates().catch(() => {}); }, 8000);
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
