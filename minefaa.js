const dns = require('dns');
const util = require('util');
const { app, BrowserWindow, ipcMain } = require('electron')
const mineflayer = require('mineflayer')
const mc = require('minecraft-protocol')
const Http = require('http')
const ProxyAgent = require('proxy-agent')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
var Vec3 = require('vec3');
const atob = require('atob');
var Socks = require('socks').SocksClient;
const inventoryViewer = require('mineflayer-web-inventory')
const PNGImage = require('pngjs-image');
require('electron-reload')(__dirname)
const fs = require('fs');
const path = require('path');
const unidecode = require('unidecode');

// killaura part
var killAuraActive = {}
let attackInterval = {};
let killAuraDelay = 1;
let DistanceReach = 3;
// killaura part

// pesca part
var PescaActive = {};
// pesca part

// goto part
let isMoving = {};
// goto part

// sneak part
var IsSneaking = {};
// sneak part

// follow part
var isFollowing = {};
var playerToFollow = {};
var followInterval = {};
// follow part

let swingInterval = {};
var miningState = {}; // Adiciona um estado de mineração

global.listadecommandos = ["$killaura", "$pesca", "$goto ", "$shift", "$move ", "$holditem", "$killaura.timems=", "$sethotbarslot ", "$listslots", "$setinventoryslot ", "$dropall", "$inventoryinterface", "$killaura.distance=", "$follow ", "$miner ", "$miner2 ", "$clickentity"]
global.Syntax = `
<span style="color:yellow">Lista de comandos existentes:</span><br/>
<span style="color:white">- KillAura, Ataca todas entidades ao redor:</span> <span style="color:orange">$killaura</span><br/>
<span style="color:white">- Follow, Segue algum jogador pelo nome:</span> <span style="color:orange">$follow [nome]</span><br/>
<span style="color:white">- Miner, Minera blocos pelo nome do bloco:</span> <span style="color:orange">$miner [bloco]</span><br/>
<span style="color:white">- Miner2, Minera blocos de coordenada tal ate coordenada tal:</span> <span style="color:orange">$miner2 [x] [y] [z] [x2] [y2] [z2]</span><br/>
<span style="color:white">- Pesca, Pesca automaticamente:</span> <span style="color:orange">$pesca</span><br/>
<span style="color:white">- Goto, Anda ate as coordenadas fornecidas:</span> <span style="color:orange">$goto [x] [y] [z]</span><br/>
<span style="color:white">- Shift, Fica agachado:</span> <span style="color:orange">$shift</span><br/>
<span style="color:white">- SetHotBarSlot, Seta o slot da sua hotbar para o fornecido (0-8):</span> <span style="color:orange">$sethotbarslot [numero]</span><br/>
<span style="color:white">- SetInventorySlot, Seta o slot da janela aberta para o fornecido:</span> <span style="color:orange">$setinventoryslot [numero] [drop]</span><br/>
<span style="color:white">- ListSlots, Mostra a quantidade de slots total da janela aberta:</span> <span style="color:orange">$listslots</span><br/>
<span style="color:white">- DropAll, Dropa todos itens do inventario:</span> <span style="color:orange">$dropall</span><br/>
<span style="color:white">- InventoryInterface, Mostra seu inventario em outra janela:</span> <span style="color:orange">$inventoryinterface</span><br/>
<span style="color:white">- HoldItem, Clica o botao esquerdo e solta com o item que esta na mao:</span> <span style="color:orange">$holditem</span><br/>
<span style="color:white">- ClickEntity, Clica o botao direito e solta com na entidade mais proxima:</span> <span style="color:orange">$clickentity</span><br/>
<span style="color:white">- Move, Faz o bot se mover por um tempo determinado. (As direções podem ser combinadas com o caractere "|":</span> <span style="color:orange">$move [direções jump,forward,back,left,right,sneak,sprint] [duração em ticks]
</span><br/>
`

let ClickTextDetect = false;
let textFromFile = '';
const filePath = path.join(__dirname, 'ClickText.txt');
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
      }
      else {
        console.log("Texto vazio");
      }
    }
  });
}

function processClickEvent(bot, message) {
  // Verifica se message.json e message.json.extra existem e são do tipo correto
  if (message && message.json && Array.isArray(message.json.extra)) {
    // Verifica as mensagens que estão vindo de acordo com o evento message
    message.json.extra.forEach((extra) => {
      if (extra && extra.clickEvent) {
        // Se o text="" for o mesmo da que tiver o clickevent, rodar o comando que foi extraido dela
        if (unidecode(extra.text) === unidecode(textFromFile)) {
          bot.chat(extra.clickEvent.value);
          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Mensagem clicada!</span><br/>" })
        }
      }
    });
  }
}

let janelasCaptcha = {};
let captchaImages = {};

function CreateCaptchaWindow(botusername) {
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

  janelasCaptcha[botusername].on('close', () => {
    if (!janelasCaptcha[botusername]) {
      delete captchaImages[botusername];
    }
  });

  janelasCaptcha[botusername].webContents.on('did-finish-load', () => {
    janelasCaptcha[botusername].webContents.send('bot-janela-1', botusername, captchaImages[botusername]);
  })
}

