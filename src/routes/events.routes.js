import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query, pool } from '../db.js';
import { createGoogleMeetEvent } from '../googleMeet.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const events = await query(
      `SELECT id, title, event_date::text AS "date", event_time AS "time",
              format, location, link, notes
       FROM events ORDER BY event_date, event_time`
    );
    const participants = await query(
      'SELECT event_id AS "eventId", user_id AS "userId" FROM event_participants'
    );

    const byEvent = {};
    for (const p of participants.rows) {
      byEvent[p.eventId] = byEvent[p.eventId] || [];
      byEvent[p.eventId].push(p.userId);
    }

    res.json(events.rows.map((e) => ({ ...e, participantIds: byEvent[e.id] || [] })));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  const { title, date, time, participantIds, format, location, notes, useGoogleMeet } = req.body;

  if (!title || !date || !time || !participantIds?.length) {
    return res
      .status(400)
      .json({ error: 'Укажите название, дату, время и хотя бы одного участника.' });
  }

  let link = req.body.link || '';

  if (format === 'online' && useGoogleMeet) {
    try {
      link = await createGoogleMeetEvent({
        organizerId: req.userId,
        title,
        date,
        time,
        notes,
        participantIds,
      });
    } catch (err) {
      console.error('Composio/Google Calendar error:', err);
      return res.status(502).json({
        error:
          'Не удалось создать встречу в Google Meet. Проверьте, что Google-аккаунт подключён в профиле (раздел интеграций).',
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `INSERT INTO events (title, event_date, event_time, format, location, link, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, event_date::text AS "date", event_time AS "time",
                 format, location, link, notes`,
      [title.trim(), date, time, format || 'offline', location || '', link, notes || '', req.userId]
    );
    const event = eventResult.rows[0];

    for (const userId of participantIds) {
      await client.query(
        'INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2)',
        [event.id, userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ ...event, participantIds });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
