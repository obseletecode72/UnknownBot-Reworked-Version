const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const inventoryViewer = require('mineflayer-web-inventory')
const collectBlock = require('mineflayer-collectblock').plugin
const toolPlugin = require('mineflayer-tool').plugin
var Vec3 = require('vec3');

const crypto = require('crypto');
const dns = require('dns');
const util = require('util');
const Http = require('http')
const ProxyAgent = require('proxy-agent')
const atob = require('atob');
var Socks = require('socks').SocksClient;
const PNGImage = require('pngjs-image');
const fs = require('fs');
const path = require('path');
const url = require('url');
const unidecode = require('unidecode');
const Jimp = require('jimp');

let inventorywasopen = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

process.on('unhandledRejection', (reason, promise) => {
    if (reason.message !== '(mineflayer-web-inventory) INFO: mineflayer-web-inventory is not running') { // webinventory dev fix that shit verification, its just if(bot.webInventory.running) stop on bot 'end'
        // dont make nothing
    }
});

process.on('uncaughtException', (err) => {
    process.send({ type: 'error', data: 'Exceção não tratada capturada: ' + err.message });
    process.send({ type: 'error', data: 'Stack: ' + err.stack });
});

let bots = {};
var botsConectado = [];
let botsaarray = []
let botsSemAutoReconnect = [];
const botTimers = {};

// killaura part
var killAuraActive = {}
let attackInterval = {};
let killAuraDelay = 1;
let DistanceReach = 3;
// killaura part

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

// miner part
var miningState = {};
// miner part

let placedBlocks = new Set();
const ipPortRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]+$/;
let record = {};
let autoreconnect = false;
let fallcheckbypass = false;
let autoreconnectdelay = 0;

let captchaImages = {};

const resolveSrv = util.promisify(dns.resolveSrv);
const lookup = util.promisify(dns.lookup);

global.listadecommandos = ["$killaura", "$spammer", "$goto ", "$shift", "$move ", "$holditem", "$sethotbarslot ", "$listslots", "$setinventoryslot ", "$dropall", "$inventoryinterface", "$follow ", "$miner ", "$miner2 ", "$clickentity"]
global.Syntax = `
<span style="color:yellow">Lista de comandos existentes:</span><br/>
<span style="color:white">- KillAura, Ataca todas entidades ao redor:</span> <span style="color:orange">$killaura</span><br/>
<span style="color:white">- Follow, Segue algum jogador pelo nome:</span> <span style="color:orange">$follow [nome]</span><br/>
<span style="color:white">- Miner, Minera blocos pelo nome do bloco:</span> <span style="color:orange">$miner [bloco]</span><br/>
<span style="color:white">- Miner2, Minera blocos de coordenada tal ate coordenada tal:</span> <span style="color:orange">$miner2 [x] [y] [z] [x2] [y2] [z2]</span><br/>
<span style="color:white">- Goto, Anda ate as coordenadas fornecidas:</span> <span style="color:orange">$goto [x] [y] [z]</span><br/>
<span style="color:white">- Shift, Fica agachado:</span> <span style="color:orange">$shift</span><br/>
<span style="color:white">- SetHotBarSlot, Seta o slot da sua hotbar para o fornecido (0-8):</span> <span style="color:orange">$sethotbarslot [numero]</span><br/>
<span style="color:white">- SetInventorySlot, Seta o slot da janela aberta para o fornecido:</span> <span style="color:orange">$setinventoryslot [numero] [drop]</span><br/>
<span style="color:white">- ListSlots, Mostra a quantidade de slots total da janela aberta:</span> <span style="color:orange">$listslots</span><br/>
<span style="color:white">- DropAll, Dropa todos itens do inventario:</span> <span style="color:orange">$dropall</span><br/>
<span style="color:white">- InventoryInterface, Mostra seu inventario em outra janela:</span> <span style="color:orange">$inventoryinterface</span><br/>
<span style="color:white">- HoldItem, Clica o botao esquerdo e solta com o item que esta na mao:</span> <span style="color:orange">$holditem</span><br/>
<span style="color:white">- ClickEntity, Clica o botao direito e solta com na entidade mais proxima:</span> <span style="color:orange">$clickentity</span><br/>
<span style="color:white">- Spammer, Spamma mensagens:</span> <span style="color:orange">$spammer</span><br/>
<span style="color:white">- Move, Faz o bot se mover por um tempo determinado. (As direções podem ser combinadas com o caractere "|":</span> <span style="color:orange">$move [direções jump,forward,back,left,right,sneak,sprint] [duração em ticks]
</span><br/>
`

// Objeto para armazenar as configurações de spammer para cada bot
const botSpammers = {};

function initBotSpammer(botUsername) {
    if (!botSpammers[botUsername]) {
        botSpammers[botUsername] = {
            active: false,
            message: '',
            randomTell: false,
            delay: 1000,
            antispam: {
                active: false,
                length: 0
            }
        };
    }
}

function generateRandomString(length) {
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0, length);
}

function startSpammer(bot) {
    const spammer = botSpammers[bot.username];
    if (!spammer || !spammer.active) return;

    let message = spammer.message;
    if (spammer.antispam.active) {
        const antispamString = generateRandomString(spammer.antispam.length);
        message += ` [${antispamString}]`;
    }

    if (spammer.randomTell) {
        const players = Object.keys(bot.players);
        if (players.length > 0) {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            bot.chat(`/tell ${randomPlayer} ${message}`);
        }
    } else {
        bot.chat(message);
    }

    setTimeout(() => startSpammer(bot), spammer.delay);
}