function getColor(colorId) {
  const colors = [
    { red: 0, green: 0, blue: 0, alpha: 255 },
    { red: 89, green: 125, blue: 39, alpha: 255 },
    { red: 109, green: 153, blue: 48, alpha: 255 },
    { red: 127, green: 178, blue: 56, alpha: 255 },
    { red: 67, green: 94, blue: 29, alpha: 255 },
    { red: 174, green: 164, blue: 115, alpha: 255 },
    { red: 213, green: 201, blue: 140, alpha: 255 },
    { red: 247, green: 233, blue: 163, alpha: 255 },
    { red: 130, green: 123, blue: 86, alpha: 255 },
    { red: 140, green: 140, blue: 140, alpha: 255 },
    { red: 171, green: 171, blue: 171, alpha: 255 },
    { red: 199, green: 199, blue: 199, alpha: 255 },
    { red: 105, green: 105, blue: 105, alpha: 255 },
    { red: 180, green: 0, blue: 0, alpha: 255 },
    { red: 220, green: 0, blue: 0, alpha: 255 },
    { red: 255, green: 0, blue: 0, alpha: 255 },
    { red: 135, green: 0, blue: 0, alpha: 255 },
    { red: 112, green: 112, blue: 180, alpha: 255 },
    { red: 138, green: 138, blue: 220, alpha: 255 },
    { red: 160, green: 160, blue: 255, alpha: 255 },
    { red: 84, green: 84, blue: 135, alpha: 255 },
    { red: 117, green: 117, blue: 117, alpha: 255 },
    { red: 144, green: 144, blue: 144, alpha: 255 },
    { red: 167, green: 167, blue: 167, alpha: 255 },
    { red: 88, green: 88, blue: 88, alpha: 255 },
    { red: 0, green: 87, blue: 0, alpha: 255 },
    { red: 0, green: 106, blue: 0, alpha: 255 },
    { red: 0, green: 124, blue: 0, alpha: 255 },
    { red: 0, green: 65, blue: 0, alpha: 255 },
    { red: 180, green: 180, blue: 180, alpha: 255 },
    { red: 220, green: 220, blue: 220, alpha: 255 },
    { red: 255, green: 255, blue: 255, alpha: 255 },
    { red: 135, green: 135, blue: 135, alpha: 255 },
    { red: 115, green: 118, blue: 129, alpha: 255 },
    { red: 141, green: 144, blue: 158, alpha: 255 },
    { red: 164, green: 168, blue: 184, alpha: 255 },
    { red: 86, green: 88, blue: 97, alpha: 255 },
    { red: 106, green: 76, blue: 54, alpha: 255 },
    { red: 130, green: 94, blue: 66, alpha: 255 },
    { red: 151, green: 109, blue: 77, alpha: 255 },
    { red: 79, green: 57, blue: 40, alpha: 255 },
    { red: 79, green: 79, blue: 79, alpha: 255 },
    { red: 96, green: 96, blue: 96, alpha: 255 },
    { red: 112, green: 112, blue: 112, alpha: 255 },
    { red: 59, green: 59, blue: 59, alpha: 255 },
    { red: 45, green: 45, blue: 180, alpha: 255 },
    { red: 55, green: 55, blue: 220, alpha: 255 },
    { red: 64, green: 64, blue: 255, alpha: 255 },
    { red: 33, green: 33, blue: 135, alpha: 255 },
    { red: 100, green: 84, blue: 50, alpha: 255 },
    { red: 123, green: 102, blue: 62, alpha: 255 },
    { red: 143, green: 119, blue: 72, alpha: 255 },
    { red: 75, green: 63, blue: 38, alpha: 255 },
    { red: 180, green: 177, blue: 172, alpha: 255 },
    { red: 220, green: 217, blue: 211, alpha: 255 },
    { red: 255, green: 252, blue: 245, alpha: 255 },
    { red: 135, green: 133, blue: 129, alpha: 255 },
    { red: 152, green: 89, blue: 36, alpha: 255 },
    { red: 186, green: 109, blue: 44, alpha: 255 },
    { red: 216, green: 127, blue: 51, alpha: 255 },
    { red: 114, green: 67, blue: 27, alpha: 255 },
    { red: 125, green: 53, blue: 152, alpha: 255 },
    { red: 153, green: 65, blue: 186, alpha: 255 },
    { red: 178, green: 76, blue: 216, alpha: 255 },
    { red: 94, green: 40, blue: 114, alpha: 255 },
    { red: 72, green: 108, blue: 152, alpha: 255 },
    { red: 88, green: 132, blue: 186, alpha: 255 },
    { red: 102, green: 153, blue: 216, alpha: 255 },
    { red: 54, green: 81, blue: 114, alpha: 255 },
    { red: 161, green: 161, blue: 36, alpha: 255 },
    { red: 197, green: 197, blue: 44, alpha: 255 },
    { red: 229, green: 229, blue: 51, alpha: 255 },
    { red: 121, green: 121, blue: 27, alpha: 255 },
    { red: 89, green: 144, blue: 17, alpha: 255 },
    { red: 109, green: 176, blue: 21, alpha: 255 },
    { red: 127, green: 204, blue: 25, alpha: 255 },
    { red: 67, green: 108, blue: 13, alpha: 255 },
    { red: 170, green: 89, blue: 116, alpha: 255 },
    { red: 208, green: 109, blue: 142, alpha: 255 },
    { red: 242, green: 127, blue: 165, alpha: 255 },
    { red: 128, green: 67, blue: 87, alpha: 255 },
    { red: 53, green: 53, blue: 53, alpha: 255 },
    { red: 65, green: 65, blue: 65, alpha: 255 },
    { red: 76, green: 76, blue: 76, alpha: 255 },
    { red: 40, green: 40, blue: 40, alpha: 255 },
    { red: 108, green: 108, blue: 108, alpha: 255 },
    { red: 132, green: 132, blue: 132, alpha: 255 },
    { red: 153, green: 153, blue: 153, alpha: 255 },
    { red: 81, green: 81, blue: 81, alpha: 255 },
    { red: 53, green: 89, blue: 108, alpha: 255 },
    { red: 65, green: 109, blue: 132, alpha: 255 },
    { red: 76, green: 127, blue: 153, alpha: 255 },
    { red: 40, green: 67, blue: 81, alpha: 255 },
    { red: 89, green: 44, blue: 125, alpha: 255 },
    { red: 109, green: 54, blue: 153, alpha: 255 },
    { red: 127, green: 63, blue: 178, alpha: 255 },
    { red: 67, green: 33, blue: 94, alpha: 255 },
    { red: 36, green: 53, blue: 125, alpha: 255 },
    { red: 44, green: 65, blue: 153, alpha: 255 },
    { red: 51, green: 76, blue: 178, alpha: 255 },
    { red: 27, green: 40, blue: 94, alpha: 255 },
    { red: 72, green: 53, blue: 36, alpha: 255 },
    { red: 88, green: 65, blue: 44, alpha: 255 },
    { red: 102, green: 76, blue: 51, alpha: 255 },
    { red: 54, green: 40, blue: 27, alpha: 255 },
    { red: 72, green: 89, blue: 36, alpha: 255 },
    { red: 88, green: 109, blue: 44, alpha: 255 },
    { red: 102, green: 127, blue: 51, alpha: 255 },
    { red: 54, green: 67, blue: 27, alpha: 255 },
    { red: 108, green: 36, blue: 36, alpha: 255 },
    { red: 132, green: 44, blue: 44, alpha: 255 },
    { red: 153, green: 51, blue: 51, alpha: 255 },
    { red: 81, green: 27, blue: 27, alpha: 255 },
    { red: 17, green: 17, blue: 17, alpha: 255 },
    { red: 21, green: 21, blue: 21, alpha: 255 },
    { red: 25, green: 25, blue: 25, alpha: 255 },
    { red: 13, green: 13, blue: 13, alpha: 255 },
    { red: 176, green: 168, blue: 54, alpha: 255 },
    { red: 215, green: 205, blue: 66, alpha: 255 },
    { red: 250, green: 238, blue: 77, alpha: 255 },
    { red: 132, green: 126, blue: 40, alpha: 255 },
    { red: 64, green: 154, blue: 150, alpha: 255 },
    { red: 79, green: 188, blue: 183, alpha: 255 },
    { red: 92, green: 219, blue: 213, alpha: 255 },
    { red: 48, green: 115, blue: 112, alpha: 255 },
    { red: 52, green: 90, blue: 180, alpha: 255 },
    { red: 63, green: 110, blue: 220, alpha: 255 },
    { red: 74, green: 128, blue: 255, alpha: 255 },
    { red: 39, green: 67, blue: 135, alpha: 255 },
    { red: 0, green: 153, blue: 40, alpha: 255 },
    { red: 0, green: 187, blue: 50, alpha: 255 },
    { red: 0, green: 217, blue: 58, alpha: 255 },
    { red: 0, green: 114, blue: 30, alpha: 255 },
    { red: 91, green: 60, blue: 34, alpha: 255 },
    { red: 111, green: 74, blue: 42, alpha: 255 },
    { red: 129, green: 86, blue: 49, alpha: 255 },
    { red: 68, green: 45, blue: 25, alpha: 255 },
    { red: 79, green: 1, blue: 0, alpha: 255 },
    { red: 96, green: 1, blue: 0, alpha: 255 },
    { red: 112, green: 2, blue: 0, alpha: 255 },
    { red: 59, green: 1, blue: 0, alpha: 255 },
    { red: 147, green: 124, blue: 113, alpha: 255 },
    { red: 180, green: 152, blue: 138, alpha: 255 },
    { red: 209, green: 177, blue: 161, alpha: 255 },
    { red: 110, green: 93, blue: 85, alpha: 255 },
    { red: 112, green: 57, blue: 25, alpha: 255 },
    { red: 137, green: 70, blue: 31, alpha: 255 },
    { red: 159, green: 82, blue: 36, alpha: 255 },
    { red: 84, green: 43, blue: 19, alpha: 255 },
    { red: 105, green: 61, blue: 76, alpha: 255 },
    { red: 128, green: 75, blue: 93, alpha: 255 },
    { red: 149, green: 87, blue: 108, alpha: 255 },
    { red: 78, green: 46, blue: 57, alpha: 255 },
    { red: 79, green: 76, blue: 97, alpha: 255 },
    { red: 96, green: 93, blue: 119, alpha: 255 },
    { red: 112, green: 108, blue: 138, alpha: 255 },
    { red: 59, green: 57, blue: 73, alpha: 255 },
    { red: 131, green: 93, blue: 25, alpha: 255 },
    { red: 160, green: 114, blue: 31, alpha: 255 },
    { red: 186, green: 133, blue: 36, alpha: 255 },
    { red: 98, green: 70, blue: 19, alpha: 255 },
    { red: 72, green: 82, blue: 37, alpha: 255 },
    { red: 88, green: 100, blue: 45, alpha: 255 },
    { red: 103, green: 117, blue: 53, alpha: 255 },
    { red: 54, green: 61, blue: 28, alpha: 255 },
    { red: 112, green: 54, blue: 55, alpha: 255 },
    { red: 138, green: 66, blue: 67, alpha: 255 },
    { red: 160, green: 77, blue: 78, alpha: 255 },
    { red: 84, green: 40, blue: 41, alpha: 255 },
    { red: 40, green: 28, blue: 24, alpha: 255 },
    { red: 49, green: 35, blue: 30, alpha: 255 },
    { red: 57, green: 41, blue: 35, alpha: 255 },
    { red: 30, green: 21, blue: 18, alpha: 255 },
    { red: 95, green: 75, blue: 69, alpha: 255 },
    { red: 116, green: 92, blue: 84, alpha: 255 },
    { red: 135, green: 107, blue: 98, alpha: 255 },
    { red: 71, green: 56, blue: 51, alpha: 255 },
    { red: 61, green: 64, blue: 64, alpha: 255 },
    { red: 75, green: 79, blue: 79, alpha: 255 },
    { red: 87, green: 92, blue: 92, alpha: 255 },
    { red: 46, green: 48, blue: 48, alpha: 255 },
    { red: 86, green: 51, blue: 62, alpha: 255 },
    { red: 105, green: 62, blue: 75, alpha: 255 },
    { red: 122, green: 73, blue: 88, alpha: 255 },
    { red: 64, green: 38, blue: 46, alpha: 255 },
    { red: 53, green: 43, blue: 64, alpha: 255 },
    { red: 65, green: 53, blue: 79, alpha: 255 },
    { red: 76, green: 62, blue: 92, alpha: 255 },
    { red: 40, green: 32, blue: 48, alpha: 255 },
    { red: 53, green: 35, blue: 24, alpha: 255 },
    { red: 65, green: 43, blue: 30, alpha: 255 },
    { red: 76, green: 50, blue: 35, alpha: 255 },
    { red: 40, green: 26, blue: 18, alpha: 255 },
    { red: 53, green: 57, blue: 29, alpha: 255 },
    { red: 65, green: 70, blue: 36, alpha: 255 },
    { red: 76, green: 82, blue: 42, alpha: 255 },
    { red: 40, green: 43, blue: 22, alpha: 255 }
  ]

  colorId -= 3 // 

  if (!colors[colorId]) return { red: 255, green: 255, blue: 255, alpha: 255 }
  else return colors[colorId];

}

