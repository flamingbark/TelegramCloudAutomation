# TelegramCloudAutomation

Cloud-runner to send RickBurpBot trending prompts every 4 hours using a Telegram user session (MTProto). It sends /tt@rick and /xt@rick to one or more chats. Pair this with your bot that reads replies and posts summaries.

## Setup
- Node.js 18+
- A Telegram user account added to target chats

### Configure
1) Copy .env.example to .env and fill:
   - TELEGRAM_API_ID, TELEGRAM_API_HASH
   - Provide one of:
     - TELEGRAM_USER_SESSION (recommended)
     - or mount/persist TELEGRAM_USER_SESSION_FILE (default data/user.session)
   - Target chats with TELEGRAM_GROUP_IDS (comma-separated) or TELEGRAM_GROUP_ID

2) Install deps
`
npm ci
`

### Run once
`
node src/sendPrompts.js
`

### Cron (every 4 hours)
- crontab:
`
0 */4 * * * cd /path/to/TelegramCloudAutomation && /usr/bin/env PATH=/usr/local/bin:/usr/bin npm run start >> logs/cron.log 2>&1
`

### Docker
`
docker build -t telegram-cloud-automation .
docker run --rm --env-file .env -v C:\Users\terex\Documents\rickburpai\TelegramCloudAutomation/data:/app/data telegram-cloud-automation
`

## Notes
- The user account must be a member of each target chat and be allowed to send messages.
- This repo only sends prompts. Your bot should listen and post summaries on its own schedule or in response.
