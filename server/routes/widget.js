import express from 'express';
import crypto from 'crypto';
import { getDB } from '../db.js';

const router = express.Router();

// GET /api/widget/config - Public endpoint to get widget settings and available slots
router.get('/config', async (req, res) => {
  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({ error: 'Параметр businessId обязателен.' });
  }

  const db = await getDB();
  try {
    const business = await db.get(
      'SELECT id, name, logo_url, color_theme, welcome_message, active, template, plan FROM businesses WHERE id = ?',
      [businessId]
    );

    if (!business) {
      return res.status(404).json({ error: 'Бизнес не найден.' });
    }

    if (!business.active) {
      return res.json({ active: false, name: business.name });
    }

    // Get available slots
    const slots = await db.all(
      'SELECT id, slot_date, slot_time FROM slots WHERE business_id = ? AND status = "available" ORDER BY slot_date ASC, slot_time ASC',
      [businessId]
    );

    // Get services list depending on template
    let services = [];
    if (business.template === 'cafe') {
      services = ['Бронь столика', 'Заказ банкетного зала', 'Спецобслуживание'];
    } else if (business.template === 'salon') {
      services = ['Женская стрижка', 'Мужская стрижка', 'Окрашивание волос', 'Маникюр', 'Педикюр', 'Оформление бровей'];
    } else if (business.template === 'clinic') {
      services = ['Прием терапевта', 'Прием педиатра', 'Консультация кардиолога', 'Прием невролога', 'Забор анализов'];
    }

    res.json({
      active: true,
      name: business.name,
      logo_url: business.logo_url,
      color_theme: business.color_theme,
      welcome_message: business.welcome_message,
      template: business.template,
      plan: business.plan,
      slots,
      services
    });
  } catch (error) {
    console.error('Widget config error:', error);
    res.status(500).json({ error: 'Ошибка сервера.' });
  }
});