const resolveSrv = util.promisify(dns.resolveSrv);
const lookup = util.promisify(dns.lookup);

async function getSRVRecord(domain) {
  try {
    const records = await resolveSrv('_minecraft._tcp.' + domain);
    if (records.length > 0) {
      const record = records[0];
      const { address } = await lookup(record.name);
      return {
        ip: address,
        port: record.port,
      };
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}

global.mainWindow;
let bots = {};
var botsConectado = [];
let mcData;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return '';
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function minecraftColorToHtml(color) {
  const colorMap = {
    'black': 'black',
    'dark_blue': 'darkblue',
    'dark_green': 'darkgreen',
    'dark_aqua': 'teal',
    'dark_red': 'darkred',
    'dark_purple': 'purple',
    'gold': 'gold',
    'gray': 'gray',
    'dark_gray': 'darkgray',
    'blue': 'blue',
    'green': 'green',
    'aqua': 'aqua',
    'red': 'red',
    'light_purple': 'violet',
    'yellow': 'yellow',
    'white': 'white',
    '§0': 'black',
    '§1': 'darkblue',
    '§2': 'darkgreen',
    '§3': 'teal',
    '§4': 'darkred',
    '§5': 'purple',
    '§6': 'gold',
    '§7': 'gray',
    '§8': 'darkgray',
    '§9': 'blue',
    '§a': 'green',
    '§b': 'aqua',
    '§c': 'red',
    '§d': 'light_purple',
    '§e': 'yellow',
    '§f': 'white'
  };
  return colorMap[color] || color;
}

function processMinecraftCodes(message) {
  const colorCodes = {
    '§0': 'black',
    '§1': 'dark_blue',
    '§2': 'dark_green',
    '§3': 'dark_aqua',
    '§4': 'dark_red',
    '§5': 'dark_purple',
    '§6': 'gold',
    '§7': 'gray',
    '§8': 'dark_gray',
    '§9': 'blue',
    '§a': 'green',
    '§b': 'aqua',
    '§c': 'red',
    '§d': 'light_purple',
    '§e': 'yellow',
    '§f': 'white'
  };

  for (let code in colorCodes) {
    let regex = new RegExp(code, 'g');
    message = message.replace(regex, `<span style="color:${colorCodes[code]}">`);
    message = message.replace(/§r/g, '</span>');
  }

  return message;
}

function processMessage(message) {
  let fullMessage = message.text ? escapeHtml(message.text) : '';
  if (fullMessage.includes('§l')) {
    let parts = fullMessage.split('§l');
    let boldParts = parts[1].split(' ');
    boldParts[0] = `<strong>${boldParts[0]}</strong>`;
    parts[1] = boldParts.join(' ');
    fullMessage = parts.join('');
  }
  fullMessage = processMinecraftCodes(fullMessage);
  let htmlColor = minecraftColorToHtml(message.color);
  let fontWeight = message.bold ? 'bold' : 'normal';
  if (message.extra) {
    message.extra.forEach((extraMessage) => {
      let extraFullMessage = extraMessage.text.includes('§l') ? `<strong>${processMessage(extraMessage)}</strong>` : processMessage(extraMessage);
      fullMessage += ` <span style="color:${minecraftColorToHtml(extraMessage.color)}; font-weight:${extraMessage.bold ? 'bold' : 'normal'};">${extraFullMessage}</span>`;
    });
  }
  return `<span style="color:${htmlColor}; font-weight:${fontWeight};">${fullMessage}</span>`;
}

function processTitle(title) {
  let titleObject;
  if (typeof title === 'string') {
    titleObject = JSON.parse(title);
  } else if (typeof title === 'object') {
    titleObject = title;
  } else {
    throw new Error(`Unexpected title type: ${typeof title}`);
  }

  let fullTitle, htmlColor, fontWeight;
  if (titleObject.value) {
    // Estrutura para a versão 1.20.4
    fullTitle = escapeHtml(titleObject.value.text.value.replace(/§l/g, '<strong>')).replace(/<\/strong>/g, '') + '</strong>';
    htmlColor = minecraftColorToHtml(titleObject.value.color.value);
    fontWeight = titleObject.value.bold || titleObject.value.text.value.includes('§l') ? 'bold' : 'normal';
  } else {
    // Estrutura para a versão 1.20.2
    fullTitle = escapeHtml(titleObject.text.replace(/§l/g, '<strong>')).replace(/<\/strong>/g, '') + '</strong>';
    htmlColor = minecraftColorToHtml(titleObject.color);
    fontWeight = titleObject.bold || titleObject.text.includes('§l') ? 'bold' : 'normal';
  }

  return `<span style="color:${htmlColor}; font-weight:${fontWeight};">${fullTitle}</span>`;
}

async function head_captcha_solver_2(bot, window) {
  let allHeads = true;
  let urls = {};
  let slots = {};

  for (let i = 0; i < window.slots.length; i++) {
    let slot = window.slots[i];
    if (slot && slot.nbt) {
      if (slot.name !== 'player_head' && slot.name !== 'skull') {
        allHeads = false;
        break;
      }
      let nbt = JSON.stringify(slot.nbt);
      let regex = /"Value":{"type":"string","value":"(.*?)"}/g;
      let matches = [...nbt.matchAll(regex)];
      if (matches.length > 0) {
        let base64 = matches[0][1];
        let decodedString = atob(base64);
        try {
          let jsonObject = JSON.parse(decodedString);
          if (jsonObject.textures && jsonObject.textures.SKIN && jsonObject.textures.SKIN.url) {
            let url = jsonObject.textures.SKIN.url;
            urls[url] = (urls[url] || 0) + 1;
            slots[url] = i; // Guarda o índice do slot para cada URL
          }
        } catch (e) {
          console.log(`Erro ao analisar a string decodificada em JSON: ${e}`);
        }
      }
    }
  }

  if (!allHeads) {
    return; // Se nem todos os itens são cabeças de jogador, o código para aqui
  }

  global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:yellow'>Captcha de cabeça detectado KKKKKKKKKKKKKKKKKKKKKK, que bosta heim, quem que usa isso hoje em dia</span><br/> " })

  // Encontra a URL que aparece mais de uma vez
  let repeatedUrl = Object.keys(urls).find(url => urls[url] > 1);

  if (repeatedUrl) {
    let slotIndex = slots[repeatedUrl];
    bot.clickWindow(slotIndex, 0, 0); // Exemplo de como você pode clicar no slot
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:green'>Pronto eu resolvi esse captcha de bosta ai</span><br/> " })
  } else {
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:red'>Vish fudeu nao encontrei nenhuma URL que aparece mais de uma vez pra esse captcha fudido</span><br/> " })
  }
}

async function head_captcha_solver(bot, window) {
  let allHeads = true;
  let urls = {};
  let slots = {};

  // Verifica todos os itens no baú
  for (let i = 0; i < window.slots.length; i++) {
    let slot = window.slots[i];
    if (slot && slot.nbt) {
      if (slot.name !== 'player_head' && slot.name !== 'skull') {
        allHeads = false;
        break;
      }
      let nbt = JSON.stringify(slot.nbt);
      let regex = /"Value":\{"type":"string","value":"(.*?)"\}/g;
      let matches = [...nbt.matchAll(regex)];
      if (matches.length > 1) {
        let base64 = matches[1][1];
        let decodedString = atob(base64);
        try {
          let jsonObject = JSON.parse(decodedString);
          if (jsonObject.textures && jsonObject.textures.SKIN && jsonObject.textures.SKIN.url) {
            let url = jsonObject.textures.SKIN.url;
            urls[url] = (urls[url] || 0) + 1;
            slots[url] = i; // Guarda o índice do slot para cada URL
          }
        } catch (e) {
          console.log(`Erro ao analisar a string decodificada em JSON: ${e}`);
        }
      }
    }
  }

  if (!allHeads) {
    return; // Se nem todos os itens são cabeças de jogador, o código para aqui
  }

  global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:yellow'>Captcha de cabeça detectado KKKKKKKKKKKKKKKKKKKKKK, que bosta heim, quem que usa isso hoje em dia</span><br/> " })

  // Encontra a URL única
  let uniqueUrl = Object.keys(urls).find(url => urls[url] === 1);

  if (uniqueUrl) {
    let slotIndex = slots[uniqueUrl];
    bot.clickWindow(slotIndex, 0, 0); // Exemplo de como você pode clicar no slot
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:green'>Pronto eu resolvi esse captcha de bosta ai</span><br/> " })
  } else {
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:red'>Vish fudeu nao encontrei nenhuma URL unica pra esse captcha fudido</span><br/> " })
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:yellow'>Tentando outro metodo...</span><br/> " })
    head_captcha_solver_2(bot, window)
  }
}

let autoreconnect = false;
let autoreconnectdelay = 0;

ipcMain.on('form-data-changed', (event, data) => {
  autoreconnect = data.autoReconnect;
  autoreconnectdelay = parseInt(data.delay);
});

const isInvWindowOpened = () => !inventoryWindow?.isDestroyed() && inventoryWindow?.isFocusable();

process.on('unhandledRejection', (reason, promise) => {
  if (reason.message !== '(mineflayer-web-inventory) INFO: mineflayer-web-inventory is not running') { // webinventory dev fix that verification shit, its just if(bot.webInventory.running) stop on bot 'end'
    // dont make nothing
  }
});

ipcMain.on('log', (event, message) => {
  console.log(message); // Imprime a mensagem no console do navegador
});

ipcMain.on('send-message-all', (event, message) => {
  global.mainWindow.webContents.send('bot-message-all', message)
});

let botsaarray = []
let placedBlocks = new Set();

const ipPortRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]+$/;
let record = {};

ipcMain.on('connect-bot', async (event, { host, username, version, proxy, proxyType }) => {
  if (botsConectado.includes(username)) return

  let bot;
  if (proxy && proxy.ip && proxy.port && !proxy.user && !proxy.password && (proxyType === '4' || proxyType === '5')) {
    console.log("proxy, no pass, no user, type: " + proxyType);
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }
    bot = mineflayer.createBot({
      connect: (client) => {
        Socks.createConnection({
          proxy: {
            host: proxy.ip,
            port: parseInt(proxy.port),
            type: parseInt(proxyType)
          },
          command: 'connect',
          destination: {
            host: record ? record.ip : host,
            port: record ? record.port : 25565
          }
        }, (err, info) => {
          if (err) {
            console.log(err)
            return
          }
          client.setSocket(info.socket)
          client.emit('connect')
        })
      },
      username: username,
      version: version
    });
  }
  else if (proxy && proxy.ip && proxy.port && proxy.user && !proxy.password && (proxyType === '4' || proxyType === '5')) {
    console.log("proxy, no pass, type: " + proxyType)
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }
    bot = mineflayer.createBot({
      connect: (client) => {
        Socks.createConnection({
          proxy: {
            host: proxy.ip,
            port: parseInt(proxy.port),
            type: parseInt(proxyType),
            userId: proxy.user,
            password: ''
          },
          command: 'connect',
          destination: {
            host: record ? record.ip : host,
            port: record ? record.port : 25565
          }
        }, (err, info) => {
          if (err) {
            console.log(err)
            return
          }
          client.setSocket(info.socket)
          client.emit('connect')
        })
      },
      username: username,
      version: version
    });
  }
  else if (proxy && proxy.ip && proxy.port && proxy.user && proxy.password && (proxyType === '4' || proxyType === '5')) {
    console.log("proxy, type: " + proxyType)
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }
    bot = mineflayer.createBot({
      connect: (client) => {
        Socks.createConnection({
          proxy: {
            host: proxy.ip,
            port: parseInt(proxy.port),
            type: parseInt(proxyType),
            userId: proxy.user,
            password: proxy.password
          },
          command: 'connect',
          destination: {
            host: record ? record.ip : host,
            port: record ? record.port : 25565
          }
        }, (err, info) => {
          if (err) {
            console.log(err)
            return
          }
          client.setSocket(info.socket)
          client.emit('connect')
        })
      },
      username: username,
      version: version
    });
  }
  else if (proxy && proxy.ip && proxy.port && !proxy.user && !proxy.password && (proxyType === 'http')) {
    console.log("proxy, no pass, no user, type: " + proxyType)
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }

    bot = mineflayer.createBot({
      connect: (client) => {
        const req = Http.request({
          host: proxy.ip,
          port: parseInt(proxy.port),
          method: 'CONNECT',
          path: record.ip + ':' + parseInt(record.port)
        })
        req.end()

        req.on('connect', (res, stream) => {
          client.setSocket(stream)
          client.emit('connect')
        })

        req.on('error', (err) => {
          console.log(err);
          const indexConectado = botsConectado.indexOf(username);
          if (indexConectado > -1) {
            botsConectado.splice(indexConectado, 1);
          }

          const indexArray = botsaarray.indexOf(bot);
          if (indexArray > -1) {
            botsaarray.splice(indexArray, 1);
          }

          global.mainWindow.webContents.send('botsarraytohtml', botsConectado);

          global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
          global.mainWindow.webContents.send('bot-disconnected', username)
        })
      },
      agent: new ProxyAgent({ protocol: 'http', host: proxy.ip, port: proxy.port }),
      username: username,
      version: version
    })
  }
  else if (proxy && proxy.ip && proxy.port && proxy.user && !proxy.password && (proxyType === 'http')) {
    console.log("proxy, no pass, type: " + proxyType)
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }

    bot = mineflayer.createBot({
      connect: (client) => {
        const req = Http.request({
          host: proxy.ip,
          port: proxy.port,
          method: 'CONNECT',
          path: record.ip + ':' + parseInt(record.port),
          headers: {
            'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.user).toString('base64')
          }
        })
        req.end()

        req.on('connect', (res, stream) => {
          client.setSocket(stream)
          client.emit('connect')
        })

        req.on('error', (err) => {
          console.log(err);
          const indexConectado = botsConectado.indexOf(username);
          if (indexConectado > -1) {
            botsConectado.splice(indexConectado, 1);
          }

          const indexArray = botsaarray.indexOf(bot);
          if (indexArray > -1) {
            botsaarray.splice(indexArray, 1);
          }

          global.mainWindow.webContents.send('botsarraytohtml', botsConectado);

          global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
          global.mainWindow.webContents.send('bot-disconnected', username)
        })
      },
      agent: new ProxyAgent({
        protocol: 'http',
        host: proxy.ip,
        port: proxy.port,
        auth: proxy.user
      }),
      username: username,
      version: version
    })

  }
  else if (proxy && proxy.ip && proxy.port && proxy.user && proxy.password && (proxyType === 'http')) {
    console.log("proxy, type: " + proxyType)
    console.log("targeted proxy: " + proxy.ip + ":" + proxy.port);
    if (ipPortRegex.test(host)) {
      const [ip, port] = host.split(':');
      record.ip = ip;
      record.port = parseInt(port);
    } else {
      record = await getSRVRecord(host);
      if (!record) {
        console.log('SRV Record nao encontrado, bot anulado... ');
        return;
      }
    }

    bot = mineflayer.createBot({
      connect: (client) => {
        const req = Http.request({
          host: proxy.ip,
          port: proxy.port,
          method: 'CONNECT',
          path: record.ip + ':' + parseInt(record.port),
          headers: {
            'Proxy-Authorization': 'Basic ' + Buffer.from(proxy.user + ':' + proxy.password).toString('base64')
          }
        })
        req.end()

        req.on('connect', (res, stream) => {
          client.setSocket(stream)
          client.emit('connect')
        })

        req.on('error', (err) => {
          console.log(err);
          const indexConectado = botsConectado.indexOf(username);
          if (indexConectado > -1) {
            botsConectado.splice(indexConectado, 1);
          }

          const indexArray = botsaarray.indexOf(bot);
          if (indexArray > -1) {
            botsaarray.splice(indexArray, 1);
          }

          global.mainWindow.webContents.send('botsarraytohtml', botsConectado);

          global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
          global.mainWindow.webContents.send('bot-disconnected', username)
        })
      },
      agent: new ProxyAgent({
        protocol: 'http',
        host: proxy.ip,
        port: proxy.port,
        auth: proxy.user + ':' + proxy.password
      }),
      username: username,
      version: version
    })

  }
  else {
    console.log("bot without proxy")
    bot = mineflayer.createBot({ host, username, version: version, auth: 'offline' });
  }

  bot.commandChecks = {}; // por que sim!

  bot.loadPlugin(pathfinder)

  const pluginDir = './plugins';

  fs.access(pluginDir, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Diretório ${pluginDir} não existe.`);
    }

    fs.readdir(pluginDir, (err, files) => {
      if (err) {
        console.error('Não foi possível ler o diretório de plugins:', err);
      }

      if (files.length === 0) {
        console.log('Nenhum plugin para carregar.');
      }

      files.forEach(file => {
        if (path.extname(file) === '.js') {
          console.log(`Carregando plugin: ${file}`);
          const plugin = require(`${pluginDir}/${file}`);
          bot.loadPlugin(plugin);
        }
      });
    });
  });

  let options = {
    port: 9531,
    startOnLoad: false
  }

  inventoryViewer(bot, options)

  bot.on('connect', async () => {
    //if (!botsConectado.includes(username)) {
    //  botsConectado.push(username);
    //  botsaarray.push(bot); // Add bot to botsaarray when it logs in
    global.mainWindow.webContents.send('bot-connecting', username)
    global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'connecting' })
    console.log("connecting")
    //}
  })
  bot.on('login', () => {
    if (!botsConectado.includes(username)) {
      botsConectado.push(username);
      botsaarray.push(bot); // Add bot to botsaarray when it logs in
      global.mainWindow.webContents.send('botsarraytohtml', botsConectado);
      global.mainWindow.webContents.send('bot-connected', bot.username)
      global.mainWindow.webContents.send('update-bot-status', { bot: bot.username, status: 'connected' })

      const index = botsSemAutoReconnect.indexOf(username);
      if (index > -1) {
        botsSemAutoReconnect.splice(index, 1); // Remova o bot da lista
      }

      console.log("logged")
    }
  });

  bot.on('blockUpdate', (oldBlock, newBlock) => { // for pathfinding
    if (newBlock && !oldBlock) {
      placedBlocks.add(newBlock.position.toString());
    }
    else if (!newBlock && oldBlock) {
      placedBlocks.delete(oldBlock.position.toString());
    }
  });

  bot.on('end', async () => {
    console.log("deleted")

    const indexConectado = botsConectado.indexOf(username);
    if (indexConectado > -1) {
      botsConectado.splice(indexConectado, 1);
    }

    const indexArray = botsaarray.indexOf(bot);
    if (indexArray > -1) {
      botsaarray.splice(indexArray, 1);
    }

    global.mainWindow.webContents.send('botsarraytohtml', botsConectado);

    global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
    global.mainWindow.webContents.send('bot-disconnected', username)

    if (janelasCaptcha[username]) {
      janelasCaptcha[username].close();
      janelasCaptcha[username] = null;
    }

    if (isInvWindowOpened()) {
      inventoryWindow.close();
      inventoryWindow = null;
    }

    if (miningState[bot.username]) {
      miningState[bot.username] = false;
    }

    if (PescaActive[bot.username]) {
      PescaActive[bot.username] = false;
    }

    if (killAuraActive[bot.username]) {
      killAuraActive[bot.username] = false;
    }

    if (IsSneaking[bot.username]) {
      IsSneaking[bot.username] = false;
    }

    if (followInterval[bot.username]) {
      clearInterval(followInterval[bot.username]);
      isFollowing[bot.username] = false;
    }

    if (autoreconnect) {
      await sleep(50); // esperar ficar tudo ok para o autoreconnect ? por que esta verificao ? para caso delay do autoreconnect seja 0 ou muito baixo
      await sleep(autoreconnectdelay); // esperar delay do autoreconnect
      if (!botsConectado.includes(username) && !botsSemAutoReconnect.includes(username)) // por que esta verificacao? para caso o usuario clique em conectar mesmo com o auto reconnect ativo
      {
        ipcMain.emit('connect-bot', null, { host: host, username: username, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType });
      }
    }
  })

  bot._client.on('map', ({ data }) => {
    if (!data) return;

    const item = bot.heldItem;
    if (item && item.name === 'filled_map') {
      const tamanho = Math.sqrt(data.length);
      const imagem = PNGImage.createImage(tamanho, tamanho);

      for (let x = 0; x < tamanho; x++) {
        for (let z = 0; z < tamanho; z++) {
          const idCor = data[x + (z * tamanho)];
          imagem.setAt(x, z, getColor(idCor));
        }
      }

      imagem.toBlob(function (erro, blob) {
        if (erro) throw erro;

        // Armazena a imagem na memória como uma string codificada em base64
        captchaImages[bot.username] = blob.toString('base64');

        app.whenReady().then(() => CreateCaptchaWindow(bot.username));
      });
    }
  });

  bot.on('error', (err) => {
    /*const indexConectado = botsConectado.indexOf(username);
    if (indexConectado > -1) {
      botsConectado.splice(indexConectado, 1);
    }

    const indexArray = botsaarray.indexOf(bot);
    if (indexArray > -1) {
      botsaarray.splice(indexArray, 1);
    }

    sleep(50); // aqui precisa de sleep pois o como bot ainda esta conectando vai ao mesmo tempo que o disconect tecnicamente, entao nao atualiza o status para disconected

    if (bot.username == null) {
      global.mainWindow.webContents.send('bot-disconnected', username)
      global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
    }
    else {
      global.mainWindow.webContents.send('bot-disconnected', bot.username)
      global.mainWindow.webContents.send('update-bot-status', { bot: bot.username, status: 'disconnected' })
    }*/

    console.log(err)
  })

  bot.on('kicked', (reason) => {
    let reasonObj;
    if (typeof reason === 'string') {
      reasonObj = JSON.parse(reason);
    } else {
      reasonObj = reason;
    }

    // Initialize an empty string to hold the HTML
    let htmlMessage = '';

    // Add a line break and the kick message at the beginning
    htmlMessage += `<br/><p>Kick:</p>`;

    // Check if the reason object has an 'extra' property
    if (reasonObj.extra) {
      // This is the third type of data structure
      let textArray = reasonObj.extra.map(item => item.text ? { text: item.text, color: item.color ? item.color : 'white' } : null);
      let messages = textArray.filter(item => item && item.text.trim() !== '');
      // Create a single HTML paragraph element for the messages
      let hasNewLine = messages.some(message => message.text.includes('\n'));

      messages.forEach((message, index) => {
        let splitText = message.text.split('\n');
        splitText.forEach((text, i) => {
          if (text !== '') {
            // Adiciona uma quebra de linha após cada texto, a menos que seja o último e não termine com '\n'
            // Se nenhum texto contém '\n', adiciona uma quebra de linha no final de todos os textos
            let addBreakLine = i < splitText.length - 1 || message.text.endsWith('\n') || !hasNewLine;

            if (index === 0 && i === 0) {
              htmlMessage += `<h1 style="color: ${message.color};">${text}${addBreakLine ? '<br/>' : ''}</h1>`;
            } else {
              htmlMessage += `<span style="color: ${message.color};">${text}${addBreakLine ? '<br/>' : ''}</span>`;
            }
          }
        });
      });
    } else if (reasonObj.value && reasonObj.value.extra && reasonObj.value.extra.value && reasonObj.value.extra.value.value) {
      // This is the second type of data structure
      let textArray = reasonObj.value.extra.value.value.map(item => item.text ? { text: item.text.value, color: item.color ? item.color.value : 'black' } : null);
      let messages = textArray.filter(item => item && item.text.trim() !== '');
      // Create a single HTML paragraph element for the messages
      messages.forEach((message, index) => {
        // Split the text by '\n' to handle line breaks
        let splitText = message.text.split('\n').filter(text => text.trim() !== '');
        splitText.forEach((text, i) => {
          if (index === 0 && i === 0) {
            // Treat the first message as the title
            htmlMessage += `<h1 style="color: ${message.color};">${text}</h1>`;
          } else {
            htmlMessage += `<p style="color: ${message.color};">${text}</p>`;
          }
        });
      });
    }
    else if (reasonObj.text && reasonObj.color) {
      // This is the new case we are adding
      let message = processMinecraftCodes(reasonObj.text);
      htmlMessage += `<br/><p style="color: ${reasonObj.color};">${message}</p>`;
    }
    else if (reasonObj.text) {
      let message = processMinecraftCodes(reasonObj.text);
      htmlMessage += `<br/><p>${message}</p>`;
    }
    else {
      let message = processMinecraftCodes(reasonObj);
      htmlMessage += `<br/><p>${message}</p>`;
    }

    // Send the HTML message to the web contents
    global.mainWindow.webContents.send('bot-message', { bot: username, message: htmlMessage });

    const indexConectado = botsConectado.indexOf(username);
    if (indexConectado > -1) {
      botsConectado.splice(indexConectado, 1);
    }

    const indexArray = botsaarray.indexOf(bot);
    if (indexArray > -1) {
      botsaarray.splice(indexArray, 1);
    }

    global.mainWindow.webContents.send('botsarraytohtml', botsConectado);

    global.mainWindow.webContents.send('update-bot-status', { bot: username, status: 'disconnected' })
    global.mainWindow.webContents.send('bot-disconnected', username)
  });

  /* // debug things
    bot._client.on('packet', (data, meta) => {
      console.log('Recebido:', meta.name, data);
    });
  
    bot._client.on('outgoing:' + 'packet', (data) => {
      console.log('Enviado:', 'packet', data);
    }); 
  */

  bot.on('message', (message) => {
    let fullMessage = processMessage(message);
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: fullMessage });

    // Chama a função processClickEvent com a mensagem
    if (ClickTextDetect) {
      processClickEvent(bot, message);
    }
  });

  bot.on('title', (title) => {
    try {
      let fullTitle = processTitle(title);
      global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: fullTitle });
    } catch (error) {
      console.error("Error: " + error);
    }
  });

  bot._client.on('packet', async (data, meta) => {
    try {
      if (parseFloat(bot?.version ?? '0') >= 1.17 && (meta.name === 'set_title_text' || meta.name === 'set_title_subtitle')) {
        bot?.emit('title', data.text);
      }
    } catch (error) {
      console.error("Error: " + error);
    }
  })

  bot.once('windowOpen', async (window) => {
    head_captcha_solver(bot, window);
  });

  bots[bot.username] = bot
  botsa = bot
})

ipcMain.on('captcha-input-janela1', (event, botUsername, captchaInput) => {
  const botsaarrayCopy = [...botsaarray]; // Create a copy of botsaarray
  botsaarrayCopy.forEach((bot) => {
    if (bot.username == botUsername) {
      bot.chat(captchaInput);
      global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Captcha enviado!</span><br/>" })
    }
  })
});

async function pesca(bot) {
  // Verifique o inventário do bot por uma vara de pesca
  const itemVaraDePesca = bot.inventory.items().find(item => item.name === 'fishing_rod');

  // Se tiver uma vara de pesca, equipe-a na mão do bot
  if (itemVaraDePesca) {
    await bot.equip(itemVaraDePesca, 'hand');
  } else {
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Vara de pesca não encontrada no inventário.</span><br/>" })
    return;
  }

  // Encontre o bloco de água mais próximo
  const blocoAgua = bot.findBlock({
    matching: ['water', 'flowing_water'].map(name => mcData.blocksByName[name].id),
    maxDistance: 8,
  });

  // Se encontrou um bloco de água, olhe para ele
  if (blocoAgua) {
    await bot.lookAt(blocoAgua.position.offset(0, 1, 0));

    // Verifique se há uma entidade na posição que o bot está olhando
    const entity = bot.nearestEntity();

    // Se houver uma entidade, espere até que ela saia
    if (entity && bot.entity.position.distanceTo(entity.position) < 1) {
      global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Esperando a entidade sair...</span><br/>" })
      bot.once('entityGone', async () => {
        await pesca(bot);
      });
    } else {
      // Comece a pescar
      await bot.fish();

      // Se a pesca ainda estiver ativa, chame a função pesca novamente
      if (PescaActive[bot.username]) {
        await pesca(bot);
      }
    }
  } else {
    global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Nenhum bloco de água encontrado nas proximidades.</span><br/>" })
  }
}

let inventorywasopen = false;
let inventoryWindow = null;
let isWindowClosing = false;

function createInventoryWindow() {
  inventoryWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
    frame: false  // Adiciona esta linha
  })

  inventoryWindow.loadURL('http://localhost:9531')
  inventoryWindow.setMenu(null)  // Adiciona esta linha
}

async function onDiggingCompleted(bot, err) {
  if (err) {
    console.log(`Erro ao minerar o bloco: ${err.message}`);
  } else {
    console.log('Bloco minerado com sucesso.');
    clearInterval(swingInterval[bot.username]); // Limpa o intervalo após a mineração ser concluída
  }
}

async function minerar(bot, blockId) {
  if (!miningState[bot.username]) { // Se a mineração estiver desativada
    return;
  }

  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);

  const block = bot.findBlock({
    matching: mcData.blocksByName[blockId].id,
    maxDistance: 16,
  });

  if (block) {
    swingInterval[bot.username] = setInterval(async () => { // Adiciona o intervalo ao objeto swingInterval
      try {
        if (bot.pathfinder.isBuilding()) {
          const blockInHand = bot.heldItem;

          if (blockInHand) {
            const lookAtBlockPos = bot.blockAtCursor();
            if (lookAtBlockPos && lookAtBlockPos.position) {
              const blockPosStr = lookAtBlockPos.position.toString();
              if (!placedBlocks.has(blockPosStr)) {
                await bot.placeBlock(bot.blockAt(lookAtBlockPos.position), new Vec3(0, 1, 0)).catch();
                placedBlocks.add(blockPosStr);
              }
            }
          }
        }
      } catch (e) { }
    }, 250);
    const { x, y, z } = block.position; // obtém as coordenadas do bloco
    const goal = new goals.GoalNear(x, y, z, 1);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(goal);
    bot.pathfinder.tickTimeout = 1;

    bot.once('goal_reached', async function () {
      // Verifica se o bot tem uma picareta no inventário
      const pickaxe = bot.inventory.items().find(item => item.name.includes('pickaxe'));

      if (pickaxe) {
        bot.equip(pickaxe, 'hand');
      }

      if (bot.canDigBlock(block)) {
        await bot.dig(block, () => onDiggingCompleted(bot));
        await minerar(bot, blockId)
      }
    });
  } else {
    return;
  }
}

async function chooseTool(bot, block) {
  const mcData = require('minecraft-data')(bot.version);
  const hardness = mcData.blocksByName[block.name].hardness;

  let tool;
  if (hardness < 0.8) {
    tool = getBestTool(bot, 'shovel');
  } else if (hardness < 1.5) {
    tool = getBestTool(bot, 'pickaxe');
  } else {
    tool = null;
  }

  if (tool) {
    await bot.equip(tool, 'hand');
  }
}

function getBestTool(bot, toolType) {
  const materials = ['wooden', 'stone', 'iron', 'diamond', 'netherite'];
  let bestTool = null;
  let maxEnchantmentLevel = -1;

  for (let i = materials.length - 1; i >= 0; i--) {
    const tools = bot.inventory.items().filter(item => item.name.includes(materials[i]) && item.name.includes(toolType));
    for (const tool of tools) {
      const enchantmentLevel = getEnchantmentLevel(tool);
      if (enchantmentLevel > maxEnchantmentLevel || (enchantmentLevel === maxEnchantmentLevel && !bestTool)) {
        maxEnchantmentLevel = enchantmentLevel;
        bestTool = tool;
      }
    }
  }
  return bestTool;
}

function getEnchantmentLevel(item) {
  if (!item.nbt || !item.nbt.value || !item.nbt.value.Enchantments) {
    return 0;
  }
  let level = 0;
  for (const enchantment of item.nbt.value.Enchantments.value.value) {
    level += enchantment.lvl.value;
  }
  return level;
}

async function minerar2(bot, x1, y1, z1, x2, y2, z2) {
  if (!miningState[bot.username]) {
    return;
  }

  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);

  let blocks = [];

  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
        const block = bot.blockAt(new Vec3(x, y, z));
        if (block && bot.canDigBlock(block)) {
          blocks.push(block);
        }
      }
    }
  }

  blocks.sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position));

  if (blocks.length === 0) {
    console.log('Não há mais blocos dentro das coordenadas fornecidas.');
    return;
  }

  const block = blocks.shift();
  const { x, y, z } = block.position;
  const goal = new goals.GoalNear(x, y, z, 1);
  bot.pathfinder.setMovements(defaultMove);
  bot.pathfinder.setGoal(goal);
  bot.pathfinder.tickTimeout = 1;

  swingInterval[bot.username] = setInterval(async () => {
    try {
      if (bot.pathfinder.isBuilding()) {
        const blockInHand = bot.heldItem;

        if (blockInHand) {
          const lookAtBlockPos = bot.blockAtCursor();
          if (lookAtBlockPos && lookAtBlockPos.position) {
            const blockPosStr = lookAtBlockPos.position.toString();
            if (!placedBlocks.has(blockPosStr)) {
              await bot.placeBlock(bot.blockAt(lookAtBlockPos.position), new Vec3(0, 1, 0)).catch();
              placedBlocks.add(blockPosStr);
            }
          }
        }
      }
    } catch (e) { }
  }, 250);

  bot.on('goal_reached', async function () {
    await chooseTool(bot, block);
    if (bot.canDigBlock(block)) {
      await bot.dig(block, () => onDiggingCompleted(bot));
      await minerar2(bot, x1, y1, z1, x2, y2, z2)
    }
  });
}

ipcMain.on('send-message', async (event, { botUsername, message }) => {
  botsaarray.forEach((bot) => {
    if (bot.username == botUsername) {
      for (let checkCommand of Object.values(bot.commandChecks)) {
        checkCommand(message);
      }
      if (message.startsWith('$')) {
        if (!global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Comando Inexistente</span><br><br/>" + global.Syntax })
        }
        else if (message.toLowerCase().startsWith("$clickentity")) {
          const playerFilter = (entity) => (!botsConectado.includes(entity.username) && entity.displayName !== 'Armor Stand');
          const entity = bot.nearestEntity(playerFilter);

          console.log(entity);

          if (entity) {
            bot.lookAt(entity.position.offset(0, entity.height, 0));
            bot.attack(entity)
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Entidade clicada!</span><br/>` })
          } else {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Nenhuma entidade proxima para clicar!</span><br/>` })
          }
        }
        else if (message.toLowerCase().startsWith("$sethotbarslot ")) {
          const slotarg = message.split(' ');
          const slotNumber = parseInt(slotarg[1]); // extrai o número do slot

          if (isNaN(slotNumber) || slotNumber < 0 || slotNumber > 8) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Valor invalido!</span><br/>` })
          }
          else {
            bot.setQuickBarSlot(slotNumber); // define o slot
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Slot da Hotbar setado para ${slotNumber}!</span><br/>` })
          }
        }
        else if (message.toLowerCase() == "$listslots") {
          if (bot.currentWindow) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>A janela atual tem ${bot.currentWindow.slots.length} slots!</span><br/>` })
          } else {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Nao ha janela aberta</span><br/>` })
          }
        }
        else if (message.toLowerCase() == "$holditem") {
          bot.activateItem();
          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Item clicado!</span><br/>` })

          if (bot.usingHeldItem) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Item usavel, parando de clicar!</span><br/>` })
            bot.deactivateItem();
          }
        }
        else if (message.toLowerCase().startsWith("$setinventoryslot ")) {
          const slotarg = message.split(' ');
          const slotNumber = parseInt(slotarg[1]); // extrai o número do slot
          const action = slotarg[2]; // extrai a ação

          if (isNaN(slotNumber)) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Valor invalido!</span><br/>` })
          }
          else if (action === 'drop') {
            (async () => {
              const item = bot.inventory.slots[slotNumber]; // Obtém o item no slot
              if (item) {
                await bot.tossStack(item); // Solta o item
                global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Dropando no slot do inventario ${slotNumber}!</span><br/>` })
              }
            })();
          }
          else {
            bot.clickWindow(slotNumber, 0, 0); // Exemplo de como você pode clicar no slot
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Clicando no slot do inventario ${slotNumber}!</span><br/>` })
          }
        }
        else if (message.toLowerCase().startsWith("$dropall")) {
          (async () => {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Dropando todos itens!</span><br/>` })
            var inventoryItemCount = bot.inventory.items().length;
            if (inventoryItemCount === 0) return;

            while (inventoryItemCount > 0) {
              const item = bot.inventory.items()[0];
              await bot.tossStack(item);
              inventoryItemCount--;
            }
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Todos itens dropados!</span><br/>` })
          })();
        }
        else if (message.toLowerCase().startsWith("$inventoryinterface")) {
          (async () => {
            inventorywasopen = !inventorywasopen;
            if (!bot.webInventory.isRunning && inventorywasopen) {
              bot.webInventory.start();
              createInventoryWindow();
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Interface sendo aberta!</span><br><br/>" });
            } else {
              if (isInvWindowOpened()) {
                inventoryWindow.loadURL('about:blank');
                isWindowClosing = false;
              }
              bot.webInventory.stop();
            }
            let intervalIdIV = setInterval(async () => {
              if (!bot.webInventory.isRunning) {
                if (isInvWindowOpened()) {
                  if (bot.webInventory.isRunning) {
                    bot.webInventory.stop();
                    inventorywasopen = !inventorywasopen;
                  }
                  if (!bot.webInventory.isRunning && !isWindowClosing) {
                    inventoryWindow.close();
                    inventoryWindow = null;
                  }
                }
                else {
                  clearInterval(intervalIdIV);
                }
              }
            }, 100);

            inventoryWindow.on('closed', async () => {
              if (isWindowClosing) return;
              isWindowClosing = true;

              if (inventorywasopen) {
                inventorywasopen = !inventorywasopen;
              }
              if (bot.webInventory.isRunning) {
                bot.webInventory.stop();
              }
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Interface fechada!</span><br><br/>" });
            });
          })();
        }
        else if (message.toLowerCase().startsWith("$miner ")) {
          (async () => {
            const args = message.split(' ')
            const blockId = args[1]; // extrai o ID do bloco do argumento
            miningState[bot.username] = !miningState[bot.username]; // Alterna o estado de mineração
            if (miningState[bot.username]) {
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Miner ativado!</span><br/>` })
            } else {
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Miner Desativado!</span><br/>` })
            }
            await minerar(bot, blockId);
          })();
        }
        else if (message.toLowerCase().startsWith("$miner2 ")) {
          (async () => {
            const args = message.split(' ')
            const [startX, startY, startZ, endX, endY, endZ] = args.slice(1).map(Number); // extrai as coordenadas dos argumentos
            miningState[bot.username] = !miningState[bot.username]; // Alterna o estado de mineração
            if (miningState[bot.username]) {
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Miner ativado!</span><br/>` })
            } else {
              global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Miner Desativado!</span><br/>` })
            }
            await minerar2(bot, startX, startY, startZ, endX, endY, endZ);
          })();
        }
        else if (message.toLowerCase() == "$pesca") {
          PescaActive[bot.username] = !PescaActive[bot.username];

          if (PescaActive[bot.username]) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Pesca ativado</span><br/>" });
            pesca(bot);
          }
          else {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Pesca desativado</span><br/>" });
          }
        }
        else if (message.toLowerCase().startsWith("$killAura.timems=")) {
          killAuraDelay = parseInt(message.split('=')[1]);

          if (killAuraDelay <= 0) {
            killAuraDelay = 1
          }

          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Delay do KillAura definido para ${killAuraDelay}ms</span><br/>` })
        }
        else if (message.toLowerCase().startsWith("$killAura.distance=")) {
          DistanceReach = parseInt(message.split('=')[1]);

          if (DistanceReach <= 0 || DistanceReach > 6 || isNaN(DistanceReach)) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:red'>Valor invalido! Distancia setada para 3m</span><br/>` })
            DistanceReach = 3
          }
          else {
            console.log(DistanceReach)
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Distancia do KillAura definida para ${DistanceReach}m</span><br/>` })
          }
        }
        else if (message.toLowerCase() == "$killaura") {
          killAuraActive[bot.username] = !killAuraActive[bot.username]

          if (killAuraActive[bot.username]) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>KillAura ativado</span><br/>" })
            attackInterval[bot.username] = setInterval(() => {
              const playerFilter = (entity) => entity.type === 'player' && !botsConectado.includes(entity.username);
              const playerEntity = bot.nearestEntity(playerFilter);

              if (playerEntity) {
                const distance = bot.entity.position.distanceTo(playerEntity.position);

                if (distance < DistanceReach) {
                  bot.lookAt(playerEntity.position.offset(0, playerEntity.height, 0));
                  bot.attack(playerEntity, true);
                }
              }
            }, killAuraDelay);
          } else {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>KillAura desativado</span><br/>" })
            clearInterval(attackInterval[bot.username]);
          }
        }
        else if (message.toLowerCase().startsWith("$goto ")) {
          if (isMoving[bot.username]) {
            bot.pathfinder.setGoal(null);
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Parando o trajeto ate as coordenadas</span><br/>" })
            isMoving[bot.username] = false;
          } else {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);

            const parts = message.split(" ");
            const x = parseFloat(parts[1]);
            const y = parseFloat(parts[2]);
            const z = parseFloat(parts[3]);

            const goal = new goals.GoalNear(x, y, z, 1);
            bot.pathfinder.setMovements(defaultMove);
            bot.pathfinder.setGoal(goal);
            bot.pathfinder.tickTimeout = 1;
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Indo ate as coordenadas fornecidas...</span><br/>" })
            isMoving[bot.username] = true;

            bot.on('goal_reached', function () {
              if (isMoving[bot.username]) {
                global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:green'>Cheguei nas coordenadas ${x}, ${y}, ${z}</span><br/>` })
                isMoving[bot.username] = false;
              }
            });
          }
        }
        else if (message.toLowerCase().startsWith("$move ")) {
          const parts = message.split(" ");
          const directions = parts[1].split("|");
          const duration = parts.length > 2 ? parseInt(parts[2]) : 1; // duração padrão em ticks se não especificado

          if (directions == '') {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Argumentos invalidos!</span><br/>" });
          }
          else {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Movendo ate as direções \"" + directions + "\" com a duração de " + duration + " ticks</span><br/>" });

            directions.forEach(direction => {
              switch (direction) {
                case 'jump':
                  bot.setControlState('jump', true);
                  break;
                case 'forward':
                  bot.setControlState('forward', true);
                  break;
                case 'back':
                  bot.setControlState('back', true);
                  break;
                case 'left':
                  bot.setControlState('left', true);
                  break;
                case 'right':
                  bot.setControlState('right', true);
                  break;
                case 'sprint':
                  bot.setControlState('sprint', true);
                  break;
                case 'sneak':
                  bot.setControlState('sneak', true);
                  break;
              }
            });

            // Desativar os controles após a duração especificada
            bot.waitForTicks(duration).then(() => {
              bot.clearControlStates();
            });
          }
        }
        else if (message.toLowerCase() == "$shift") {
          IsSneaking[bot.username] = !IsSneaking[bot.username]

          if (IsSneaking[bot.username]) {
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:green'>Shift Ativado</span><br/>" })
            bot.setControlState('sneak', true);
          }
          else {
            bot.setControlState('sneak', false);
            global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: "<br/><span style='color:red'>Shift desativado</span><br/>" })
          }
        }
        else if (message.toLowerCase().startsWith("$follow ")) {
          const playerName = message.split(" ")[1]; // Obtém o nome do jogador após o comando $follow

          if (!isFollowing[bot.username]) {
            const mcData = require('minecraft-data')(bot.version);
            const defaultMove = new Movements(bot, mcData);
            bot.pathfinder.setMovements(defaultMove);

            playerToFollow[bot.username] = bot.players[playerName];

            if (!playerToFollow[bot.username]) {
              console.log(`O jogador ${playerName} não foi encontrado!`);
              global.mainWindow.webContents.send('bot-message', {
                bot: bot.username,
                message: `<br/><span style='color:red'>O jogador ${playerName} não foi encontrado!</span><br/>`
              });
            } else {
              followInterval[bot.username] = setInterval(() => {
                if (playerToFollow[bot.username] && playerToFollow[bot.username].entity && playerToFollow[bot.username].entity.position) {
                  const goal = new goals.GoalFollow(playerToFollow[bot.username].entity, 1);
                  goal.endOnArrival = false; // O bot continuará seguindo mesmo após chegar ao jogador
                  bot.pathfinder.setGoal(goal);
                  bot.pathfinder.tickTimeout = 1;
                }
                else {
                  clearInterval(followInterval[bot.username]); // Para o intervalo
                  bot.pathfinder.setGoal(null); // Para de seguir o jogador
                  isFollowing[bot.username] = false;
                  global.mainWindow.webContents.send('bot-message', {
                    bot: bot.username,
                    message: `<br/><span style='color:red'>Follow desativado</span><br/>`
                  });
                }
              }, 100);

              isFollowing[bot.username] = true;
              global.mainWindow.webContents.send('bot-message', {
                bot: bot.username,
                message: `<br/><span style='color:green'>Seguindo ${playerName}</span><br/>`
              });
            }
          } else if (playerToFollow[bot.username] && playerToFollow[bot.username].username === playerName) {
            clearInterval(followInterval[bot.username]); // Para o intervalo
            bot.pathfinder.setGoal(null); // Para de seguir o jogador
            isFollowing[bot.username] = false;
            global.mainWindow.webContents.send('bot-message', {
              bot: bot.username,
              message: `<br/><span style='color:red'>Follow desativado</span><br/>`
            });
          }
        }
      }
      else {
        if (botUsername) {
          bot.chat(message)
        }
      }
    }
  })
  
  await sleep(1);
})

