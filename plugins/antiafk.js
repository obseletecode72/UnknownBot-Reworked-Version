let antiAfkState = {};
let antiAfkInterval = {};
let antiAfkDelay = {};

module.exports = function (bot) {
  if (!global.listadecommandos.includes("$antiafk")) {
    global.listadecommandos.push("$antiafk");
    global.Syntax += '<span style="color:white">- AntiAFK, Pula a cada 5 segundos por default (delay pode ser trocado)</span> <span style="color:orange">$antiafk [delay]</span><br/>';
  }

  bot.commandChecks['antiafk'] = function (message) {
    if (message.startsWith('$')) {
      if (global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
        if (message.toLowerCase().startsWith("$antiafk")) {
          let delay = message.split(" ")[1]; // Obtém o delay após o comando $antiafk
          if (delay) {
            antiAfkDelay[bot.username] = parseInt(delay);
          } else {
            antiAfkDelay[bot.username] = 5000; // Valor padrão se nenhum delay for especificado
          }

          antiAfkState[bot.username] = !antiAfkState[bot.username];
          let cor = antiAfkState[bot.username] ? 'green' : 'red';
          let status = antiAfkState[bot.username] ? 'ativado' : 'desativado';
          process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:${cor}'>AntiAFK ${status}!</span><br/>` } });

          if (antiAfkState[bot.username]) {
            antiAfkInterval[bot.username] = setInterval(() => {
              bot.setControlState('jump', true);
              setTimeout(() => bot.setControlState('jump', false), 100);
            }, antiAfkDelay[bot.username]);
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
