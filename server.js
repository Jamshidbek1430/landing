const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

// Use PORT from environment, default to 3000
const PORT = process.env.PORT || 3000;
// Persistent path for Railway volumes (or default to current directory)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'landing.db');
const db = new sqlite3.Database(DB_PATH);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/insert', (req, res) => {
    const { table, data } = req.body;
    if (!table || !data) return res.status(400).json({ error: 'Missing table or data' });
    
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(',');
    const sql = `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ id: this.lastID });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
