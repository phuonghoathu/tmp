const express = require('express');
const fs = require('fs');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const csvParser = require('csv-parser');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const wordCsvWriter = createObjectCsvWriter({
    path: 'words.csv',
    header: [
        { id: 'english', title: 'English' },
        { id: 'vietnamese', title: 'Vietnamese' },
        { id: 'session', title: 'Session' }
    ],
    append: true
});

const sessionCsvWriter = createObjectCsvWriter({
    path: 'sessions.csv',
    header: [
        { id: 'session', title: 'Session' }
    ],
    append: true
});

app.post('/add-word', (req, res) => {
    const { english, vietnamese, session } = req.body;
    const record = [{ english, vietnamese, session }];

    wordCsvWriter.writeRecords(record)
        .then(() => {
            res.json({ success: true });
        })
        .catch(error => {
            console.error('Error writing to CSV file', error);
            res.json({ success: false });
        });
});

app.get('/search-words', (req, res) => {
    console.log(req.query)
    const session_cs = req.query.keyw;
    console.log("session_cs")
    console.log(session_cs)
    const words = [];

    fs.createReadStream('words.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            if (row.Session === session_cs) {
                console.log(row)
                words.push({ english: row.English, vietnamese: row.Vietnamese });
            }
        })
        .on('end', () => {
            res.json({ success: true, words });
        })
        .on('error', (error) => {
            console.error('Error reading words.csv', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

app.post('/edit-word', (req, res) => {
    const { oldEnglish, oldVietnamese, newEnglish, newVietnamese } = req.body;
    const words = [];

    fs.createReadStream('words.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            if (row.English === oldEnglish && row.Vietnamese === oldVietnamese) {
                words.push({ English: newEnglish, Vietnamese: newVietnamese, Session: row.Session });
            } else {
                words.push(row);
                console.log("row")
                console.log(row)
            }
        })
        .on('end', () => {
            const csvWriter = createObjectCsvWriter({
                path: 'words.csv',
                header: [
                    { id: 'English', title: 'English' },
                    { id: 'Vietnamese', title: 'Vietnamese' },
                    { id: 'Session', title: 'Session' }
                ]
            });

            csvWriter.writeRecords(words)
                .then(() => {
                    res.json({ success: true });
                })
                .catch(error => {
                    console.error('Error writing to CSV file', error);
                    res.status(500).json({ success: false });
                });
        });
});

app.post('/delete-word', (req, res) => {
    const { english, vietnamese } = req.body;
    const words = [];

    fs.createReadStream('words.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            if (!(row.English === english && row.Vietnamese === vietnamese)) {
                words.push(row);
            }
        })
        .on('end', () => {
            const csvWriter = createObjectCsvWriter({
                path: 'words.csv',
                header: [
                    { id: 'English', title: 'English' },
                    { id: 'Vietnamese', title: 'Vietnamese' },
                    { id: 'Session', title: 'Session' }
                ]
            });
            console.log(words)
            csvWriter.writeRecords(words)
                .then(() => {
                    res.json({ success: true });
                })
                .catch(error => {
                    console.error('Error writing to CSV file', error);
                    res.status(500).json({ success: false });
                });
        });
});

app.get('/get-sessions', (req, res) => {
    const sessions = [];
    // Kiểm tra nếu file không tồn tại
    if (!fs.existsSync('sessions.csv')) {
        // Tạo file sessions.csv với tiêu đề nếu nó chưa tồn tại
        fs.writeFileSync('sessions.csv', 'Session\n');
    }

    fs.createReadStream('sessions.csv')
        .pipe(csvParser())
        .on('data', (row) => {
            sessions.push(row.session);
        })
        .on('end', () => {
            res.json({ sessions });
        })
        .on('error', (error) => {
            console.error('Error reading sessions.csv', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

app.post('/add-session', (req, res) => {
    const { session } = req.body;
    const record = [{ session }];

    sessionCsvWriter.writeRecords(record)
        .then(() => {
            res.json({ success: true });
        })
        .catch(error => {
            console.error('Error writing to sessions.csv', error);
            res.json({ success: false });
        });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
