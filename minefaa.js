const { app, BrowserWindow, ipcMain } = require('electron')
require('electron-reload')(__dirname)
const fs = require('fs');
const path = require('path');
const unidecode = require('unidecode');

const { fork } = require('child_process');
const child = fork('create_bot.js');

let ClickTextDetect = false;
let textFromFile = '';
const filePath = path.join(__dirname, '/config/ClickText.txt');
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
