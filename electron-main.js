require('dotenv').config();
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function startServer() {
  serverProcess = spawn(process.execPath, [path.join(__dirname, 'server', 'server.js')], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '3100' }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'public', 'assets', 'icons', 'app-icon-placeholder.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(process.env.APP_URL || `http://localhost:${process.env.PORT || 3100}`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  startServer();
  setTimeout(createWindow, 1000);
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
