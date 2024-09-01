const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const childProcess = require('child_process');

let child = childProcess.fork(path.join(__dirname, 'create_bot.js'));
let logWindow = null;
let inventoryWindow = null;
const janelasCaptcha = {};

process.on('uncaughtException', (err) => {
  process.send({ type: 'error', data: `Exceção não tratada capturada: ${err.message}` });
  process.send({ type: 'error', data: `Stack: ${err.stack}` });
});

function createLogWindow() {
  logWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '/assetsUBBOT/icone.png'),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  logWindow.loadFile('logs.html');
  logWindow.setMenu(null);
}

function redirectConsoleToLogWindow() {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog(...args);
    if (logWindow) logWindow.webContents.send('log', args.join(' '));
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (logWindow) logWindow.webContents.send('log', `[ERROR] ${args.join(' ')}`);
  };
}

function createWindow() {
  global.mainWindow = new BrowserWindow({
    width: 1400,
    height: 600,
    show: true,
    resizable: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '/assetsUBBOT/icone.png'),
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  global.mainWindow.loadFile('index.html');
  global.mainWindow.setMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  createLogWindow();
  redirectConsoleToLogWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createLogWindow();
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('form-data-changed-fallcheck', (event, data) => child.send({ event: 'form-data-changed-fallcheck', data }));
ipcMain.on('form-data-changed-reconnect', (event, data) => child.send({ event: 'form-data-changed-reconnect', data }));
ipcMain.on('log', (event, message) => console.log(message));
ipcMain.on('send-message-all', (event, message) => global.mainWindow.webContents.send('bot-message-all', message));
ipcMain.on('send-message-for-all-threads', (event, message) => child.send({ event: 'send-message-for-all-threads', message }));
ipcMain.on('connect-bot', (event, data) => child.send({ event: 'connect-bot', data }));
ipcMain.on('captcha-input-janela1', (event, data) => child.send({ event: 'captcha-input-janela1', data }));
ipcMain.on('send-message', (event, data) => child.send({ event: 'send-message', data }));
ipcMain.on('remove-bot', (event, botUsername) => child.send({ event: 'remove-bot', data: botUsername }));
ipcMain.on('reco-bot', (event, data) => {
  console.log(data);
  child.send({ event: 'reco-bot', data });
});

child.on('message', (message) => {
  if (message.type === 'webcontents') {
    global.mainWindow.webContents.send(message.event, message.data);
  } else if (message.type === 'ipcMain') {
    ipcMain.emit(message.event, null, message.data);
  } else if (message.type === 'electron') {
    if (message.action === 'createCaptchaWindow') {
      const { botusername, captchaImage } = message.data;
      if (janelasCaptcha[botusername]) {
        janelasCaptcha[botusername].close();
        delete janelasCaptcha[botusername];
      }
      janelasCaptcha[botusername] = new BrowserWindow({
        width: 300,
        height: 300,
        show: true,
        resizable: false,
        autoHideMenuBar: true,
        titleBarStyle: 'hidden',
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      });
      janelasCaptcha[botusername].loadFile(path.join(__dirname, '/assetsUBBOT/captcha.html'));
      janelasCaptcha[botusername].setMenu(null);
      janelasCaptcha[botusername].webContents.on('did-finish-load', () => {
        janelasCaptcha[botusername].webContents.send('bot-janela-1', botusername, captchaImage);
      });
    } else if (message.action === 'createWebInventoryWindow') {
      const botusername = message.data.bot;
      inventoryWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: { nodeIntegration: true },
        frame: false
      });
      inventoryWindow.loadURL('http://localhost:9531');
      inventoryWindow.setMenu(null);
      inventoryWindow.on('closed', () => {
        global.mainWindow.webContents.send('bot-message', { bot: botusername, message: "<br/><span style='color:red'>Interface fechada!</span><br><br/>" });
      });
    } else if (message.action === 'bot-end') {
      const username = message.username;
      if (janelasCaptcha[username]) {
        janelasCaptcha[username].close();
        delete janelasCaptcha[username];
      }
      if (inventoryWindow && !inventoryWindow.isDestroyed()) {
        inventoryWindow.loadURL('about:blank');
        inventoryWindow.close();
        inventoryWindow = null;
      }
    } else if (message.action === 'closewindowcaptcha') {
      const username = message.username;
      if (janelasCaptcha[username]) {
        janelasCaptcha[username].close();
        delete janelasCaptcha[username];
      }
    } else if (message.action === 'closewindowinventory') {
      if (inventoryWindow && !inventoryWindow.isDestroyed()) {
        inventoryWindow.loadURL('about:blank');
        inventoryWindow.close();
        inventoryWindow = null;
      }
    } else if (message.action === 'log') {
      console.log(`[BOT_INT] ${message.data}`);
    } else if (message.action === 'error') {
      console.error(`[BOT_INT_ERR] ${message.data}`);
    }
  }
});

ipcMain.on('close', (code) => console.log(`Child process exited with code ${code}`));
