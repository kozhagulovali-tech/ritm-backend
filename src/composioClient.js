import { Composio } from '@composio/core';
import dotenv from 'dotenv';

dotenv.config();

// ВАЖНО: начиная с TypeScript SDK v0.2.0, при прямом вызове действий
// (tools.execute) нужно явно указывать версию тулкита — без этого
// Composio вернёт "базовую" версию с урезанным набором параметров.
// См. docs.composio.dev → Toolkit Versioning.
export const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  toolkitVersions: {
    googlecalendar: 'latest',
  },
});

export const GOOGLE_AUTH_CONFIG_ID = process.env.COMPOSIO_GOOGLE_AUTH_CONFIG_ID;
