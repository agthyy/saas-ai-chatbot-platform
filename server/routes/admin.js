import express from 'express';
import { getDB } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Apply admin role restriction to all routes here
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/businesses - Get all businesses with owners details & stats
router.get('/businesses', async (req, res) => {
  const db = await getDB();
  try {
    const list = await db.all(`
      SELECT b.*, u.email as owner_email,
        (SELECT COUNT(*) FROM faqs WHERE business_id = b.id) as faq_count,
        (SELECT COUNT(*) FROM slots WHERE business_id = b.id) as total_slots,
        (SELECT COUNT(*) FROM bookings WHERE business_id = b.id) as booking_count,
        (SELECT COUNT(*) FROM chats WHERE business_id = b.id) as chat_count
      FROM businesses b
      JOIN users u ON b.owner_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json({ businesses: list });
  } catch (error) {
    console.error('Admin get businesses error:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении списка бизнесов.' });
  }
});

// PUT /api/admin/businesses/:id - Toggle bot status or change plan
router.put('/businesses/:id', async (req, res) => {
  const { id } = req.params;
  const { active, plan } = req.body;
  const db = await getDB();

  try {
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [id]);
    if (!business) {
      return res.status(404).json({ error: 'Бизнес не найден.' });
    }

    const updatedActive = active !== undefined ? (active ? 1 : 0) : business.active;
    const updatedPlan = plan || business.plan;

    await db.run(
      'UPDATE businesses SET active = ?, plan = ? WHERE id = ?',
      [updatedActive, updatedPlan, id]
    );

    const updated = await db.get('SELECT * FROM businesses WHERE id = ?', [id]);
    res.json({ message: 'Статус бизнеса успешно обновлен.', business: updated });
  } catch (error) {
    console.error('Admin update business error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении параметров бизнеса.' });
  }
});

// GET /api/admin/bookings - View all bookings across the platform
router.get('/bookings', async (req, res) => {
  const db = await getDB();
  try {
    const bookings = await db.all(`
      SELECT b.*, s.slot_date, s.slot_time, bus.name as business_name
      FROM bookings b
      JOIN slots s ON b.slot_id = s.id
      JOIN businesses bus ON b.business_id = bus.id
      ORDER BY s.slot_date DESC, s.slot_time DESC
    `);
    res.json({ bookings });
  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

// GET /api/admin/chats - View all chats across the platform
router.get('/chats', async (req, res) => {
  const db = await getDB();
  try {
    const chats = await db.all(`
      SELECT c.*, bus.name as business_name,
        (SELECT text FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chats c
      JOIN businesses bus ON c.business_id = bus.id
      ORDER BY last_message_time DESC
    `);
    res.json({ chats });
  } catch (error) {
    console.error('Admin get chats error:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

export default router;
