const _ = require('underscore');
const chalk = require('chalk');

module.exports = ({ useColor, onlyErrors }) => {
  const { green, red } = new chalk.constructor({
    enabled: useColor,
    level: useColor ? 1 : 0
  });

  const colors = { error: red, success: green };

  return (type, message) => {
    if (onlyErrors && type !== 'error') return;

    message = (colors[type] || _.identity)(`[${type}] ${message}`);
    console[type === 'error' ? 'error' : 'log'](message);
  };
};
