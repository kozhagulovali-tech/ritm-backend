import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, fio, email, position FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