function handleSpammerCommand(bot, args) {
    initBotSpammer(bot.username);
    const spammer = botSpammers[bot.username];

    switch(args[1]) {
        case undefined:
            spammer.active = !spammer.active;
            if (spammer.active) {
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Spammer ativado!</span><br/>` } });
                startSpammer(bot);
            } else {
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Spammer Desativado!</span><br/>` } });
            }
            break;
        
        case 'message':
            spammer.message = args.slice(2).join(' ').replace(/^"(.*)"$/, '$1');
            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Mensagem do spammer definida: ${spammer.message}</span><br/>` } });
            break;
        
        case 'random_tell':
            spammer.randomTell = !spammer.randomTell;
            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Modo random tell ${spammer.randomTell ? 'ativado' : 'desativado'}!</span><br/>` } });
            break;
        
        case 'delay':
            if (args[2] && !isNaN(args[2])) {
                spammer.delay = parseInt(args[2]);
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Delay do spammer definido para ${spammer.delay}ms</span><br/>` } });
            }
            break;
        
        case 'antispam':
            if (args[2] && !isNaN(args[2])) {
                const length = parseInt(args[2]);
                spammer.antispam.active = length > 0;
                spammer.antispam.length = length;
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Antispam ${spammer.antispam.active ? 'ativado' : 'desativado'} com comprimento ${length}</span><br/>` } });
            } else {
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Uso correto: $spammer antispam [tamanho]</span><br/>` } });
            }
            break;
        
        default:
            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Comando $spammer inválido!</span><br/>` } });
    }
}

let ClickTextDetect = false;
let textFromFile = '';

function calculateDistance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function findNearestEntity(bot, onlyplayer) {
    let nearestEntity = null;
    let nearestDistance = Infinity;

    for (const entityId in bot.entities) {
        const entity = bot.entities[entityId];

        if (entity === undefined) { // idk why some entities are undefined, thats so cringe
            continue;
        }

        if (entity === bot.entity || 
            entity.id === bot.entity.id || 
            (entity.username && entity.username === bot.username)) {
            continue;
        }

        if(onlyplayer)
        {
            if(entity.type !== 'player')
            {
                continue;
            }
        }

        if(entity.type === 'player')
        {
            if(botsConectado.includes(entity.username))
            {
                continue;
            }
        }
        
        if (entity.position) {
            try {
                const distance = calculateDistance(bot.entity.position, entity.position);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEntity = entity;
                }
            } catch (error) { }
        }
    }

    return nearestEntity;
}

