import 'dotenv/config';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { utils } from 'telegram';

async function main() {
  const apiId = Number(process.env.TELEGRAM_API_ID || 0);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const sessionStr = (process.env.TELEGRAM_USER_SESSION || '').trim();

  if (!apiId || !apiHash || !sessionStr) {
    throw new Error('Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_USER_SESSION');
  }

  const client = new TelegramClient(new StringSession(sessionStr), apiId, apiHash, { connectionRetries: 3 });

  await client.connect();
  console.log('Connected. Listing dialogs...\n');

  const limit = Number(process.argv[2]) || 200;
  let count = 0;
  for await (const dialog of client.iterDialogs({ limit })) {
    const entity = dialog.entity;
    if (!entity) continue;

    const peerId = utils.getPeerId(entity).toString();
    const title = entity.title || entity.firstName || entity.username || 'Unnamed';
    const username = entity.username ? `@${entity.username}` : '';
    const dialogType = entity.className || entity.constructor?.name || 'Unknown';

    console.log(`${peerId}\t${title}${username ? ` (${username})` : ''} [${dialogType}]`);
    count += 1;
  }

  console.log(`\nTotal dialogs listed: ${count}`);
  await client.disconnect();
}

main().catch((err) => {
  console.error('Failed to list dialogs:', err);
  process.exit(1);
});
