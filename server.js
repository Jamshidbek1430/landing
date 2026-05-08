const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'landing.db');

console.log(`Attempting to connect to database at: ${DB_PATH}`);
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('DATABASE CONNECTION ERROR:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('Service is up'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// GET endpoint for click_events (Analytics)
app.get('/api/clicks', (req, res) => {
    db.all('SELECT * FROM click_events ORDER BY created_at ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET endpoint for phone_submissions (Analytics)
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
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
        if (err) {
            console.error('INSERT ERROR:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ id: this.lastID });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
});
