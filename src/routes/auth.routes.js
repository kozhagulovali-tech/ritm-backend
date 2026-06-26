import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, fio, email, position FROM users WHERE id = $1', [
      req.userId,
    ]);
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { fio, email, position, password } = req.body;
    if (!fio || !email || !position || !password || password.length < 4) {
      return res
        .status(400)
        .json({ error: 'Заполните ФИО, почту, должность и пароль (от 4 символов).' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Эта почта уже зарегистрирована — попробуйте войти.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (fio, email, position, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, fio, email, position`,
      [fio.trim(), email.toLowerCase().trim(), position.trim(), passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Введите почту и пароль.' });
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [
      email.toLowerCase().trim(),
    ]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Пользователь с такой почтой не найден.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный пароль.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: { id: user.id, fio: user.fio, email: user.email, position: user.position },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
