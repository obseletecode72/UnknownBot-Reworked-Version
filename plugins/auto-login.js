const fs = require('fs');
let count = {};
let intervalId = {};
let commands = [];
let autologinfileexists = false;
let usernames = {};

if (!fs.existsSync('./plugins/auto-login.txt')) {
  console.error('Arquivo auto-login.txt não encontrado.');
} else {
  autologinfileexists = true;
  let data = fs.readFileSync('./plugins/auto-login.txt', 'utf8');
  let lines = data.split('\n');
  commands = lines.map(line => {
    let parts = line.split('=');
    if (parts.length > 1) {
      return parts[1].replace(/"/g, '').replace(/\r/g, '');
    } else {
      return '';
    }
  });
}

module.exports = function (bot) {
  bot.on('spawn', function () {
    usernames[bot.username] = bot.username;
    if (intervalId[bot.username] || !autologinfileexists) return;

    count[bot.username] = 0;
    intervalId[bot.username] = setInterval(() => {
      if (commands && commands.length >= 2) {
        let command = commands[count[bot.username] % 2];
        console.log(command)
        if (command) {
          bot.chat(command);
        }
        count[bot.username]++;
        if (count[bot.username] >= 6) {
          clearInterval(intervalId[bot.username]);
          intervalId[bot.username] = null;
        }
      }
      else {
        clearInterval(intervalId[bot.username]);
        intervalId[bot.username] = null;
      }
    }, 3000);
  });

  bot.on('end', function () {
    clearInterval(intervalId[usernames[bot.username]]);
  })
};
