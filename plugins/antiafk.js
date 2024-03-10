let antiAfkState = {};
let antiAfkInterval = {};

module.exports = function (bot) {
  if (!global.listadecommandos.includes("$antiafk")) {
    global.listadecommandos.push("$antiafk");
    global.Syntax += '<span style="color:white">- AntiAFK, Descrição do comando:</span> <span style="color:orange">$antiafk</span><br/>';
  }

  bot.commandChecks['antiafk'] = function (message) {
    if (message.startsWith('$')) {
      if (global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
        if (message.toLowerCase() === "$antiafk") {
          antiAfkState[bot.username] = !antiAfkState[bot.username];
          let cor = antiAfkState[bot.username] ? 'green' : 'red';
          let status = antiAfkState[bot.username] ? 'ativado' : 'desativado';
          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:${cor}'>AntiAFK ${status}!</span><br/>` });

          if (antiAfkState[bot.username]) {
            antiAfkInterval[bot.username] = setInterval(() => {
              bot.setControlState('jump', true);
              setTimeout(() => bot.setControlState('jump', false), 100);
            }, 5000);
          } else {
            clearInterval(antiAfkInterval[bot.username]);
          }
        }
      }
    }
  };

  bot.on('end', function () {
    if(antiAfkState[bot.username])
    {
      antiAfkState[bot.username] = false;
    }
    if (antiAfkInterval[bot.username]) {
      clearInterval(antiAfkInterval[bot.username]);
    }
  });
};
