const levels = new Map([['debug', 10], ['info', 20], ['warn', 30], ['error', 40]]);

export function createLogger(scope, level = process.env.REFRAMOTION_LOG_LEVEL || 'info') {
  const threshold = levels.get(level) ?? 20;
  const write = (name, message, fields = {}) => {
    if ((levels.get(name) ?? 20) < threshold) return;
    const record = {time: new Date().toISOString(), level: name, scope, message, ...fields};
    const target = name === 'error' ? process.stderr : process.stdout;
    target.write(`${JSON.stringify(record)}\n`);
  };
  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
