const prompt = require('prompt-sync')({ sigint: true });

module.exports = {
  async promptUser(text, hide = false) {
    if (hide) {
      let input = prompt.hide(text);
      return input;
    } else {
      let input = prompt(text);
      return input;
    }
  }
}