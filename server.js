const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'landing.db');
const CSV_PATH = path.join(path.dirname(DB_PATH), 'leads.csv');

console.log(`Attempting to connect to database at: ${DB_PATH}`);
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('DATABASE CONNECTION ERROR:', err.message);
    else console.log('Connected to the SQLite database.');
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('Service is up'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.get('/api/clicks', (req, res) => {
    db.all('SELECT * FROM click_events ORDER BY created_at ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/phones', (req, res) => {
    db.all('SELECT * FROM phone_submissions ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/insert', (req, res) => {
    const { table, data } = req.body;
    if (!table || !data) return res.status(400).json({ error: 'Missing table or data' });
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    
    // Use INSERT OR IGNORE for phone_submissions to handle duplicates silently
    const cmd = table === 'phone_submissions' ? 'INSERT OR IGNORE' : 'INSERT';
    const sql = `${cmd} INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
        if (err) {
            console.error('INSERT ERROR:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        // If it was a new unique phone submission, append to CSV
        if (table === 'phone_submissions' && this.changes > 0) {
            const row = [
                new Date().toISOString(),
                data.page || '',
                data.phone_full || '',
                data.country_code || '',
                data.phone || '',
                data.session_id || ''
            ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
            
            // Add header if file doesn't exist
            if (!fs.existsSync(CSV_PATH)) {
                fs.writeFileSync(CSV_PATH, 'Timestamp,Page,PhoneFull,CountryCode,Phone,SessionID\n');
            }
            fs.appendFileSync(CSV_PATH, row + '\n');
            console.log(`New lead saved to CSV: ${data.phone_full}`);
        }

        res.status(200).json({ id: this.lastID, affected: this.changes });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
});
