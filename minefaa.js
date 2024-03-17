const { app, BrowserWindow, ipcMain } = require('electron')
require('electron-reload')(__dirname)
const fs = require('fs');
const path = require('path');
const unidecode = require('unidecode');

const { fork } = require('child_process');
const child = fork('create_bot.js');

let janelasCaptcha = {};

let ClickTextDetect = false;
let textFromFile = '';
const filePath = path.join(__dirname, '/config/ClickText.txt');


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
      textFromFile = data.split('text="')[1].split('"')[0];

      if (textFromFile != "") {
        // Remove acentos do texto
        let textWithoutAccents = unidecode(textFromFile);

        console.log("Texto Extraido: " + textWithoutAccents);
        console.log("Caso tenha acentos o codigo ira remover os acentos para nao causar erros!")
        ClickTextDetect = true;

        // Envia as variáveis para o processo filho
        child.send({ event: 'ClickText', data: { ClickTextDetect, textFromFile: textWithoutAccents } });
      }
      else {
        console.log("Texto vazio");
      }
    }
  });
}

function createWindow(data) {
  const win = new BrowserWindow(data.options);
  win.loadFile(data.file);
  win.setMenu(null);

  win.on('close', data.onClose);
  win.webContents.on('did-finish-load', () => {
    win.webContents.send(data.event, data.message);
  });

  return win;
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
    icon: __dirname + '/assets/icone.png',
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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('form-data-changed', (event, data) => {
  child.send({ event: 'form-data-changed-reconnect', data });
});

ipcMain.on('log', (event, message) => {
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
  if (message.type === 'ipcMain') {
    ipcMain.emit(message.event, null, message.data);
  }
  if (message.type === 'electron' && message.action === 'createCaptchaWindow') {
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

    janelasCaptcha[botusername].loadFile(`${__dirname}/assets/captcha.html`)
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
  if (message.type === 'electron' && message.action === 'createWebInventoryWindow') {
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
  if (message.type === 'bot-end') {
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
  if (message.type === 'closewindowcaptcha') {
    const username = message.username;

    if (janelasCaptcha[username]) {
      janelasCaptcha[username].close();
      janelasCaptcha[username] = null;
    }
  }
  if (message.type === 'closewindowinventory') {
    if (isInvWindowOpened()) {
      inventoryWindow.loadURL('about:blank');
      inventoryWindow.close();
      inventoryWindow = null;
    }
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
  console.log(data.botUsername)
  child.send({ event: 'reco-bot', data });
});