function distanceTo(position1, position2) {
    const dx = position1.x - position2.x;
    const dy = position1.y - position2.y;
    const dz = position1.z - position2.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function processClickEvent(bot, message) {
    if (message && message.json && Array.isArray(message.json.extra)) {
        message.json.extra.forEach((extra) => {
            if (extra && extra.clickEvent) {
                if (unidecode(extra.text) === unidecode(textFromFile)) {
                    bot.chat(extra.clickEvent.value);
                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Mensagem clicada!</span><br/>" } });
                }
            }
        });
    }
}

async function minerar(bot, blockType) {
    if (!miningState[bot.username]) {
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const blockToMine = mcData.blocksByName[blockType];
    if (!blockToMine) {
        process.send({ type: 'log', data: 'Não conheço o bloco ' + blockType});
        return;
    }

    const block = bot.findBlock({
        matching: blockToMine.id,
        maxDistance: 16,
    });

    if (!block) {
        process.send({ type: 'log', data: 'Não encontrei nenhum bloco de ' + blockType + 'próximo.'});
        miningState[bot.username] = false;
        return;
    }

    process.send({ type: 'log', data: 'Encontrei um bloco de ' + blockType + '.' + ' Começando a minerar.'});

    const miningPromise = bot.collectBlock.collect(block);

    const checkInterval = setInterval(() => {
        if (!miningState[bot.username]) {
            bot.pathfinder.setGoal(null);
            clearInterval(checkInterval);
        }
    }, 100);

    try {
        await miningPromise;
        clearInterval(checkInterval);
        if (miningState[bot.username]) {
            process.send({ type: 'log', data: 'Minerado um bloco de ' + blockType + '.'});
            minerar(bot, blockType);
        }
    } catch (err) {
        process.send({ type: 'error', data: JSON.stringify(err)});
        miningState[bot.username] = false;
        clearInterval(checkInterval);
    }
}

var globalParkourMode = false;
var globalBlockPlacingAllowed = true;

async function minerar2(bot, x1, y1, z1, x2, y2, z2) {
    if (!miningState[bot.username]) {
        return;
    }

    [x1, x2] = [Math.min(x1, x2), Math.max(x1, x2)];
    [y1, y2] = [Math.min(y1, y2), Math.max(y1, y2)];
    [z1, z2] = [Math.min(z1, z2), Math.max(z1, z2)];

    for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
            for (let z = z1; z <= z2; z++) {
                if (!miningState[bot.username]) {
                    return;
                }

                const block = bot.blockAt(new Vec3(x, y, z));
                if (block && block.name !== 'air') {
                    await minerarBloco(bot, block);
                }
            }
        }
    }

    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Mineraçao concluida!</span><br/>` } });
}

async function minerarBloco(bot, block) {
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    defaultMove.allowParkour = globalParkourMode;
    if(!globalBlockPlacingAllowed)
    {
        defaultMove.placeCost = Number.MAX_SAFE_INTEGER;
    }

    bot.pathfinder.setMovements(defaultMove);

    const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, 3);

    try {
        await bot.pathfinder.goto(goal);
    } catch (error) {
        process.send({ type: 'error', data: 'Não foi possível alcançar o bloco em: ' + block.position + ': ' + error});
        return;
    }

    try {
        await bot.tool.equipForBlock(block, {});
        await bot.dig(block);
        process.send({ type: 'log', data: 'Bloco minerado em ' + block.position});
    } catch (error) {
        process.send({ type: 'error', data: 'Erro ao minerar o bloco em' + block.position + ' : ' + error});
    }
}

function iniciarMineracao(bot, x1, y1, z1, x2, y2, z2) {
    miningState[bot.username] = true;
    minerar2(bot, x1, y1, z1, x2, y2, z2);
}

function pararMineracao(bot) {
    miningState[bot.username] = false;
}

function processMinecraftCodes(message) {
    if (typeof message !== 'string') {
        process.send({ type: 'error', data: 'message deve ser uma string' });
        return message;
    }

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


function processMessage(message) {
    if (typeof message === 'string') {
        return escapeHtml(message);
    }

    if (message.translate) {
        return processTranslate(message);
    }

    let fullMessage = message.text ? escapeHtml(message.text) : '';

    if (Array.isArray(message.extra)) {
        message.extra.forEach((extraMessage) => {
            fullMessage += ' ' + processMessage(extraMessage);
        });
    }

    let color = message.color ? `color: ${minecraftColorToHtml(message.color)};` : '';
    let fontWeight = message.bold ? 'font-weight: bold;' : '';

    return `<span style="${color}${fontWeight}">${fullMessage}</span>`;
}

function processTranslate(message) {
    let template = message.translate || '';
    let parts = [];

    if (Array.isArray(message.with)) {
        parts = message.with.map(part => {
            if (typeof part === 'object' && part.text) {
                let hover = part.hoverEvent ? ` data-hover="${escapeHtml(JSON.stringify(part.hoverEvent))}"` : '';
                let click = part.clickEvent ? ` data-click="${escapeHtml(JSON.stringify(part.clickEvent))}"` : '';
                return `<span${hover}${click}>${escapeHtml(part.text)}</span>`;
            }
            return escapeHtml(String(part));
        });
    }

    let result = template.replace(/%s/g, () => parts.shift() || '');

    if (!template && parts.length > 0) {
        result = parts.join(' ');
    }

    let color = message.color ? `color: ${minecraftColorToHtml(message.color)};` : '';

    return `<span class="minecraft-message" style="${color}">${result}</span>`;
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
        process.send({ type: 'error', data: err});
    }
    return null;
}

function addBlockToChunk(chunk, blockType, position) {
    if (!chunk) {
        process.send({ type: 'error', data: 'Chunk is undefined.'});
        return;
    }
    if (typeof chunk.setBlock !== 'function') {
        process.send({ type: 'error', data: 'Chunk does not have a setBlock method.'});
        return;
    }

    const newBlock = {
        type: blockType,
        metadata: 0,
        light: 15,
        skyLight: 15,
    };

    try {
        chunk.setBlock(position.x, position.y, position.z, newBlock);
    } catch (error) {
        process.send({ type: 'error', data: 'Error while setting block in chunk: ' + error});
    }
}

async function head_captcha_solver_2(bot, window) {
    let headCount = 0;
    let urls = {};
    let slots = {};
    let images = {};

    for (let i = 0; i < window.slots.length; i++) {
        let slot = window.slots[i];
        if (slot && slot.nbt) {
            if (slot.name === 'player_head' || slot.name === 'skull') {
                headCount++;
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
                            slots[url] = i;
                        }
                    } catch (e) {
                        process.send({ type: 'error', data: 'Erro ao analisar a string decodificada em JSON: ' + e});
                    }
                }
            }
        }
    }

    if (headCount < 3) {
        return;
    }

    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA-2]</span> <span style='color:yellow'>Captcha de cabeça detectado KKKKKKKKKKKKKKKKKKKKKK, que bosta heim, quem que usa isso hoje em dia</span><br/> " } });

    for (let url in urls) {
        try {
            images[url] = await Jimp.read(url);
        } catch (e) {
            process.send({ type: 'error', data: 'Erro ao carregar a imagem: ' + e});
        }
    }

    let uniqueUrl = false;
    for (let url1 in images) {
        let isUnique = true;
        for (let url2 in images) {
            if (url1 !== url2) {
                let diff = Jimp.diff(images[url1], images[url2]);
                if (diff.percent < 0.1) {
                    isUnique = false;
                    break;
                }
            }

            if (isUnique) {
                uniqueUrl = url1;
                break;
            }
        }
    }

    if (uniqueUrl) {
        let slotIndex = slots[uniqueUrl];
        bot.clickWindow(slotIndex, 0, 0);
        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA-2]</span> <span style='color:green'>Pronto eu resolvi esse captcha de bosta ai</span><br/> " } });
    } else {
        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA-2]</span> <span style='color:red'>Vish fudeu nao encontrei nenhuma URL unica pra esse captcha fudido</span><br/> " } });
    }
}

async function head_captcha_solver(bot, window) {
    let headCount = 0;
    let urls = {};
    let slots = {};
    let images = {};

    for (let i = 0; i < window.slots.length; i++) {
        let slot = window.slots[i];
        if (slot && slot.nbt) {
            if (slot.name === 'player_head' || slot.name === 'skull') {
                headCount++;
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
                            slots[url] = i;
                        }
                    } catch (e) {
                        process.send({ type: 'error', data: 'Erro ao analisar a string decodificada em JSON: ' + e});
                    }
                }
            }
        }
    }

    if (headCount < 3) {
        return;
    }

    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:yellow'>Captcha de cabeça detectado KKKKKKKKKKKKKKKKKKKKKK, que bosta heim, quem que usa isso hoje em dia</span><br/> " } });

    for (let url in urls) {
        try {
            images[url] = await Jimp.read(url);
        } catch (e) {
            process.send({ type: 'error', data: 'Erro ao carregar a imagem: ' + e});
        }
    }

    let uniqueUrl = false;
    for (let url1 in images) {
        let isUnique = true;
        for (let url2 in images) {
            if (url1 !== url2) {
                let diff = Jimp.diff(images[url1], images[url2]);
                if (diff.percent < 0.1) {
                    isUnique = false;
                    break;
                }
            }

            if (isUnique) {
                uniqueUrl = url1;
                break;
            }
        }
    }

    if (uniqueUrl) {
        let slotIndex = slots[uniqueUrl];
        bot.clickWindow(slotIndex, 0, 0);
        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:green'>Pronto eu resolvi esse captcha de bosta ai</span><br/> " } });
    } else {
        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:red'>Vish fudeu nao encontrei nenhuma URL unica pra esse captcha fudido</span><br/> " } });
        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:orange'>[HEADCAPTCHA]</span> <span style='color:yellow'>Tentando outro metodo...</span><br/> " } });
        head_captcha_solver_2(bot, window)
    }
}

process.on('message', async (process_msg_) => {
    if (process_msg_.event === 'ClickText') {
        const { ClickTextDetectFromVar, textFromFileFromVar } = process_msg_.data;
        ClickTextDetect = ClickTextDetectFromVar;
        textFromFile = textFromFileFromVar;
    }
    if (process_msg_.event === 'connect-bot') {
        const { host, username, version, proxy, proxyType } = process_msg_.data;

        if (botsConectado.includes(username)) return
        let bot;

        if (proxy && proxy.ip && proxy.port) {
            let user = proxy.user || '';
            let password = proxy.password || '';

            if ((proxyType === '4' || proxyType === '5')) {
                if (!user && !password) {
                    process.send({ type: 'log', data: 'proxy, no pass, no user, type: ' + proxyType });
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});
                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                    process.send({ type: 'error', data: err });
                                    return
                                }
                                client.setSocket(info.socket)
                                client.emit('connect')
                            })
                        },
                        username: username,
                        version: version
                    });
                } else if (user && !password) {
                    process.send({ type: 'log', data: 'proxy, no pass, type: ' + proxyType });
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});

                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                    userId: proxy.user
                                },
                                command: 'connect',
                                destination: {
                                    host: record ? record.ip : host,
                                    port: record ? record.port : 25565
                                }
                            }, (err, info) => {
                                if (err) {
                                    process.send({ type: 'error', data: err});
                                    return
                                }
                                client.setSocket(info.socket)
                                client.emit('connect')
                            })
                        },
                        username: username,
                        version: version
                    });
                } else if (user && password) {

                    process.send({ type: 'log', data: 'proxy, type: ' + proxyType});
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});

                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                    process.send({ type: 'error', data: err});
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
            } else if (proxyType === 'http') {
                if (!user && !password) {

                    process.send({ type: 'log', data: 'proxy, no pass, no user, type: ' + proxyType});
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});
                    
                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                process.send({ type: 'error', data: err});
                                const indexConectado = botsConectado.indexOf(username);
                                if (indexConectado > -1) {
                                    botsConectado.splice(indexConectado, 1);
                                }

                                const indexArray = botsaarray.indexOf(bot);
                                if (indexArray > -1) {
                                    botsaarray.splice(indexArray, 1);
                                }

                                process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
                                process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
                                process.send({ type: 'webcontents', event: 'bot-disconnected', data: username });
                            })
                        },
                        agent: new ProxyAgent({ protocol: 'http', host: proxy.ip, port: proxy.port }),
                        username: username,
                        version: version
                    })
                } else if (user && !password) {
                    process.send({ type: 'log', data: 'proxy, no pass, type: ' + proxyType});
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});

                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                process.send({ type: 'error', data: err});
                                const indexConectado = botsConectado.indexOf(username);
                                if (indexConectado > -1) {
                                    botsConectado.splice(indexConectado, 1);
                                }

                                const indexArray = botsaarray.indexOf(bot);
                                if (indexArray > -1) {
                                    botsaarray.splice(indexArray, 1);
                                }

                                process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
                                process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
                                process.send({ type: 'webcontents', event: 'bot-disconnected', data: username });
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
                } else if (user && password) {
                    process.send({ type: 'log', data: 'proxy, type: ' + proxyType});
                    process.send({ type: 'log', data: 'targeted proxy: ' + proxy.ip + ":" + proxy.port});

                    if (ipPortRegex.test(host)) {
                        const [ip, port] = host.split(':');
                        record.ip = ip;
                        record.port = parseInt(port);
                    } else {
                        record = await getSRVRecord(host);
                        if (!record) {
                            process.send({ type: 'error', data: 'SRV Record nao encontrado, bot anulado...'});
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
                                process.send({ type: 'error', data: err});
                                const indexConectado = botsConectado.indexOf(username);
                                if (indexConectado > -1) {
                                    botsConectado.splice(indexConectado, 1);
                                }

                                const indexArray = botsaarray.indexOf(bot);
                                if (indexArray > -1) {
                                    botsaarray.splice(indexArray, 1);
                                }

                                process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
                                process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
                                process.send({ type: 'webcontents', event: 'bot-disconnected', data: username });
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
            }
        } else {
            process.send({ type: 'log', data: 'bot without proxy'});
            bot = mineflayer.createBot({ host, username, version: version, auth: 'offline' });
        }

        bot.commandChecks = {}; // por que sim!

        bot.loadPlugin(pathfinder);
        bot.loadPlugin(collectBlock);
        bot.loadPlugin(toolPlugin);

        const pluginDir = path.resolve(__dirname, './pluginsUBBOT');

        fs.access(pluginDir, fs.constants.F_OK, async (err) => {
            if (err) {
                process.send({ type: 'error', data: 'Diretório ' + pluginDir + ' não existe.'});
                return;
            }

            fs.readdir(pluginDir, async (err, files) => {
                if (err) {
                    process.send({ type: 'error', data: 'Não foi possível ler o diretório de plugins: ' + err});
                    return;
                }

                if (files.length === 0) {
                    process.send({ type: 'log', data: 'Nenhum plugin para carregar.' });
                    return;
                }

                for (let file of files) {
                    if (path.extname(file) === '.js') {
                        process.send({ type: 'log', data: 'Carregando plugin: ' + file});
                        try {
                            const pluginPath = path.resolve(pluginDir, file);
                            const pluginUrl = url.pathToFileURL(pluginPath);
                            const plugin = await import(pluginUrl);
                            bot.loadPlugin(plugin.default);
                        } catch (err) {
                            process.send({ type: 'error', data: 'Erro ao carregar o plugin: ' + file + ': ' + err});
                        }
                    }
                }
            });
        });

        bot.on('connect', async () => {
            botTimers[username] = { isConnecting: true };

            process.send({ type: 'webcontents', event: 'bot-connecting', data: username });
            process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'connecting' } });

            process.send({ type: 'log', data: `connecting para ${username}` });

            botTimers[username].timer = setTimeout(() => {
                if (botTimers[username] && botTimers[username].isConnecting) {
                    process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
                    process.send({ type: 'log', data: `status desconectado após timeout para ${username}` });
                    delete botTimers[username];
                }
            }, 20000); // 20 segundos
        });

        bot.on('login', () => {
            if (botTimers[username] && botTimers[username].isConnecting) {
                clearTimeout(botTimers[username].timer);
                botTimers[username].isConnecting = false;
        
                if (!botsConectado.includes(username)) {
                    botsConectado.push(username);
                    botsaarray.push(bot);
                    process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
                    process.send({ type: 'webcontents', event: 'bot-connected', data: username });
                    process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'connected' } });
        
                    const index = botsSemAutoReconnect.indexOf(username);
                    if (index > -1) {
                        botsSemAutoReconnect.splice(index, 1);
                    }
        
                    process.send({ type: 'log', data: `logged para ${username}` });
                }
            }
        });

        bot.on('blockUpdate', (oldBlock, newBlock) => {
            if (newBlock && !oldBlock) {
                placedBlocks.add(newBlock.position.toString());
            }
            else if (!newBlock && oldBlock) {
                placedBlocks.delete(oldBlock.position.toString());
            }
        });

        const Chunk = require('prismarine-chunk')(bot.version);

        bot._client.on('multi_block_change', (packet) => {
            if (fallcheckbypass) {
                const chunkPos = new Vec3(packet.chunkX, 0, packet.chunkZ);
                let chunk = bot.world.getColumnAt(chunkPos);
        
                if (!chunk) {
                    chunk = new Chunk();
                    bot.world.setColumn(chunkPos.x, chunkPos.z, chunk);
                }
        
                packet.records.forEach((record) => {
                    const x = record.horizontalPos >> 4;
                    const z = record.horizontalPos & 0xF;
                    const y = record.y;
                    const blockPos = new Vec3(x, y, z);
                    if (chunk) {
                        addBlockToChunk(chunk, record.blockId, blockPos);
                    } else {
                        process.send({ type: 'error', data: 'Chunk is undefined when adding block.'});
                    }
                });
            }
        });
        
        bot._client.on('block_change', (packet) => {
            if (fallcheckbypass) {
                const blockPos = new Vec3(packet.location.x, packet.location.y, packet.location.z);
                bot.entity.position = blockPos;
        
                const chunkPos = new Vec3(Math.floor(blockPos.x / 16), 0, Math.floor(blockPos.z / 16));
                let chunk = bot.world.getColumnAt(chunkPos);
        
                if (!chunk) {
                    chunk = new Chunk();
                    bot.world.setColumn(chunkPos.x, chunkPos.z, chunk);
                }
        
                const relativePos = new Vec3(blockPos.x % 16, blockPos.y, blockPos.z % 16);
                if (chunk) {
                    addBlockToChunk(chunk, packet.type, relativePos);
                } else {
                    process.send({ type: 'error', data: 'Chunk is undefined when changing block.'});
                }
            }
        });        

        bot.on('end', async () => {
            process.send({ type: 'log', data: `deleted para ${username}` });

            const indexConectado = botsConectado.indexOf(username);
            if (indexConectado > -1) {
                botsConectado.splice(indexConectado, 1);
            }
        
            const indexArray = botsaarray.indexOf(bot);
            if (indexArray > -1) {
                botsaarray.splice(indexArray, 1);
            }
        
            process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
            process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
            process.send({ type: 'webcontents', event: 'bot-disconnected', data: username });
        
            process.send({ type: 'bot-end', username: username });
        
            if (miningState[username]) {
                miningState[username] = false;
            }
        
            if (killAuraActive[username]) {
                killAuraActive[username] = false;
            }
        
            if (IsSneaking[username]) {
                IsSneaking[username] = false;
            }
        
            if (followInterval[username]) {
                clearInterval(followInterval[username]);
                isFollowing[username] = false;
            }

            if (botSpammers[bot.username]) {
                botSpammers[bot.username].active = false;
                delete botSpammers[bot.username];
            }
        
            if (autoreconnect) {
                process.send({ type: 'log', data: 'auto reconect ativado - esperando 50ms' });
                await sleep(50); // esperar ficar tudo ok para o autoreconnect
                await sleep(autoreconnectdelay); // esperar delay do autoreconnect
                process.send({ type: 'log', data: `auto reconect ativado - esperando ${autoreconnectdelay}ms` });
                if (!botsConectado.includes(username) && !botsSemAutoReconnect.includes(username)) {
                    process.send({ type: 'log', data: 'tentando reconect' });
                    process.send({ type: 'ipcMain', event: 'connect-bot', data: { host: host, username: username, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType } });
                }
            }
        
            if (botTimers[username]) {
                clearTimeout(botTimers[username].timer);
                delete botTimers[username];
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

                    captchaImages[bot.username] = blob.toString('base64');

                    process.send({ type: 'electron', action: 'createCaptchaWindow', data: { botusername: bot.username, captchaImage: captchaImages[bot.username] } });

                    captchaImages[bot.username] = null; // null memory
                });
            }
        });

        bot.on('error', (err) => {
            process.send({ type: 'log', data: 'bot_on_error: ' + err});
        })

        bot.on('kicked', (reason) => {
            let reasonObj;
        
            try {
                reasonObj = JSON.parse(reason);
            } catch (e) {
                reasonObj = reason;
            }
        
            process.send({ type: 'log', data: 'bot_on_kicked_reason_obj: ' + JSON.stringify(reasonObj)});
        
            let htmlMessage = '';
            htmlMessage += `<br/><p>Kick:</p>`;
        
            function extractText(obj) {
                let result = [];
                if (obj.type === 'compound' && obj.value) {
                    if (obj.value.extra && obj.value.extra.type === 'list' && Array.isArray(obj.value.extra.value.value)) {
                        obj.value.extra.value.value.forEach(item => {
                            if (typeof item === 'string') {
                                result.push({ text: item, color: 'white' });
                            }
                        });
                    }
                    if (obj.value.text && obj.value.text.type === 'string') {
                        result.push({ text: obj.value.text.value, color: 'white' });
                    }
                }
                return result;
            }
        
            let messages = extractText(reasonObj).filter(item => item.text.trim() !== '');
        
            messages.forEach((message, index) => {
                let splitText = message.text.split('\n');
                splitText.forEach((text, i) => {
                    if (text !== '') {
                        let addBreakLine = i < splitText.length - 1 || message.text.endsWith('\n');
                        htmlMessage += `<span style="color: ${message.color};">${text}${addBreakLine ? '<br/>' : ''}</span>`;
                    }
                });
            });
        
            if (messages.length === 0) {
                let message = processMinecraftCodes(typeof reasonObj === 'string' ? reasonObj : JSON.stringify(reasonObj));
                htmlMessage += `<br/><p>${message}</p>`;
            }
        
            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: username, message: htmlMessage } });
        
            process.send({ type: 'log', data: 'bot_on_kicked_html_message: ' + htmlMessage});
        
        
            const indexConectado = botsConectado.indexOf(username);
            if (indexConectado > -1) {
                botsConectado.splice(indexConectado, 1);
            }
        
            const indexArray = botsaarray.indexOf(bot);
            if (indexArray > -1) {
                botsaarray.splice(indexArray, 1);
            }
        
            process.send({ type: 'webcontents', event: 'botsarraytohtml', data: botsConectado });
            process.send({ type: 'webcontents', event: 'update-bot-status', data: { bot: username, status: 'disconnected' } });
            process.send({ type: 'webcontents', event: 'bot-disconnected', data: username });

            if (botTimers[username]) {
                clearTimeout(botTimers[username].timer);
                delete botTimers[username];
            }
        });        

        bot.on('message', (message) => {
            let fullMessage = processMessage(message);
            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: fullMessage } });
            
            if (ClickTextDetect) {
                processClickEvent(bot, message);
            }
        });

        bot.on('title', (title) => {
            try {
                let fullTitle = processTitle(title);
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: fullTitle } });
            } catch (error) {
                process.send({ type: 'error', data: 'Error: ' + error });
            }
        });

        bot._client.on('packet', async (data, meta) => {
            try {
                if (parseFloat(bot?.version ?? '0') >= 1.17 && (meta.name === 'set_title_text' || meta.name === 'set_title_subtitle')) {
                    bot?.emit('title', data.text);
                }
            } catch (error) {
                process.send({ type: 'error', data: 'Error: ' + error });
            }
        })

        bot.once('windowOpen', async (window) => {
            head_captcha_solver(bot, window);
        });

        bots[bot.username] = bot
        botsa = bot
    }
    if (process_msg_.event === 'send-message') {
        const { botUsername, message } = process_msg_.data;

        botsaarray.forEach((bot) => {
            if (bot.username == botUsername) {
                for (let checkCommand of Object.values(bot.commandChecks)) {
                    checkCommand(message);
                }
                if (message.startsWith('$')) {
                    if (!global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:red'>Comando Inexistente</span><br><br/>" + global.Syntax } });
                    }
                    else if (message.toLowerCase().startsWith("$clickentity")) {
                        const playerFilter = (entity) => (!botsConectado.includes(entity.username) && entity.displayName !== 'Armor Stand');
                        const entity = bot.nearestEntity(playerFilter);

                        if (entity) {
                            bot.lookAt(entity.position.offset(0, entity.height, 0));
                            bot.attack(entity)
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Entidade clicada!</span><br/>` } });
                        } else {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Nenhuma entidade proxima para clicar!</span><br/>` } });
                        }
                    }
                    else if (message.toLowerCase().startsWith("$sethotbarslot ")) {
                        const slotarg = message.split(' ');
                        const slotNumber = parseInt(slotarg[1]);

                        if (isNaN(slotNumber) || slotNumber < 0 || slotNumber > 8) {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Valor invalido!</span><br/>` } });
                        }
                        else {
                            bot.setQuickBarSlot(slotNumber);
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Slot da Hotbar setado para ${slotNumber}!</span><br/>` } });
                        }
                    }
                    else if (message.toLowerCase() == "$listslots") {
                        if (bot.currentWindow) {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>A janela atual tem ${bot.currentWindow.slots.length} slots!</span><br/>` } });
                        } else {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Nao ha janela aberta</span><br/>` } });
                        }
                    }
                    else if (message.toLowerCase() == "$holditem") {
                        bot.activateItem();
                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Item clicado!</span><br/>` } });

                        if (bot.usingHeldItem) {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Item usavel, parando de clicar!</span><br/>` } });
                            bot.deactivateItem();
                        }
                    }
                    else if (message.toLowerCase().startsWith("$setinventoryslot ")) {
                        const slotarg = message.split(' ');
                        const slotNumber = parseInt(slotarg[1]);
                        const action = slotarg[2];

                        if (isNaN(slotNumber)) {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Valor invalido!</span><br/>` } });
                        }
                        else if (action === 'drop') {
                            (async () => {
                                const item = bot.inventory.slots[slotNumber];
                                if (item) {
                                    await bot.tossStack(item);
                                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Dropando no slot do inventario ${slotNumber}!</span><br/>` } });
                                }
                            })();
                        }
                        else {
                            bot.clickWindow(slotNumber, 0, 0);
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Clicando no slot do inventario ${slotNumber}!</span><br/>` } })
                        }
                    }
                    else if (message.toLowerCase().startsWith("$dropall")) {
                        (async () => {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Dropando todos itens!</span><br/>` } })
                            var inventoryItemCount = bot.inventory.items().length;
                            if (inventoryItemCount === 0) return;

                            while (inventoryItemCount > 0) {
                                const item = bot.inventory.items()[0];
                                await bot.tossStack(item);
                                inventoryItemCount--;
                            }
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Todos itens dropados!</span><br/>` } })
                        })();
                    }

                    else if (message.toLowerCase().startsWith("$inventoryinterface")) {
                        inventorywasopen = !inventorywasopen;

                        if (inventorywasopen) {
                            let options = {
                                port: 9531,
                                startOnLoad: false
                            }
                            inventoryViewer(bot, options)
                        }

                        if (inventorywasopen) {
                            if (!bot.webInventory.isRunning) {
                                bot.webInventory.start();
                                process.send({ type: 'electron', action: 'createWebInventoryWindow', data: { bot: bot.username } });
                                isWindowClosing = false;
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Interface sendo aberta!</span><br><br/>" } });
                            }
                        } else {
                            for (let bot of botsaarray) {
                                if (bot.webInventory && bot.webInventory.isRunning) {
                                    bot.webInventory.stop();
                                }
                            }
                            process.send({ type: 'closewindowinventory' });
                        }
                    }
                    else if (message.toLowerCase().startsWith("$miner ")) {
                        (async () => {
                            const args = message.split(' ')
                            const blockId = args[1];
                            miningState[bot.username] = !miningState[bot.username];
                            if (miningState[bot.username]) {
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Miner ativado!</span><br/>` } })
                            } else {
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Miner Desativado!</span><br/>` } })
                            }
                            await minerar(bot, blockId);
                        })();
                    }
                    else if (message.toLowerCase().startsWith('$spammer')) {
                        const args = message.split(' ');
                        handleSpammerCommand(bot, args);
                    }
                    else if (message.toLowerCase().startsWith("$miner2 ")) {
                        const args = message.split(' ');
                        const command = args[1].toLowerCase();
                
                        switch (command) {
                            case 'parkour':
                                globalParkourMode = !globalParkourMode;
                                const parkourStatus = globalParkourMode ? 'ativado' : 'desativado';
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Modo Parkour ${parkourStatus}!</span><br/>` } });
                                break;
                
                            case 'placeblock':
                                globalBlockPlacingAllowed = !globalBlockPlacingAllowed;
                                const blockPlacingStatus = globalBlockPlacingAllowed ? 'permitida' : 'proibida';
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:orange'>Colocação de blocos ${blockPlacingStatus}!</span><br/>` } });
                                break;
                
                            default:
                                if (args.length === 7) {
                                    const [startX, startY, startZ, endX, endY, endZ] = args.slice(1).map(Number);
                                    if (!miningState[bot.username]) {
                                        iniciarMineracao(bot, startX, startY, startZ, endX, endY, endZ);
                                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Miner ativado!</span><br/>` } });
                                    } else {
                                        pararMineracao(bot);
                                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Miner Desativado!</span><br/>` } });
                                    }
                                } else {
                                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Comando inválido. Use $miner [parkour|placeblock] ou $miner x1 y1 z1 x2 y2 z2</span><br/>` } });
                                }
                        }
                    }
                    else if (message.toLowerCase().startsWith("$killaura")) {
                        const args = message.split(' ');
                        
                        if (args.length === 1) {
                            // Ativa ou desativa o KillAura
                            killAuraActive[bot.username] = !killAuraActive[bot.username];
                            
                            if (killAuraActive[bot.username]) {
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>KillAura ativado</span><br/>" } });
                                attackInterval[bot.username] = setInterval(() => {
                                    const nearestEntity = findNearestEntity(bot, true);
                                    if (nearestEntity) {
                                        const distance = distanceTo(bot.entity.position, nearestEntity.position);
                                        if (distance < DistanceReach) {
                                            bot.lookAt(nearestEntity.position.offset(0, nearestEntity.height, 0));
                                            bot.attack(nearestEntity, true);
                                        }
                                    }
                                }, killAuraDelay);
                            } else {
                                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:red'>KillAura desativado</span><br/>" } });
                                clearInterval(attackInterval[bot.username]);
                            }
                        } else if (args.length === 3) {
                            const command = args[1].toLowerCase();
                            
                            switch (command) {
                                case 'timems':
                                    killAuraDelay = parseInt(args[2]);
                                    if (killAuraDelay <= 0) {
                                        killAuraDelay = 1;
                                    }
                                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Delay do KillAura definido para ${killAuraDelay}ms</span><br/>` } });
                                    break;
                    
                                case 'distance':
                                    DistanceReach = parseInt(args[2]);
                                    if (DistanceReach <= 0 || DistanceReach > 6 || isNaN(DistanceReach)) {
                                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Valor inválido! Distância setada para 3m</span><br/>` } });
                                        DistanceReach = 3;
                                    } else {
                                        process.send({ type: 'log', data: DistanceReach});
                                        process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Distância do KillAura definida para ${DistanceReach}m</span><br/>` } });
                                    }
                                    break;
                    
                                default:
                                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Comando inválido. Use $killaura, $killaura timems [valor], ou $killaura distance [valor]</span><br/>` } });
                            }
                        } else {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:red'>Comando inválido. Use $killaura, $killaura timems [valor], ou $killaura distance [valor]</span><br/>` } });
                        }
                    }
                    else if (message.toLowerCase().startsWith("$goto ")) {
                        if (isMoving[bot.username]) {
                            bot.pathfinder.setGoal(null);
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:red'>Parando o trajeto ate as coordenadas</span><br/>" } })
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
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Indo ate as coordenadas fornecidas...</span><br/>" } })
                            isMoving[bot.username] = true;

                            bot.on('goal_reached', function () {
                                if (isMoving[bot.username]) {
                                    process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:green'>Cheguei nas coordenadas ${x}, ${y}, ${z}</span><br/>` } })
                                    isMoving[bot.username] = false;
                                }
                            });
                        }
                    }
                    else if (message.toLowerCase().startsWith("$move ")) {
                        const parts = message.split(" ");
                        const directions = parts[1].split("|");
                        const duration = parts.length > 2 ? parseInt(parts[2]) : 1;

                        if (directions == '') {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:red'>Argumentos invalidos!</span><br/>" } });
                        }
                        else {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Movendo ate as direções \"" + directions + "\" com a duração de " + duration + " ticks</span><br/>" } });

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

                            bot.waitForTicks(duration).then(() => {
                                bot.clearControlStates();
                            });
                        }
                    }
                    else if (message.toLowerCase() == "$shift") {
                        IsSneaking[bot.username] = !IsSneaking[bot.username]

                        if (IsSneaking[bot.username]) {
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Shift Ativado</span><br/>" } })
                            bot.setControlState('sneak', true);
                        }
                        else {
                            bot.setControlState('sneak', false);
                            process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:red'>Shift desativado</span><br/>" } })
                        }
                    }
                    else if (message.toLowerCase().startsWith("$follow ")) {
                        const playerName = message.split(" ")[1];

                        if (!isFollowing[bot.username]) {
                            const mcData = require('minecraft-data')(bot.version);
                            const defaultMove = new Movements(bot, mcData);

                            defaultMove.allowParkour = true;
                            defaultMove.canJump = true;

                            bot.pathfinder.setMovements(defaultMove);

                            playerToFollow[bot.username] = bot.players[playerName];

                            if (!playerToFollow[bot.username]) {
                                process.send({
                                    type: 'webcontents', event: 'bot-message', data: {
                                        bot: bot.username,
                                        message: `<br/><span style='color:red'>O jogador ${playerName} não foi encontrado!</span><br/>`
                                    }
                                });
                            } else {
                                followInterval[bot.username] = setInterval(() => {
                                    if (playerToFollow[bot.username] && playerToFollow[bot.username].entity && playerToFollow[bot.username].entity.position) {
                                        const goal = new goals.GoalFollow(playerToFollow[bot.username].entity, 1);
                                        goal.endOnArrival = false;
                                        bot.pathfinder.setGoal(goal);
                                        bot.pathfinder.tickTimeout = 1;
                                    }
                                    else {
                                        clearInterval(followInterval[bot.username]);
                                        bot.pathfinder.setGoal(null);
                                        isFollowing[bot.username] = false;
                                        process.send({
                                            type: 'webcontents', event: 'bot-message', data: {
                                                bot: bot.username,
                                                message: `<br/><span style='color:red'>Follow desativado</span><br/>`
                                            }
                                        });
                                    }
                                }, 500);

                                isFollowing[bot.username] = true;
                                process.send({
                                    type: 'webcontents', event: 'bot-message', data: {
                                        bot: bot.username,
                                        message: `<br/><span style='color:green'>Seguindo ${playerName}</span><br/>`
                                    }
                                });
                            }
                        } else if (playerToFollow[bot.username] && playerToFollow[bot.username].username === playerName) {
                            clearInterval(followInterval[bot.username]);
                            bot.pathfinder.setGoal(null);
                            isFollowing[bot.username] = false;
                            process.send({
                                type: 'webcontents', event: 'bot-message', data: {
                                    bot: bot.username,
                                    message: `<br/><span style='color:red'>Follow desativado</span><br/>`
                                }
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
    }
    if (process_msg_.event === 'form-data-changed-reconnect') {
        autoreconnect = process_msg_.data.autoReconnect;
        autoreconnectdelay = parseInt(process_msg_.data.delay);
    }
    if (process_msg_.event === 'form-data-changed-fallcheck') {
        fallcheckbypass = process_msg_.data.fallCheck;
    }
    if (process_msg_.event === 'remove-bot') {
        const botUsername = process_msg_.data;
        botsSemAutoReconnect.push(botUsername);
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
    }
    if (process_msg_.event === 'reco-bot') {
        const { host, botUsername, version, proxy, proxyType } = process_msg_.data;
        const botExists = botsaarray.some(bot => bot.username === botUsername);

        process.send({ type: 'log', data: process_msg_.data});

        if (!botExists) {
            process.send({ type: 'ipcMain', event: 'connect-bot', data: { host: host, username: botUsername, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType } });
        } else {
            const botsaarrayCopy = [...botsaarray];
            botsaarrayCopy.forEach(async (bot) => {
                if (bot.username == botUsername) {
                    botsSemAutoReconnect.push(botUsername);
                    bot.end();
                    const indexConectado = botsConectado.indexOf(botUsername);
                    if (indexConectado > -1) {
                        botsConectado.splice(indexConectado, 1);
                    }

                    const indexArray = botsaarray.indexOf(bot);
                    if (indexArray > -1) {
                        botsaarray.splice(indexArray, 1);
                    }
                    await sleep(500);
                    process.send({ type: 'ipcMain', event: 'connect-bot', data: { host: host, username: botUsername, version: version, proxy: proxy && proxy.ip && proxy.port ? proxy : null, proxyType: proxyType } });
                }
            });
        }
    }
    if (process_msg_.event === 'captcha-input-janela1') {
        const { botrightnow, captchaInput } = process_msg_.data;
        const botsaarrayCopy = [...botsaarray];
        botsaarrayCopy.forEach((bot) => {
            if (bot.username == botrightnow) {
                bot.chat(captchaInput);
                process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Captcha enviado!</span><br/>" } });
                process.send({ type: 'closewindowcaptcha', username: bot.username });
            }
        })
    }
});