const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const isDev = !app.isPackaged;

function runSavedBackendCode() {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'generated_code', 'backend.js');
  if (fs.existsSync(filePath)) {
    try {
      const code = fs.readFileSync(filePath, 'utf-8');
      // eslint-disable-next-line no-eval
      eval(code);
      console.log('Persistent backend code executed');
    } catch (err) {
      console.error('Error executing persistent backend code:', err);
    }
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools(); // Disabled as per user request
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  runSavedBackendCode();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

let detachedWindow = null;

function createDetachedWindow() {
  if (detachedWindow) {
    detachedWindow.focus();
    return;
  }

  detachedWindow = new BrowserWindow({
    width: 600,
    height: 800,
    title: 'Backend Codegen',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    detachedWindow.loadURL('http://localhost:5173#/detached');
  } else {
    detachedWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'detached' });
  }

  detachedWindow.on('closed', () => {
    detachedWindow = null;
  });
}

ipcMain.on('open-detached-backend', () => {
  createDetachedWindow();
});

// Code execution handlers
ipcMain.handle('save-code', async (event, { type, code }) => {
  const userDataPath = app.getPath('userData');
  const codeDir = path.join(userDataPath, 'generated_code');
  if (!fs.existsSync(codeDir)) {
    fs.mkdirSync(codeDir, { recursive: true });
  }

  const fileName = type === 'frontend' ? 'renderer.js' : 'backend.js';
  const filePath = path.join(codeDir, fileName);
  fs.writeFileSync(filePath, code);
  return { success: true, path: filePath };
});

ipcMain.handle('get-saved-code', async (event, type) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'generated_code', type === 'frontend' ? 'renderer.js' : 'backend.js');
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return null;
});

ipcMain.on('run-backend-code', async (event) => {
  const userDataPath = app.getPath('userData');
  const filePath = path.join(userDataPath, 'generated_code', 'backend.js');
  if (fs.existsSync(filePath)) {
    try {
      // Basic execution in main process
      // In a real app, you might want to run this in a worker thread or a utility process
      const code = fs.readFileSync(filePath, 'utf-8');
      // eslint-disable-next-line no-eval
      eval(code);
      console.log('Backend code executed');
    } catch (err) {
      console.error('Error executing backend code:', err);
    }
  }
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  BrowserWindow.getFocusedWindow()?.minimize();
});

ipcMain.on('window-maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window-close', () => {
  BrowserWindow.getFocusedWindow()?.close();
});

ipcMain.handle('get-generated-files', async () => {
  const userDataPath = app.getPath('userData');
  const codeDir = path.join(userDataPath, 'generated_code');
  if (!fs.existsSync(codeDir)) return [];

  const files = fs.readdirSync(codeDir);
  return files.map(file => ({
    name: file,
    type: file === 'renderer.js' ? 'frontend' : 'backend'
  }));
});

ipcMain.handle('reset-app', async () => {
  const userDataPath = app.getPath('userData');
  const codeDir = path.join(userDataPath, 'generated_code');
  if (fs.existsSync(codeDir)) {
    fs.rmSync(codeDir, { recursive: true, force: true });
  }
  return { success: true };
});

ipcMain.handle('build-dmg', async () => {
  return new Promise((resolve, reject) => {
    const projectRoot = path.join(__dirname, '../../');
    exec('npm run dist', { cwd: projectRoot }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Build error: ${error}`);
        reject(error.message);
        return;
      }
      resolve(stdout);
    });
  });
});
