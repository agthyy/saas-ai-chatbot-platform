import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDB } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-key-12345';

const DEFAULT_FAQS = {
  cafe: [
    { question: 'Какое у вас меню?', answer: 'У нас есть классический кофе (эспрессо, капучино, латте), авторские чаи, свежая выпечка, круассаны и десерты. Цены на напитки от 150 до 350 рублей.' },
    { question: 'Какое время работы?', answer: 'Мы открыты каждый день с 08:00 до 22:00.' },
    { question: 'Где вы находитесь?', answer: 'Мы находимся по адресу: ул. Кофейная, д. 10. Ждем вас!' },
    { question: 'Есть ли у вас Wi-Fi и розетки?', answer: 'Да, у нас есть бесплатный быстрый Wi-Fi и розетки около большинства столиков. Идеально для работы и учебы!' }
  ],
  salon: [
    { question: 'Какие услуги вы предлагаете?', answer: 'Мы предлагаем мужские и женские стрижки, окрашивание волос любой сложности, маникюр, педикюр, а также профессиональный макияж и оформление бровей.' },
    { question: 'Какое время работы и адрес?', answer: 'Салон работает ежедневно с 10:00 до 21:00 по адресу: ул. Красивая, д. 25.' },
    { question: 'Сколько стоит маникюр с покрытием?', answer: 'Классический маникюр с покрытием гель-лак стоит от 1500 рублей в зависимости от категории мастера.' },
    { question: 'Можно ли прийти без записи?', answer: 'Мы рекомендуем бронировать время заранее, но если есть свободные мастера, мы с радостью примем вас без записи. Вы можете записаться прямо сейчас в чате!' }
  ],
  clinic: [
    { question: 'Какие врачи у вас принимают?', answer: 'В нашей клинике принимают высококвалифицированные специалисты: терапевт, педиатр, кардиолог, невролог, гинеколог и эндокринолог. Также доступен забор всех видов анализов.' },
    { question: 'Какое время работы?', answer: 'Мы работаем с понедельника по субботу с 08:00 до 20:00. Воскресенье — выходной.' },
    { question: 'Где вы находитесь?', answer: 'Наш медицинский центр расположен по адресу: ул. Здоровья, д. 5.' },
    { question: 'Сколько стоит первичный прием терапевта?', answer: 'Первичная консультация врача-терапевта стоит 2500 рублей, повторный прием по тому же заболеванию — 2000 рублей.' }
  ]
};

// Register Owner
router.post('/register', async (req, res) => {
  const { email, password, businessName, template } = req.body;

  if (!email || !password || !businessName || !template) {
    return res.status(400).json({ error: 'Пожалуйста, заполните все поля.' });
  }

  if (!['cafe', 'salon', 'clinic'].includes(template)) {
    return res.status(400).json({ error: 'Неверный шаблон бизнеса.' });
  }

  const db = await getDB();

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован.' });
    }

    const userId = crypto.randomUUID();
    const businessId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    // Create User
    await db.run(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, email, passwordHash, 'owner']
    );

    await db.run(
      'INSERT INTO businesses (id, owner_id, name, template, welcome_message) VALUES (?, ?, ?, ?, ?)',
      [
        businessId,
        userId,
        businessName,
        template,
        template === 'cafe' 
          ? `Приветствуем в ${businessName}! Чем я могу помочь вам сегодня?`
          : template === 'salon'
          ? `Здравствуйте! Добро пожаловать в ${businessName}! Какую процедуру вы хотели бы выбрать?`
          : `Добрый день! Вы обратились в клинику ${businessName}. Какая медицинская услуга вас интересует?`
      ]
    );

    // Seed default FAQs for selected template
    const faqs = DEFAULT_FAQS[template] || [];
    for (const faq of faqs) {
      await db.run(
        'INSERT INTO faqs (id, business_id, question, answer, is_custom) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), businessId, faq.question, faq.answer, 0]
      );
    }

    // Seed default available slots for the next 3 days
    const today = new Date();
    const timeSlots = ['10:00', '12:00', '14:00', '16:00', '18:00'];
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);
      const dateString = targetDate.toISOString().split('T')[0];
      
      // Skip Sundays for clinics
      if (template === 'clinic' && targetDate.getDay() === 0) continue;

      for (const time of timeSlots) {
        await db.run(
          'INSERT INTO slots (id, business_id, slot_date, slot_time, status) VALUES (?, ?, ?, ?, ?)',
          [crypto.randomUUID(), businessId, dateString, time, 'available']
        );
      }
    }

    await db.run('COMMIT');

    // Create token
    const token = jwt.sign({ id: userId, email, role: 'owner' }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Регистрация прошла успешно.',
      token,
      user: { id: userId, email, role: 'owner' }
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Произошла ошибка при регистрации.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Пожалуйста, введите email и пароль.' });
  }

  const db = await getDB();

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Неверный email или пароль.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Неверный email или пароль.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Вход выполнен успешно.',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Произошла ошибка при входе.' });
  }
});

// Get profile
router.get('/me', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Нет токена.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = await getDB();
    const user = await db.get('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден.' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Невалидный токен.' });
  }
});

export default router;
