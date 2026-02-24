import fs from 'fs';
import path from 'path';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

function getLogFileName() {
  const date = new Date().toISOString().split('T')[0];
  return path.join(logDir, `app-${date}.log`);
}

export function logRequest(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    const logLine = JSON.stringify(log) + '\n';
    fs.appendFileSync(getLogFileName(), logLine);
  });
  
  next();
}

export function logError(error, req) {
  const log = {
    timestamp: new Date().toISOString(),
    type: 'ERROR',
    message: error.message,
    stack: error.stack,
    url: req?.url,
    method: req?.method,
    ip: req?.ip
  };
  
  const logLine = JSON.stringify(log) + '\n';
  fs.appendFileSync(getLogFileName(), logLine);
}
