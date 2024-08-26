#                 UnknownBot - Versão Reworked v3.2

<p align="center">
  <img src="https://avatars.githubusercontent.com/u/138137862?s=400&u=d3046ac7d6c15bebfe304e914789a2b631ab6186&v=4" />
</p>

Este é um projeto brasileiro para o jogo Minecraft. É uma ferramenta para controlar bots com várias funcionalidades. Este projeto é insipirado no antigo bot brasileiro AdvancedBot.

## Uso da API Mineflayer

Este projeto usa a API Mineflayer. Se encontrar algum bug, por favor, crie uma issue ou entre em contato conosco no Discord para que possamos resolvê-lo da melhor maneira possível.

## Contribuições

Se quiser colaborar com o projeto e fazer suas modificações, e quiser que eu implemente por padrão aqui no repositório, abra um Pull Request. Todas as contribuições são bem-vindas!

## Como instalar?

0.1- Clique no botao verde 'Code' desta pagina e clique em 'Download Zip'

0.2- Crie uma nova pasta na Area de Trabalho e use o WinRAR para extrair os arquivos para essa pasta

1- Instale o Node JS mais recente por aqui: https://nodejs.org/en

2- Abra como administrador o arquivo "instalar_ou_iniciar.bat" e selecione a opcao Instalar, e depois de finalizado, abra denovo e selecione a opçao Iniciar

## Modulos que estao no RAR (Nao Mexa)
## Para que serve o arquivo digging.js?

Bem a API do Mineflayer nao e perfeita entao contem bugs entao este arquivo e uma versao melhorada para o uso de quebrar blocos pois contem bugs igual eu disse, para instalar isso voce pode substituir o arquivo em ´node_modules\mineflayer\lib\plugins´

## Para que serve o arquivo physics.js?

Alguns antibots fazem algumas verificaçoes adicionais, e este arquivo adiciona estas verificaçoes adicionais para conseguir passar da verificaçao sem problemas, como gravidade, colisao e etc...

## Para que serve o arquivo entities.js?

Dar compatibilidade para o arquivo physics.js, se quiser usar o physics use o entities tambem (OBRIGATORIO)

## Para que serve o arquivo CollectBlock.js?

Arrumar um problema em que nao minerava alguns blocos por conta de estar em uma funçao antiga

## Plugins

Sistema de plugins adicionado, tambem pode conter bugs, qualquer problema reporte entre em contato no discord, como a API e Mineflayer voce pode verificar a documentacao aqui: https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md
Tambem tem os exemplos para voce comecar a produzir seus plugins na pasta plugins

OBS: Electron nao e suportado nestes casos, por que o electron ja e usado no processo principal, e os bots sao criados no processo filho em que o electron nao e suportado pois ja e usado no processo principal

## Contato

Para mais informações, junte-se a nós no Discord: https://discord.gg/rTEtGZgqaw

## Exe

Para compilar o UnknownBot em .exe voce pode seguir estes passos abaixo, ou baixar ele pronto em Releases

1- Abra o arquivo "converter_para_exe.bat" isso ira compilar em .exe em uma pasta

OBS: Quando o programa e compilado em .exe, ele sai do "Modo" Desenvolvimento para o "Modo" Release, deste jeito, as pastas plugins/assets/config etc... elas so estao disponiveis em, '/resources/app/' la voce podera encontrar as pastas e arquivos, portanto e la que voce vai querer modificar se voce quiser tirar algum plugin ou colocar/modificar etc...