// POST /api/widget/chat - Public endpoint to send a message to the bot
router.post('/chat', async (req, res) => {
  const { businessId, visitorSessionId, message } = req.body;

  if (!businessId || !visitorSessionId || !message) {
    return res.status(400).json({ error: 'Необходимые поля: businessId, visitorSessionId, message.' });
  }

  const db = await getDB();
  try {
    const business = await db.get('SELECT * FROM businesses WHERE id = ?', [businessId]);
    if (!business) {
      return res.status(404).json({ error: 'Бизнес не найден.' });
    }

    if (!business.active) {
      return res.json({ reply: 'Извините, этот бот временно отключен администратором.' });
    }

    // 1. Get or create chat session
    let chat = await db.get(
      'SELECT * FROM chats WHERE business_id = ? AND visitor_session_id = ?',
      [businessId, visitorSessionId]
    );

    if (!chat) {
      const chatId = crypto.randomUUID();
      await db.run(
        'INSERT INTO chats (id, business_id, visitor_session_id) VALUES (?, ?, ?)',
        [chatId, businessId, visitorSessionId]
      );
      chat = { id: chatId, business_id: businessId, visitor_session_id: visitorSessionId };
    }

    // 2. Save visitor message
    const visitorMsgId = crypto.randomUUID();
    await db.run(
      'INSERT INTO messages (id, chat_id, sender, text) VALUES (?, ?, ?, ?)',
      [visitorMsgId, chat.id, 'visitor', message]
    );

    // 3. Load FAQs and available slots for system prompt context
    const faqs = await db.all('SELECT question, answer FROM faqs WHERE business_id = ?', [businessId]);
    const slots = await db.all(
      'SELECT slot_date, slot_time FROM slots WHERE business_id = ? AND status = "available" ORDER BY slot_date ASC, slot_time ASC LIMIT 10',
      [businessId]
    );

    // Format slots for prompt
    const slotsStr = slots.length > 0 
      ? slots.map(s => `${s.slot_date} в ${s.slot_time}`).join('\n')
      : 'Нет свободных слотов. Пожалуйста, обратитесь позже или попросите администратора добавить слоты.';

    // Format FAQs for prompt
    const faqsStr = faqs.map((f, idx) => `Вопрос ${idx+1}: ${f.question}\nОтвет ${idx+1}: ${f.answer}`).join('\n\n');

    // 4. Load recent messages for context
    const recentMessages = await db.all(
      'SELECT sender, text FROM messages WHERE chat_id = ? ORDER BY created_at DESC LIMIT 6',
      [chat.id]
    );
    // Reverse to get chronological order
    recentMessages.reverse();

    // 5. Check if API keys are available
    const openRouterKey = business.custom_api_key || process.env.OPENROUTER_API_KEY;

    let aiReply = '';

    if (openRouterKey) {
      // Build messages array for AI
      const systemPrompt = `Вы — вежливый и услужливый ИИ-ассистент компании "${business.name}" (Тип бизнеса: ${business.template}).
Ваша задача — отвечать на вопросы посетителей, используя информацию из Базы знаний (FAQ) ниже.

База знаний (FAQ):
${faqsStr}

Доступные свободные слоты для записи:
${slotsStr}

ПРАВИЛА ОТВЕТА:
1. Отвечайте коротко, понятно и вежливо на русском языке.
2. Дайте ответ строго на основе Базы знаний (FAQ). Если в базе знаний нет точного ответа, вежливо ответьте, что вы не знаете или перенаправите вопрос менеджеру, не придумывайте лишней информации.
3. Если клиент выражает желание записаться или спрашивает про свободное время, перечислите несколько доступных слотов из списка выше и скажите, что он может оформить запись через форму записи прямо здесь, кликнув по кнопке календаря в виджете.
4. Не используйте сложные Markdown-форматы (кроме списков или жирного текста для акцентов).
5. Ведите диалог как живой менеджер.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.sender === 'visitor' ? 'user' : 'assistant',
          content: m.text
        }))
      ];

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'https://saas-ai-chatbot.local', // Required by OpenRouter
            'X-Title': 'SaaS AI Chatbot Platform'
          },
          body: JSON.stringify({
            model: 'google/gemma-2-9b-it:free', // reliable free model
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 400
          })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
          aiReply = data.choices[0].message.content.trim();
        } else {
          console.error('OpenRouter response error:', data);
          throw new Error('Invalid OpenRouter response');
        }
      } catch (err) {
        console.error('API Chat request failed:', err);
        // Fallback if API fails
        aiReply = getLocalFallbackReply(message, faqs, slots);
      }
    } else {
      // Fallback if no API keys are provided
      aiReply = getLocalFallbackReply(message, faqs, slots);
    }

    // 6. Save bot reply
    const botMsgId = crypto.randomUUID();
    await db.run(
      'INSERT INTO messages (id, chat_id, sender, text) VALUES (?, ?, ?, ?)',
      [botMsgId, chat.id, 'bot', aiReply]
    );

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Ошибка сервера во время обработки сообщения.' });
  }
});

// Helper for local rule-based match if API is unavailable or disabled
function getLocalFallbackReply(userMessage, faqs, slots) {
  const cleanMsg = userMessage.toLowerCase();
  
  // Check for booking keywords
  if (cleanMsg.includes('запис') || cleanMsg.includes('заброниров') || cleanMsg.includes('время') || cleanMsg.includes('слот') || cleanMsg.includes('свободн')) {
    if (slots.length === 0) {
      return 'К сожалению, на ближайшее время нет свободных слотов для записи.';
    }
    const slotsText = slots.map(s => `• ${s.slot_date} в ${s.slot_time}`).join('\n');
    return `Конечно! Вы можете записаться, выбрав свободную дату и время через кнопку календаря в чате. Вот ближайшие свободные слоты:\n${slotsText}`;
  }

  // Check FAQs
  for (const faq of faqs) {
    const q = faq.question.toLowerCase();
    if (cleanMsg.includes(q) || q.includes(cleanMsg)) {
      return faq.answer;
    }
  }

  // Keyword-based search
  for (const faq of faqs) {
    const keywords = faq.question.toLowerCase().split(/[ ,.?!\n]+/);
    const matches = keywords.filter(word => word.length > 3 && cleanMsg.includes(word));
    if (matches.length >= 2) {
      return faq.answer;
    }
  }

  return 'Здравствуйте! Спасибо за ваш вопрос. Я могу рассказать вам о наших услугах, времени работы, адресе или помочь записаться на свободное время. Уточните, пожалуйста, ваш вопрос.';
}

// POST /api/widget/book - Public endpoint to create booking
router.post('/book', async (req, res) => {
  const { businessId, slotId, customerName, customerPhone, serviceName, visitorSessionId } = req.body;

  if (!businessId || !slotId || !customerName || !customerPhone || !serviceName) {
    return res.status(400).json({ error: 'Все поля (businessId, slotId, customerName, customerPhone, serviceName) обязательны.' });
  }

  const db = await getDB();
  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Verify and lock the slot
    const slot = await db.get(
      'SELECT * FROM slots WHERE id = ? AND business_id = ? AND status = "available"',
      [slotId, businessId]
    );

    if (!slot) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Этот временной слот уже занят или не существует.' });
    }

    // 2. Mark slot as booked
    await db.run('UPDATE slots SET status = "booked" WHERE id = ?', [slotId]);

    // 3. Create booking
    const bookingId = crypto.randomUUID();
    await db.run(
      `INSERT INTO bookings (id, business_id, slot_id, customer_name, customer_phone, service_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookingId, businessId, slotId, customerName, customerPhone, serviceName]
    );

    // 4. Save booking confirmation in chat if visitorSessionId is provided
    if (visitorSessionId) {
      const chat = await db.get(
        'SELECT id FROM chats WHERE business_id = ? AND visitor_session_id = ?',
        [businessId, visitorSessionId]
      );
      if (chat) {
        const botConfirmText = `✅ Успешная запись!\nКлиент: ${customerName}\nУслуга: ${serviceName}\nДата: ${slot.slot_date}\nВремя: ${slot.slot_time}\nМы ждем вас!`;
        await db.run(
          'INSERT INTO messages (id, chat_id, sender, text) VALUES (?, ?, ?, ?)',
          [crypto.randomUUID(), chat.id, 'bot', botConfirmText]
        );
      }
    }

    await db.run('COMMIT');
    res.status(201).json({
      message: 'Запись успешно создана!',
      booking: {
        id: bookingId,
        slot_date: slot.slot_date,
        slot_time: slot.slot_time,
        customer_name: customerName,
        service_name: serviceName
      }
    });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Booking confirmation error:', error);
    res.status(500).json({ error: 'Произошла ошибка на сервере при оформлении записи.' });
  }
});

export default router;
