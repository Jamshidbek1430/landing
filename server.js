const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'landing.db');
const DB_DIR = path.dirname(DB_PATH);
const CSV_PATH = path.join(DB_DIR, 'leads.csv');

// GLOBAL ERROR CATCHER - This will log exactly why it crashes
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR (Uncaught Exception):', err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});

console.log('--- SERVER STARTING ---');
console.log(`Port: ${PORT}`);
console.log(`Database Directory: ${DB_DIR}`);
console.log(`Database Path: ${DB_PATH}`);

// Ensure directory exists with better error reporting
try {
    console.log(`Checking directory: ${DB_DIR}`);
    if (!fs.existsSync(DB_DIR)) {
        console.log(`Creating directory: ${DB_DIR}`);
        fs.mkdirSync(DB_DIR, { recursive: true });
    }
    // Test write permission
    const testFile = path.join(DB_DIR, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`Write permission verified for: ${DB_DIR}`);
} catch (e) {
    console.error('FATAL PERMISSION ERROR:', e.message);
    console.error('Falling back to local directory for database.');
    // Fallback to local path if /data is not writable
    process.env.DB_PATH = path.join(__dirname, 'landing.db');
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('DATABASE CONNECTION ERROR:', err.message);
    } else {
        console.log('Successfully connected to SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS phone_submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            page TEXT,
            session_id TEXT,
            country_code TEXT,
            phone TEXT,
            phone_full TEXT UNIQUE,
            user_agent TEXT
        )`, (err) => {
            if (err) console.error('TABLE CREATION ERROR (phones):', err.message);
        });
        
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
        )`, (err) => {
            if (err) console.error('TABLE CREATION ERROR (clicks):', err.message);
        });
    }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('API is Online'));
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
    if (!table || !data) return res.status(400).json({ error: 'Missing table or data' });
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    
    const cmd = table === 'phone_submissions' ? 'INSERT OR IGNORE' : 'INSERT';
    const sql = `${cmd} INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
        if (err) {
            console.error('INSERT ERROR:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        if (table === 'phone_submissions' && this.changes > 0) {
            try {
                const row = [
                    new Date().toISOString(),
                    data.page || '',
                    data.phone_full || '',
                    data.country_code || '',
                    data.phone || '',
                    data.session_id || ''
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
                
                if (!fs.existsSync(CSV_PATH)) {
                    fs.writeFileSync(CSV_PATH, 'Timestamp,Page,PhoneFull,CountryCode,Phone,SessionID\n');
                }
                fs.appendFileSync(CSV_PATH, row + '\n');
                console.log(`New lead saved to CSV: ${data.phone_full}`);
            } catch (csvErr) {
                console.error('CSV WRITE ERROR:', csvErr.message);
            }
        }

        res.status(200).json({ id: this.lastID, affected: this.changes });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`--- SERVER IS LIVE ON PORT ${PORT} ---`);
});
