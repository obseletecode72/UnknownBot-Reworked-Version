module.exports = function(bot) {
  bot.on('spawn', function() {
    bot.chat('Olá, mundo!');
  });
};


// aqui apenas estamos brincando com eventos e nao comandos entao nao ha nescessidade de checkCommands
