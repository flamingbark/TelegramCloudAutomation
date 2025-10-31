import dotenv from 'dotenv';
import fs from 'fs';
import { UserTelegramClient } from './userClient.js';
import winston from 'winston';
import path from 'path';

dotenv.config();

fs.mkdirSync('logs', { recursive: true });

function readEnvNumber(name, fallback) {
  const raw = (process.env[name] || '').trim();
  if (!raw) return fallback;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num;
}

function getLogRotationOptions() {
  const maxMb = readEnvNumber('LOG_MAX_MB', 5);
  const maxFiles = Math.floor(readEnvNumber('LOG_MAX_FILES', 3));
  const maxsize = Math.max(1024 * 1024, Math.floor(maxMb * 1024 * 1024));
  return {
    maxsize,
    maxFiles: Math.max(1, maxFiles)
  };
}

function enforceLogLimits(files, maxSize) {
  for (const file of files) {
    try {
      if (!fs.existsSync(file)) continue;
      const stats = fs.statSync(file);
      if (stats.size <= maxSize) continue;
      fs.truncateSync(file, 0);
    } catch (err) {
      console.error(`Failed to enforce log limit for ${file}:`, err);
    }
  }
}

function purgeRotatedLogs(directory, baseName, maxFiles) {
  try {
    if (!fs.existsSync(directory)) return;
    const entries = fs.readdirSync(directory)
      .filter(name => name === baseName || name.startsWith(`${baseName}.`))
      .map(name => ({
        name,
        fullPath: path.join(directory, name),
        // Use mtime for ordering; fall back to ctime
        mtimeMs: fs.statSync(path.join(directory, name)).mtimeMs
      }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const keep = Math.max(1, maxFiles);
    const toRemove = entries.slice(keep);
    for (const entry of toRemove) {
      try {
        fs.unlinkSync(entry.fullPath);
      } catch (err) {
        console.error(`Failed to remove old log file ${entry.fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error(`Failed to purge rotated logs in ${directory}:`, err);
  }
}

const logRotation = getLogRotationOptions();
function applyLogSafeguards() {
  enforceLogLimits([
    path.join('logs', 'sender.log'),
    path.join('logs', 'service.log'),
    path.join('logs', 'service-error.log')
  ], logRotation.maxsize);
  purgeRotatedLogs('logs', 'sender.log', logRotation.maxFiles);
}

applyLogSafeguards();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] : ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join('logs', 'sender.log'),
      maxsize: logRotation.maxsize,
      maxFiles: logRotation.maxFiles,
      tailable: true
    })
  ]
});

function parseTargets() {
  const ids = (process.env.TELEGRAM_GROUP_IDS || '').trim();
  if (ids) return ids.split(',').map(s => s.trim()).filter(Boolean);
  const single = (process.env.TELEGRAM_GROUP_ID || '').trim();
  if (single) return [single];
  return [];
}

function getIntervalMs() {
  const raw = (process.env.RUN_INTERVAL_HOURS || '').trim();
  if (!raw) return 0;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) {
    logger.warn(`Ignoring RUN_INTERVAL_HOURS='${raw}' (must be a positive number)`);
    return 0;
  }
  return hours * 60 * 60 * 1000;
}

async function sendPromptsOnce(user, targets) {
  for (const id of targets) {
    try {
      await user.sendText(id, '/tt@rick');
      await new Promise(r => setTimeout(r, 1000));
      await user.sendText(id, '/xt@rick');
      logger.info(`Sent /tt@rick and /xt@rick to ${id}`);
    } catch (e) {
      logger.warn(`Failed to send prompts to ${id}: ${e.message || e}`);
    }
  }
}

async function main() {
  const targets = parseTargets();
  if (!targets.length) {
    console.error('No target chat IDs. Set TELEGRAM_GROUP_IDS or TELEGRAM_GROUP_ID');
    process.exit(1);
  }

  const intervalMs = getIntervalMs();

  while (true) {
    const user = new UserTelegramClient();
    await user.init();
    try {
      await sendPromptsOnce(user, targets);
    } finally {
      await user.disconnect();
    }

    applyLogSafeguards();

    if (!intervalMs) break;

    logger.info(`Sleeping for ${intervalMs / (60 * 60 * 1000)} hours before next run`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

main().catch((e) => {
  console.error('sendPrompts failed:', e);
  process.exit(1);
});
