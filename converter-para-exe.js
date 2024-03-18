const electronPackager = require('electron-packager');

const packagerOptions = {
    dir: '.',
    name: 'UnknownBot',
    platform: 'win32',
    arch: 'x64',
    appVersion: '3.1.0',
    electronVersion: '29.1.4',
    author: 'win32k_sys',
    icon: 'icone.ico',
};

electronPackager(packagerOptions)
    .then(() => console.log('Empacotamento concluído!'))
    .catch(err => console.error('Erro durante o empacotamento:', err));
