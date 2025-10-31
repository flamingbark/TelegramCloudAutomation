import dotenv from 'dotenv';
import { UserTelegramClient } from './userClient.js';
import winston from 'winston';
import path from 'path';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] : ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join('logs', 'sender.log') })
  ]
});

function parseTargets() {
  const ids = (process.env.TELEGRAM_GROUP_IDS || '').trim();
  if (ids) return ids.split(',').map(s => s.trim()).filter(Boolean);
  const single = (process.env.TELEGRAM_GROUP_ID || '').trim();
  if (single) return [single];
  return [];
}

async function main() {
  const targets = parseTargets();
  if (!targets.length) {
    console.error('No target chat IDs. Set TELEGRAM_GROUP_IDS or TELEGRAM_GROUP_ID');
    process.exit(1);
  }

  const user = new UserTelegramClient();
  await user.init();

  for (const id of targets) {
    try {
      await user.sendText(id, '/tt@rick');
      await new Promise(r => setTimeout(r, 1000));
      await user.sendText(id, '/xt@rick');
      logger.info(`Sent /tt@rick and /xt@rick to ${id}`);
    } catch (e) {
      logger.warn(`Failed to send prompts to ${id}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error('sendPrompts failed:', e);
  process.exit(1);
});
