const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database(path.join(__dirname, 'data.db'));

app.post('/add-word', (req, res) => {
    const { english, vietnamese, session } = req.body;
    console.log(req.body)
    db.run(`INSERT INTO words (english, vietnamese, session) VALUES (?, ?, ?)`,
        [english, vietnamese, session],
        function(err) {
            if (err) {
                console.error('Error inserting word', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true });
            }
        });
});

app.post('/edit-word', (req, res) => {
    const { oldEnglish, oldVietnamese, newEnglish, newVietnamese } = req.body;
    db.run(`UPDATE words SET english = ?, vietnamese = ? WHERE english = ? AND vietnamese = ?`,
        [newEnglish, newVietnamese, oldEnglish, oldVietnamese],
        function(err) {
            if (err) {
                console.error('Error updating word', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true });
            }
        });
});

app.post('/delete-word', (req, res) => {
    const { english, vietnamese } = req.body;
    db.run(`DELETE FROM words WHERE english = ? AND vietnamese = ?`,
        [english, vietnamese],
        function(err) {
            if (err) {
                console.error('Error deleting word', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true });
            }
        });
});

app.get('/search-words', (req, res) => {
    const session = req.query.keyw;
    db.all(`SELECT english, vietnamese FROM words WHERE session = ?`,
        [session],
        (err, rows) => {
            if (err) {
                console.error('Error querying words', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true, words: rows });
            }
        });
});

app.get('/get-sessions', (req, res) => {
    db.all(`SELECT session FROM sessions`, [], (err, rows) => {
        if (err) {
            console.error('Error querying sessions', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, sessions: rows.map(row => row.session) });
        }
    });
});

app.post('/add-session', (req, res) => {
    const { session } = req.body;
    db.run(`INSERT INTO sessions (session) VALUES (?)`, [session], function(err) {
        if (err) {
            console.error('Error inserting session', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