let botsSemAutoReconnect = []; // Nova lista

ipcMain.on('remove-bot', async (event, botUsername) => {
  botsSemAutoReconnect.push(botUsername); // Adicione o bot à lista
  const botsaarrayCopy = [...botsaarray];
  botsaarrayCopy.forEach((bot) => {
    if (bot.username == botUsername) {
      bot.end();
      const botsaIndex = botsaarray.indexOf(bot);
      if (botsaIndex > -1) {
        botsaarray.splice(botsaIndex, 1);
      }
    }
  });

  await sleep(1);
});

ipcMain.on('reco-bot', async (event, host, username, version, proxy, proxyType) => {
  const botExists = botsaarray.some(bot => bot.username === username);

  if (!botExists) {
    ipcMain.emit('connect-bot', null, { host: host, username: username, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType });
    await sleep(1);
  } else {
    const botsaarrayCopy = [...botsaarray];
    botsaarrayCopy.forEach(async (bot) => {
      if (bot.username == username) {
        botsSemAutoReconnect.push(username); // Adicione o bot à lista
        bot.end();
        const indexConectado = botsConectado.indexOf(username);
        if (indexConectado > -1) {
          botsConectado.splice(indexConectado, 1);
        }

        const indexArray = botsaarray.indexOf(bot);
        if (indexArray > -1) {
          botsaarray.splice(indexArray, 1);
        }
        await sleep(500);
        ipcMain.emit('connect-bot', null, { host: host, username: username, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType });
      }
    });
  }
});
