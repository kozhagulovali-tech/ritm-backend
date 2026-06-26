import { Composio } from '@composio/core';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.COMPOSIO_API_KEY;

// Composio пока не обязателен на старте: если ключ ещё не задан,
// просто не создаём клиента — сервер всё равно запустится и будет
// нормально работать без него.
export const composio = apiKey
  ? new Composio({
      apiKey,
      toolkitVersions: {
        googlecalendar: 'latest',
      },
    })
  : null;

export const GOOGLE_AUTH_CONFIG_ID = process.env.COMPOSIO_GOOGLE_AUTH_CONFIG_ID;
