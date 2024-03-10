let herbalismoAtivo = false;
const plantacoes = ['carrots', 'potatoes', 'wheat'];

module.exports = function (bot) {
  if (!global.listadecommandos.includes("$herbalismo")) {
    global.listadecommandos.push("$herbalismo");
    global.Syntax += '<span style="color:white">- Herbalismo, Quebra quase todos tipos de plantacoes em um raio de 3 blocos</span> <span style="color:orange">$herbalismo</span><br/>';
  }

  bot.commandChecks['herbalismo'] = function(message) {
    if (message.startsWith('$')) {
      if (global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
        if (message.toLowerCase() === "$herbalismo") {
          herbalismoAtivo = !herbalismoAtivo;
          let status = herbalismoAtivo ? 'ativado' : 'desativado';
          let cor = herbalismoAtivo ? 'green' : 'red';
          global.mainWindow.webContents.send('bot-message', { bot: bot.username, message: `<br/><span style='color:${cor}'>Herbalismo ${status}!</span><br/>` });
          if (herbalismoAtivo) {
            quebraPlantacoes(bot);
          }
        }
      }
    }
  };
};

function quebraPlantacoes(bot) {
  if (!herbalismoAtivo) return;
  const raio = 3;
  const posicaoAtual = bot.entity.position;
  for (let x = -raio; x <= raio; x++) {
    for (let y = -raio; y <= raio; y++) {
      for (let z = -raio; z <= raio; z++) {
        const novaPosicao = posicaoAtual.floored().offset(x, y, z);
        const bloco = bot.blockAt(novaPosicao);
        if (bloco && plantacoes.includes(bloco.name) && bot.canDigBlock(bloco)) {
          bot.dig(bloco, onFinishedDigging);
        }
      }
    }
  }
  if (herbalismoAtivo) setTimeout(() => quebraPlantacoes(bot), 100);
}

function onFinishedDigging(err) {
  if (err) console.error(err);
}