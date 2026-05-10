const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Use Railway Volume at /data if it exists, otherwise local directory
function resolveDbPath() {
    if (process.env.DB_PATH) return process.env.DB_PATH;
    if (fs.existsSync('/data')) return '/data/landing.db';
    return path.join(__dirname, 'landing.db');
}
const DB_PATH = resolveDbPath();
const DB_DIR = path.dirname(DB_PATH);
const CSV_PATH = path.join(DB_DIR, 'leads.csv');

process.on('uncaughtException', (err) => {
    console.error('FATAL CRASH (Uncaught Exception):', err.stack);
});

console.log('--- SYSTEM INITIALIZING ---');
console.log(`Target Database: ${DB_PATH}`);
console.log(`Target CSV: ${CSV_PATH}`);

// 1. Ensure Folder Exists
if (!fs.existsSync(DB_DIR)) {
    try {
        fs.mkdirSync(DB_DIR, { recursive: true });
        console.log(`Created Directory: ${DB_DIR}`);
    } catch (e) {
        console.error('FAILED TO CREATE DIRECTORY:', e.message);
    }
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('DB CONNECTION ERROR:', err.message);
    } else {
        console.log('Database Connected.');
        initDatabase();
    }
});

function initDatabase() {
    db.serialize(() => {
        // Create Tables
        db.run(`CREATE TABLE IF NOT EXISTS phone_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            page TEXT,
            session_id TEXT,
            country_code TEXT,
            phone TEXT,
            phone_full TEXT UNIQUE,
            user_agent TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS click_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page TEXT,
            x_percent REAL,
            y_percent REAL,
            x_px INTEGER,
            y_px INTEGER,
            element_tag TEXT,
            element_text TEXT,
            element_id TEXT,
            element_class TEXT,
            session_id TEXT,
            screen_width INTEGER,
            screen_height INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            event_type TEXT DEFAULT 'click',
            section TEXT
        )`);

        // 2. DATA RECOVERY: If DB is empty, try to restore from CSV
        db.get("SELECT COUNT(*) as count FROM phone_submissions", (err, row) => {
            if (!err && row.count === 0 && fs.existsSync(CSV_PATH)) {
                console.log('Database is empty. Restoring leads from CSV file...');
                const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').slice(1); // Skip header
                lines.forEach(line => {
                    if (!line.trim()) return;
                    // Simple CSV parser for our specific format
                    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                    if (parts && parts.length >= 6) {
                        const clean = parts.map(p => p.replace(/^"|"$/g, '').replace(/""/g, '"'));
                        db.run(`INSERT OR IGNORE INTO phone_submissions (created_at, page, phone_full, country_code, phone, session_id) VALUES (?, ?, ?, ?, ?, ?)`, 
                            [clean[0], clean[1], clean[2], clean[3], clean[4], clean[5]]);
                    }
                });
                console.log('Restoration complete.');
            }
        });
    });
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('API Stable & Online'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/clicks', (req, res) => {
    db.all('SELECT * FROM click_events ORDER BY created_at ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.get('/api/phones', (req, res) => {
    db.all('SELECT * FROM phone_submissions ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

app.post('/api/insert', (req, res) => {
    const { table, data } = req.body;
    if (!table || !data) return res.status(400).json({ error: 'Missing data' });
    
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(',');
    const cmd = table === 'phone_submissions' ? 'INSERT OR IGNORE' : 'INSERT';
    const sql = `${cmd} INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(sql, Object.values(data), function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Save to CSV if new unique lead
        if (table === 'phone_submissions' && this.changes > 0) {
            try {
                const csvLine = [
                    new Date().toISOString(),
                    data.page || '',
                    data.phone_full || '',
                    data.country_code || '',
                    data.phone || '',
                    data.session_id || ''
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
                
                if (!fs.existsSync(CSV_PATH)) {
                    fs.writeFileSync(CSV_PATH, 'Timestamp,Page,PhoneFull,CountryCode,Phone,SessionID\n');
                }
                fs.appendFileSync(CSV_PATH, csvLine);
            } catch (e) {
                console.error('CSV ERROR:', e.message);
            }
        }
        res.status(200).json({ id: this.lastID });
    });
});

// Full backup — returns all phones + clicks as JSON for safe-keeping before redeployment
app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM phone_submissions ORDER BY created_at ASC', [], (err, phones) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all('SELECT * FROM click_events ORDER BY created_at ASC', [], (err2, clicks) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.setHeader('Content-Disposition', 'attachment; filename="backup.json"');
            res.json({ phones: phones || [], clicks: clicks || [] });
        });
    });
});

// Restore from a backup JSON (only inserts missing rows — safe to run multiple times)
app.post('/api/import', (req, res) => {
    const { phones, clicks } = req.body || {};
    if (!Array.isArray(phones) && !Array.isArray(clicks)) {
        return res.status(400).json({ error: 'Expected { phones: [...], clicks: [...] }' });
    }
    let phonesImported = 0, clicksImported = 0;
    const stmt1 = db.prepare(`INSERT OR IGNORE INTO phone_submissions
        (created_at, page, session_id, country_code, phone, phone_full, user_agent)
        VALUES (?,?,?,?,?,?,?)`);
    (phones || []).forEach(p => {
        stmt1.run([p.created_at, p.page, p.session_id, p.country_code, p.phone, p.phone_full, p.user_agent],
            function() { if (this.changes > 0) phonesImported++; });
    });
    stmt1.finalize();

    const stmt2 = db.prepare(`INSERT INTO click_events
        (created_at, page, event_type, x_percent, y_percent, x_px, y_px,
         element_tag, element_text, element_id, element_class, section, session_id, screen_width, screen_height)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    (clicks || []).forEach(c => {
        stmt2.run([c.created_at, c.page, c.event_type, c.x_percent, c.y_percent, c.x_px, c.y_px,
            c.element_tag, c.element_text, c.element_id, c.element_class, c.section,
            c.session_id, c.screen_width, c.screen_height],
            function() { if (this.changes > 0) clicksImported++; });
    });
    stmt2.finalize(() => {
        res.json({ phonesImported, clicksImported });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- RUNNING ON PORT ${PORT} ---`);
    console.log(`Database: ${DB_PATH}`);
});
