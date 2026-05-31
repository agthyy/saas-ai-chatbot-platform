import express from 'express';
import crypto from 'crypto';
import { getDB } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper to get business by user ID
async function getBusinessByUserId(db, userId) {
  return await db.get('SELECT * FROM businesses WHERE owner_id = ?', [userId]);
}

// GET /api/business - Get business details and dashboard stats
router.get('/', authenticateToken, requireRole('owner'), async (req, res) => {
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) {
      return res.status(404).json({ error: 'Бизнес не найден.' });
    }

    // Fetch stats
    const faqCount = await db.get('SELECT COUNT(*) as count FROM faqs WHERE business_id = ?', [business.id]);
    const slotCount = await db.get('SELECT COUNT(*) as count FROM slots WHERE business_id = ? AND status = "available"', [business.id]);
    const bookingCount = await db.get('SELECT COUNT(*) as count FROM bookings WHERE business_id = ?', [business.id]);
    const chatCount = await db.get('SELECT COUNT(*) as count FROM chats WHERE business_id = ?', [business.id]);

    res.json({
      business,
      stats: {
        faqs: faqCount.count,
        slots: slotCount.count,
        bookings: bookingCount.count,
        chats: chatCount.count
      }
    });
  } catch (error) {
    console.error('Fetch business error:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении данных бизнеса.' });
  }
});

// PUT /api/business - Update business settings
router.post('/', authenticateToken, requireRole('owner'), async (req, res) => {
  const { name, logo_url, color_theme, welcome_message, custom_api_key, plan } = req.body;
  const db = await getDB();

  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) {
      return res.status(404).json({ error: 'Бизнес не найден.' });
    }

    // Support updating plan directly for this demo (otherwise admin panels or billing handle it)
    await db.run(
      `UPDATE businesses 
       SET name = ?, logo_url = ?, color_theme = ?, welcome_message = ?, custom_api_key = ?, plan = COALESCE(?, plan)
       WHERE id = ?`,
      [
        name || business.name,
        logo_url !== undefined ? logo_url : business.logo_url,
        color_theme || business.color_theme,
        welcome_message || business.welcome_message,
        custom_api_key !== undefined ? custom_api_key : business.custom_api_key,
        plan || null,
        business.id
      ]
    );

    const updated = await db.get('SELECT * FROM businesses WHERE id = ?', [business.id]);
    res.json({ message: 'Настройки бизнеса обновлены.', business: updated });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ error: 'Ошибка сервера при обновлении настроек бизнеса.' });
  }
});

// GET /api/business/faq - Get FAQs
router.get('/faq', authenticateToken, requireRole('owner'), async (req, res) => {
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const faqs = await db.all('SELECT * FROM faqs WHERE business_id = ? ORDER BY created_at DESC', [business.id]);
    res.json({ faqs });
  } catch (error) {
    console.error('Fetch FAQ error:', error);
    res.status(500).json({ error: 'Ошибка при получении FAQ.' });
  }
});

// POST /api/business/faq - Create FAQ
router.post('/faq', authenticateToken, requireRole('owner'), async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Вопрос и ответ обязательны.' });
  }

  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const id = crypto.randomUUID();
    await db.run(
      'INSERT INTO faqs (id, business_id, question, answer, is_custom) VALUES (?, ?, ?, ?, ?)',
      [id, business.id, question, answer, 1]
    );

    const faq = await db.get('SELECT * FROM faqs WHERE id = ?', [id]);
    res.status(201).json({ message: 'Вопрос-ответ успешно добавлен.', faq });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Ошибка при добавлении FAQ.' });
  }
});

// PUT /api/business/faq/:id - Update FAQ
router.put('/faq/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Вопрос и ответ обязательны.' });
  }

  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    // Verify ownership
    const faq = await db.get('SELECT * FROM faqs WHERE id = ? AND business_id = ?', [id, business.id]);
    if (!faq) {
      return res.status(403).json({ error: 'Вы не можете изменить этот FAQ или он не существует.' });
    }

    await db.run(
      'UPDATE faqs SET question = ?, answer = ? WHERE id = ?',
      [question, answer, id]
    );

    const updated = await db.get('SELECT * FROM faqs WHERE id = ?', [id]);
    res.json({ message: 'FAQ успешно обновлен.', faq: updated });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении FAQ.' });
  }
});

