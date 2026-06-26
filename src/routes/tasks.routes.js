import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();

const TASK_FIELDS = `
  id, title, description,
  assignee_id AS "assigneeId",
  status, priority,
  assigned_date::text AS "assignedDate",
  due_date::text AS "dueDate"
`;

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query(`SELECT ${TASK_FIELDS} FROM tasks ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description, assigneeId, dueDate, priority } = req.body;
    if (!title || !assigneeId || !dueDate) {
      return res
        .status(400)
        .json({ error: 'Укажите название, исполнителя и срок выполнения.' });
    }

    const result = await query(
      `INSERT INTO tasks (title, description, assignee_id, status, priority, due_date, created_by)
       VALUES ($1, $2, $3, 'todo', $4, $5, $6)
       RETURNING ${TASK_FIELDS}`,
      [title.trim(), (description || '').trim(), assigneeId, priority || 'medium', dueDate, req.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['todo', 'in_progress', 'done'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Недопустимый статус.' });
    }

    const result = await query(
      `UPDATE tasks SET status = $1 WHERE id = $2 RETURNING ${TASK_FIELDS}`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
