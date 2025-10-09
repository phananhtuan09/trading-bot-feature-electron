const StateManager = require('../database/stateStore');

// This function will be called to override the default console methods
function overrideConsole() {
  const stateManager = new StateManager();

  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
  };

  const logToStore = (level, args) => {
    // Convert all arguments to string format
    const message = args
      .map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return '[Unserializable Object]';
          }
        }
        return String(arg);
      })
      .join(' ');

    // Add to state manager, which will handle storage and pushing to UI
    stateManager.addLog({ level, message });
  };

  console.log = (...args) => {
    original.log.apply(console, args);
    logToStore('info', args);
  };

  console.warn = (...args) => {
    original.warn.apply(console, args);
    logToStore('warn', args);
  };

  console.error = (...args) => {
    original.error.apply(console, args);
    logToStore('error', args);
  };

  console.info = (...args) => {
    original.info.apply(console, args);
    logToStore('info', args);
  };

  console.debug = (...args) => {
    original.debug.apply(console, args);
    logToStore('debug', args);
  };

  console.log('Console methods have been overridden to push logs to the UI.');
}

module.exports = { overrideConsole };