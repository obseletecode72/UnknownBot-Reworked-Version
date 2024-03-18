window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('captcha-input');
  input.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      window.ipcRenderer.send('captcha-input', this.value);
    }
  });
});
