import { composio } from './composioClient.js';
import { query } from './db.js';

/**
 * Создаёт событие в Google Calendar с автогенерируемой Google Meet-ссылкой
 * через Composio и возвращает эту ссылку.
 *
 * ВНИМАНИЕ — единственное место в этом backend'е, которое стоит руками
 * перепроверить перед первым реальным запуском: точные имена параметров
 * действия GOOGLECALENDAR_CREATE_EVENT (start_datetime,
 * event_duration_minutes, create_meeting_room и т.д.) указаны здесь по
 * документации Composio на момент написания кода. Composio периодически
 * обновляет схемы тулкитов, поэтому перед продом откройте в дашборде
 * Composio раздел Toolkits → Google Calendar → CREATE_EVENT и сверьте
 * актуальные имена полей запроса и ответа. Если что-то отличается —
 * нужно поправить только объект `arguments` и строки с `result?.data...`
 * ниже, остальной backend трогать не придётся.
 */
export async function createGoogleMeetEvent({ organizerId, title, date, time, notes, participantIds }) {
  const conn = await query(
    'SELECT composio_connected_account_id, status FROM google_connections WHERE user_id = $1',
    [organizerId]
  );
  const connection = conn.rows[0];
  if (!connection || connection.status !== 'ACTIVE') {
    throw new Error('Организатор встречи не подключил Google Calendar в Composio.');
  }

  const attendeesResult = await query('SELECT email FROM users WHERE id = ANY($1::int[])', [
    participantIds,
  ]);
  const attendeeEmails = attendeesResult.rows.map((r) => r.email);

  const startDateTime = `${date}T${time}:00`;

  const result = await composio.tools.execute('GOOGLECALENDAR_CREATE_EVENT', {
    userId: String(organizerId),
    connectedAccountId: connection.composio_connected_account_id,
    arguments: {
      calendar_id: 'primary',
      summary: title,
      description: notes || '',
      start_datetime: startDateTime,
      event_duration_minutes: 30,
      create_meeting_room: true,
      attendees: attendeeEmails,
    },
  });

  const link =
    result?.data?.hangoutLink ||
    result?.data?.response_data?.hangoutLink ||
    result?.data?.htmlLink ||
    '';

  if (!link) {
    throw new Error('Composio не вернул ссылку на встречу — проверьте ответ result.data в логах.');
  }

  return link;
}
