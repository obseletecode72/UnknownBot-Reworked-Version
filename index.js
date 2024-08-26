const { app, BrowserWindow, ipcMain } = require('electron')
require('electron-reload')(__dirname)
const fs = require('fs');
const path = require('path');
const unidecode = require('unidecode');

const childProcess = require('child_process');
let child = childProcess.fork(path.join(__dirname, 'create_bot.js'));

function createLogWindow() {
  logWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    resizable: true,
    autoHideMenuBar: true,
    icon: __dirname + '/assetsUBBOT/icone.png',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  logWindow.loadFile('logs.html')
  logWindow.setMenu(null) // Oculta o menu padrão
}

function redirectConsoleToLogWindow() {
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    originalConsoleLog(...args);
    if (logWindow) {
      logWindow.webContents.send('log', args.join(' '));
    }
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    if (logWindow) {
      logWindow.webContents.send('log', `[ERROR] ${args.join(' ')}`);
    }
  };
}

let janelasCaptcha = {};

let ClickTextDetectFromVar = false;
let textFromFileFromVar = '';
const filePath = path.join(__dirname, '/configUBBOT/ClickText.txt');

let inventoryWindow = null;
const isInvWindowOpened = () => !inventoryWindow?.isDestroyed() && inventoryWindow?.isFocusable();

if (fs.existsSync(filePath)) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Erro ao ler o arquivo: ${err}`);
      return;
    }

    // Verifica se a string 'text="' existe no arquivo
    if (data.includes('text="')) {
      // Extrai a mensagem após text=
      textFromFileFromVar = data.split('text="')[1].split('"')[0];

      if (textFromFileFromVar != "") {
        // Remove acentos do texto
        let textWithoutAccents = unidecode(textFromFileFromVar);

        console.log("Texto Extraido: " + textWithoutAccents);
        console.log("Caso tenha acentos o codigo ira remover os acentos para nao causar erros!")
        ClickTextDetectFromVar = true;

        // Envia as variáveis para o processo filho
        child.send({ event: 'ClickText', data: { ClickTextDetectFromVar, textFromFileFromVar: textWithoutAccents } });
      }
      else {
        console.log("Texto vazio");
      }
    }
  });
}

global.mainWindow;

function createWindow() {
  global.mainWindow = new BrowserWindow({
    width: 1400,
    height: 600,
    show: true,
    resizable: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    icon: __dirname + '/assetsUBBOT/icone.png',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  global.mainWindow.loadFile('index.html')
  global.mainWindow.setMenu(null) // Oculta o menu padrão
}

app.whenReady().then(() => {
  createWindow()

  createLogWindow();
  redirectConsoleToLogWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0)
      {
        createLogWindow();
        redirectConsoleToLogWindow();
        createWindow();
      }

  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('form-data-changed-fallcheck', (event, data) => {
  child.send({ event: 'form-data-changed-fallcheck', data });
});

ipcMain.on('form-data-changed-reconnect', (event, data) => {
  child.send({ event: 'form-data-changed-reconnect', data });
});

ipcMain.on('log', (event, message) => { // isso e outra coisa, nao tem nada haver com o logs que estamos falando
  console.log(message);
});

ipcMain.on('send-message-all', (event, message) => {
  global.mainWindow.webContents.send('bot-message-all', message)
});

ipcMain.on('connect-bot', async (event, data) => {
  child.send({ event: 'connect-bot', data });
})

child.on('message', (message) => {
  if (message.type === 'webcontents') {
    global.mainWindow.webContents.send(message.event, message.data);
  }
  else if (message.type === 'ipcMain') {
    ipcMain.emit(message.event, null, message.data);
  }
  else if (message.type === 'electron' && message.action === 'createCaptchaWindow') {
    const { botusername, captchaImage } = message.data;

    // Se a janela já existir para este bot, feche-a antes de criar uma nova
    if (janelasCaptcha[botusername]) {
      janelasCaptcha[botusername].close();
      janelasCaptcha[botusername] = null;
    }

    janelasCaptcha[botusername] = new BrowserWindow({
      width: 300,
      height: 300,
      show: true,
      resizable: false,
      autoHideMenuBar: true,
      titleBarStyle: 'hidden',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })

    janelasCaptcha[botusername].loadFile(`${__dirname}/assetsUBBOT/captcha.html`)
    janelasCaptcha[botusername].setMenu(null) // Oculta o menu padrão

    /*janelasCaptcha[botusername].on('close', () => {
      if (!janelasCaptcha[botusername]) {
        delete captchaImages[botusername];
      }
    });*/

    janelasCaptcha[botusername].webContents.on('did-finish-load', () => {
      janelasCaptcha[botusername].webContents.send('bot-janela-1', botusername, captchaImage);
    })
  }
  else  if (message.type === 'electron' && message.action === 'createWebInventoryWindow') {
    const botusername = message.data.bot;
    inventoryWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
      },
      frame: false
    })

    inventoryWindow.loadURL('http://localhost:9531')
    inventoryWindow.setMenu(null)

    inventoryWindow.on('closed', async () => {
      global.mainWindow.webContents.send('bot-message', { bot: botusername, message: "<br/><span style='color:red'>Interface fechada!</span><br><br/>" });
    });
  }
  else if (message.type === 'bot-end') {
    const username = message.username;

    if (janelasCaptcha[username]) {
      janelasCaptcha[username].close();
      janelasCaptcha[username] = null;
    }

    if (isInvWindowOpened()) {
      inventoryWindow.loadURL('about:blank');
      inventoryWindow.close();
      inventoryWindow = null;
    }
  }
  else if (message.type === 'closewindowcaptcha') {
    const username = message.username;

    if (janelasCaptcha[username]) {
      janelasCaptcha[username].close();
      janelasCaptcha[username] = null;
    }
  }
  else if (message.type === 'closewindowinventory') {
    if (isInvWindowOpened()) {
      inventoryWindow.loadURL('about:blank');
      inventoryWindow.close();
      inventoryWindow = null;
    }
  }
  else if (message.type === 'log') {
    console.log(`[BOT_INT] ${message.data}`);
  } 
  else if (message.type === 'error') {
    console.error(`[BOT_INT_ERR] ${message.data}`);
  }
});

ipcMain.on('captcha-input-janela1', (event, data) => {
  child.send({ event: 'captcha-input-janela1', data });
});

ipcMain.on('send-message', async (event, data) => {
  child.send({ event: 'send-message', data });
});

ipcMain.on('remove-bot', async (event, botUsername) => {
  child.send({ event: 'remove-bot', data: botUsername });
});

ipcMain.on('reco-bot', async (event, data) => {
  child.send({ event: 'reco-bot', data });
});

ipcMain.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});