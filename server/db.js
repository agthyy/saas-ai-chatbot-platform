import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'database.sqlite');

let dbConnection = null;

export async function getDB() {
  if (dbConnection) return dbConnection;
  
  dbConnection = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  
  return dbConnection;
}

export async function initDB() {
  const db = await getDB();
  
  // Enable foreign keys
  await db.run('PRAGMA foreign_keys = ON;');
  
  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'owner')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create Businesses table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      template TEXT NOT NULL CHECK(template IN ('cafe', 'salon', 'clinic')),
      logo_url TEXT,
      active BOOLEAN DEFAULT 1,
      plan TEXT DEFAULT 'trial' CHECK(plan IN ('trial', 'pro', 'enterprise')),
      custom_api_key TEXT,
      color_theme TEXT DEFAULT '#3b82f6',
      welcome_message TEXT DEFAULT 'Привет! Чем я могу помочь вам сегодня?',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create FAQs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      is_custom BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Create Slots table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      slot_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      status TEXT DEFAULT 'available' CHECK(status IN ('available', 'booked')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Create Bookings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      slot_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      service_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES slots(id) ON DELETE CASCADE
    );
  `);

  // Create Chats table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      visitor_session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  // Create Messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('visitor', 'bot', 'owner')),
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    );
  `);

  // Seed default Platform Admin if not present
  const adminEmail = 'admin@platform.com';
  const existingAdmin = await db.get('SELECT * FROM users WHERE email = ?', [adminEmail]);
  if (!existingAdmin) {
    const adminId = 'admin-user-id-001';
    const passwordHash = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [adminId, adminEmail, passwordHash, 'admin']
    );
    console.log('Seeded default platform admin (admin@platform.com / admin123)');
  }
}
