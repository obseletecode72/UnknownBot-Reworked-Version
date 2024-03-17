let herbalismoAtivo = {};
const plantacoes = ['carrots', 'potatoes', 'wheat'];

module.exports = function (bot) {
  if (!global.listadecommandos.includes("$herbalismo")) {
    global.listadecommandos.push("$herbalismo");
    global.Syntax += '<span style="color:white">- Herbalismo, Quebra quase todos tipos de plantacoes em um raio de 3 blocos</span> <span style="color:orange">$herbalismo</span><br/>';
  }

  bot.commandChecks['herbalismo'] = function (message) {
    if (message.startsWith('$')) {
      if (global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
        if (message.toLowerCase() === "$herbalismo") {
          herbalismoAtivo[bot.username] = !herbalismoAtivo[bot.username];
          let status = herbalismoAtivo[bot.username] ? 'ativado' : 'desativado';
          let cor = herbalismoAtivo[bot.username] ? 'green' : 'red';
          process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: `<br/><span style='color:${cor}'>Herbalismo ${status}!</span><br/>` } });
          if (herbalismoAtivo[bot.username]) {
            quebraPlantacoes(bot);
          }
        }
      }
    }
  };

  bot.on('end', function () {
    if (herbalismoAtivo[bot.username]) {
      herbalismoAtivo[bot.username] = false;
    }
  });
};

function quebraPlantacoes(bot) {
  if (!herbalismoAtivo[bot.username]) return;
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
  if (herbalismoAtivo[bot.username]) setTimeout(() => quebraPlantacoes(bot), 100);
}

function onFinishedDigging(err) {
  if (err) console.error(err);
}