// DELETE /api/business/faq/:id - Delete FAQ
router.delete('/faq/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const faq = await db.get('SELECT * FROM faqs WHERE id = ? AND business_id = ?', [id, business.id]);
    if (!faq) {
      return res.status(403).json({ error: 'Вы не можете удалить этот FAQ или он не существует.' });
    }

    await db.run('DELETE FROM faqs WHERE id = ?', [id]);
    res.json({ message: 'FAQ успешно удален.' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Ошибка при удалении FAQ.' });
  }
});

// GET /api/business/slots - Get Slots
router.get('/slots', authenticateToken, requireRole('owner'), async (req, res) => {
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const slots = await db.all('SELECT * FROM slots WHERE business_id = ? ORDER BY slot_date ASC, slot_time ASC', [business.id]);
    res.json({ slots });
  } catch (error) {
    console.error('Fetch slots error:', error);
    res.status(500).json({ error: 'Ошибка при получении слотов.' });
  }
});

// POST /api/business/slots - Create Slots
router.post('/slots', authenticateToken, requireRole('owner'), async (req, res) => {
  const { slot_date, slot_times } = req.body; // slot_times is an array of strings e.g. ["10:00", "12:00"]
  
  if (!slot_date || !slot_times || !Array.isArray(slot_times) || slot_times.length === 0) {
    return res.status(400).json({ error: 'Дата и список времени обязательны.' });
  }

  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    await db.run('BEGIN TRANSACTION');

    const createdSlots = [];
    for (const time of slot_times) {
      // Check if slot already exists
      const existing = await db.get(
        'SELECT * FROM slots WHERE business_id = ? AND slot_date = ? AND slot_time = ?',
        [business.id, slot_date, time]
      );
      if (!existing) {
        const id = crypto.randomUUID();
        await db.run(
          'INSERT INTO slots (id, business_id, slot_date, slot_time, status) VALUES (?, ?, ?, ?, ?)',
          [id, business.id, slot_date, time, 'available']
        );
        createdSlots.push({ id, business_id: business.id, slot_date, slot_time: time, status: 'available' });
      }
    }

    await db.run('COMMIT');
    res.status(201).json({ message: 'Слоты успешно созданы.', slots: createdSlots });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Create slots error:', error);
    res.status(500).json({ error: 'Ошибка при создании слотов.' });
  }
});

// DELETE /api/business/slots/:id - Delete Slot
router.delete('/slots/:id', authenticateToken, requireRole('owner'), async (req, res) => {
  const { id } = req.params;
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const slot = await db.get('SELECT * FROM slots WHERE id = ? AND business_id = ?', [id, business.id]);
    if (!slot) {
      return res.status(403).json({ error: 'Слот не найден или вы не можете его удалить.' });
    }

    if (slot.status === 'booked') {
      return res.status(400).json({ error: 'Нельзя удалить забронированный слот. Сначала отмените запись.' });
    }

    await db.run('DELETE FROM slots WHERE id = ?', [id]);
    res.json({ message: 'Слот успешно удален.' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Ошибка при удалении слота.' });
  }
});

// GET /api/business/bookings - Get Booking Appointments
router.get('/bookings', authenticateToken, requireRole('owner'), async (req, res) => {
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    // Join bookings with slots to show date/time details
    const bookings = await db.all(`
      SELECT b.*, s.slot_date, s.slot_time 
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      WHERE b.business_id = ?
      ORDER BY s.slot_date DESC, s.slot_time DESC
    `, [business.id]);
    
    res.json({ bookings });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка записей.' });
  }
});

// GET /api/business/chats - Get Chats and transcripts
router.get('/chats', authenticateToken, requireRole('owner'), async (req, res) => {
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const chats = await db.all(`
      SELECT c.*, 
        (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chats c
      WHERE c.business_id = ?
      ORDER BY last_message_time DESC
    `, [business.id]);

    res.json({ chats });
  } catch (error) {
    console.error('Fetch chats error:', error);
    res.status(500).json({ error: 'Ошибка при получении чатов.' });
  }
});

// GET /api/business/chats/:chatId/messages - Get Messages for specific chat
router.get('/chats/:chatId/messages', authenticateToken, requireRole('owner'), async (req, res) => {
  const { chatId } = req.params;
  const db = await getDB();
  try {
    const business = await getBusinessByUserId(db, req.user.id);
    if (!business) return res.status(404).json({ error: 'Бизнес не найден.' });

    const chat = await db.get('SELECT * FROM chats WHERE id = ? AND business_id = ?', [chatId, business.id]);
    if (!chat) {
      return res.status(403).json({ error: 'Доступ ограничен или чат не существует.' });
    }

    const messages = await db.all('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC', [chatId]);
    res.json({ messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Ошибка при получении сообщений чата.' });
  }
});

export default router;
