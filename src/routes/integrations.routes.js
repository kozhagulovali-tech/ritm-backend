import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { composio, GOOGLE_AUTH_CONFIG_ID } from '../composioClient.js';

const router = Router();

// Шаг 1: начать подключение Google-аккаунта.
// Фронтенд должен открыть полученный redirectUrl (например, в новой вкладке),
// человек авторизуется у Google, Composio сам обработает обратный редирект.
router.post('/google/connect', requireAuth, async (req, res, next) => {
  try {
    const connectionRequest = await composio.connectedAccounts.initiate(
      String(req.userId),
      GOOGLE_AUTH_CONFIG_ID
    );

    await query(
      `INSERT INTO google_connections (user_id, composio_connected_account_id, status)
       VALUES ($1, $2, 'INITIATED')
       ON CONFLICT (user_id) DO UPDATE
         SET composio_connected_account_id = EXCLUDED.composio_connected_account_id,
             status = 'INITIATED'`,
      [req.userId, connectionRequest.id]
    );

    res.json({ redirectUrl: connectionRequest.redirectUrl });
  } catch (err) {
    console.error('Composio connect error:', err);
    res
      .status(502)
      .json({ error: 'Не удалось начать подключение Google. Проверьте настройки Composio.' });
  }
});

// Шаг 2: проверить статус подключения — вызывайте с фронтенда после того,
// как пользователь вернулся со страницы согласия Google.
router.get('/google/status', requireAuth, async (req, res, next) => {
  try {
    const row = await query(
      'SELECT composio_connected_account_id, status FROM google_connections WHERE user_id = $1',
      [req.userId]
    );
    const connection = row.rows[0];
    if (!connection) {
      return res.json({ status: 'NOT_CONNECTED' });
    }

    try {
      const accounts = await composio.connectedAccounts.list({ userIds: [String(req.userId)] });
      const match = accounts?.items?.find((a) => a.id === connection.composio_connected_account_id);
      const status = match?.status || connection.status;

      if (status !== connection.status) {
        await query('UPDATE google_connections SET status = $1 WHERE user_id = $2', [
          status,
          req.userId,
        ]);
      }
      res.json({ status });
    } catch (err) {
      console.error('Composio status error:', err);
      // Если Composio временно недоступен — отдаём последний известный статус из базы,
      // чтобы интерфейс не падал.
      res.json({ status: connection.status });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
