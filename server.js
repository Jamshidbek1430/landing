const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'landing.db');
const db = new sqlite3.Database(DB_PATH);

app.use(cors());
app.use(express.json());

// Railway often checks / to see if the service is alive
app.get('/', (req, res) => res.status(200).send('Service is up'));
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

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
