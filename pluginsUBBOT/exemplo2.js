module.exports = function (bot) {
  if (!global.listadecommandos.includes("$exemplo2")) { // aqui verificamos para toda vez que adicionar um bot nao adicionar o comando denovo e ficar infinitos
    global.listadecommandos.push("$exemplo2");
    global.Syntax += '<span style="color:white">- Exemplo2, Descrição do comando:</span> <span style="color:orange">$exemplo2</span><br/>';
  }

  bot.commandChecks['exemplo2'] = function(message) { // se mais plugins adicionados com o mesmo nome ira ter conflito portanto troque
    if (message.startsWith('$')) {
      if (global.listadecommandos.some(cmd => message.toLowerCase().startsWith(cmd.toLowerCase()))) {
        if (message.toLowerCase() === "$exemplo2") {
          bot.chat('Olá, mundo! mensagem enviada por comando!');
          process.send({ type: 'webcontents', event: 'bot-message', data: { bot: bot.username, message: "<br/><span style='color:green'>Mensagem enviada por plugin!</span><br/>" } });
          // bem aqui 
        }
      }
      // Aqui você pode adicionar a lógica para os outros comandos
    }
  };
};

// NAO TROQUE O NOME DA VARIAVEL bot.commandChecks A NAO SER QUE VOCE SAIBA O QUE VOCE ESTA FAZENDO, SE MUDAR O PLUGINS NAO SERA CARREGADO