import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

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

function getSessionString() {
  const envStr = (process.env.TELEGRAM_USER_SESSION || '').trim();
  if (envStr) return envStr;
  const file = process.env.TELEGRAM_USER_SESSION_FILE || 'data/user.session';
  try { if (fs.existsSync(file)) return fs.readFileSync(file, 'utf-8').trim(); } catch {}
  return '';
}

export class UserTelegramClient {
  constructor() {
    this.ready = false;
    this.client = null;
  }
  async init() {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || '0');
    const apiHash = process.env.TELEGRAM_API_HASH || '';
    if (!apiId || !apiHash) throw new Error('Missing TELEGRAM_API_ID/TELEGRAM_API_HASH');
    const sess = getSessionString();
    const stringSession = new StringSession(sess);
    this.client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 3 });
    await this.client.connect();
    this.ready = true;
    logger.info('UserTelegramClient connected');
  }
  async sendText(chatId, text) {
    if (!this.ready) throw new Error('UserTelegramClient not ready');
    try {
      const res = await this.client.sendMessage(chatId, { message: text });
      return { id: res?.id };
    } catch (e) {
      logger.warn(`sendText failed for ${chatId}: ${e.message}`);
      throw e;
    }
  }
}
