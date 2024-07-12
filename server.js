const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
var crypto = require('crypto')
const zlib = require('zlib');
const multer = require('multer');
const path = require('path');
const Hashids = require('hashids/cjs');
const hashids = new Hashids('my salt', 16);
const session = require('express-session');

//var name = 'user_Session01';
//var hash = crypto.createHash('md5').update(name).digest('hex');
//console.log(hash); // 9b74c9897bac770ffc029102a200c5de

const db = new sqlite3.Database(path.join(__dirname, 'data.db'));


// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const session = req.body.session?req.body.session:file.originalname;
        const english = req.body.english?req.body.english:"";
        cb(null, `${session}_${english}.jpg`);
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));


app.use(session({
    secret: 'xvKtGHewe',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

function checkAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
}


app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const stmt = db.prepare("SELECT * FROM user WHERE username = ? AND password = ? AND active = 1");
    stmt.get(username, password, (err, row) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Database error' });
        } else if (row) {
            req.session.user = username;
            db.run("UPDATE user SET last_login = datetime('now') WHERE username = ?", [username]);
            res.json({ success: true });
        } else {
            res.json({ success: false, message: 'Invalid username or password' });
        }
    });
    stmt.finalize();
});



app.use((req, res, next) => {
    console.log(req.path)
    if (req.path === '/add.html' && !req.session.user) {
        return res.redirect('/login.html');
    }
    next();
});

app.get('/add.html', (req, res) => {
    res.sendFile(__dirname + '/public/add.html');
});


app.post('/add-word',checkAuthentication ,upload.single('image'),upload.single('audio'), (req, res) => {
    const username = req.session.user;
    const { english, vietnamese, session, level, description } = req.body;
    const imageUrl = req.file ? req.file.filename : null;

    const stmt = db.prepare("INSERT INTO words (english, vietnamese, session, username, level, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)");
    stmt.run(english, vietnamese, session, username, level, description, imageUrl, (err) => {
        if (err) {
            res.status(500).json({ success: false, message: 'Database error' });
        } else {
            res.json({ success: true });
        }
    });
    stmt.finalize();
});


app.post('/edit-word', checkAuthentication, upload.single('newImage'), (req, res) => {
    const { id, newEnglish, newVietnamese, newLevel, newDescription } = req.body;
    const newImageUrl = req.file ? req.file.filename : null;

    const updateFields = [];
    const updateValues = [];

    if (newEnglish) {
        updateFields.push('english = ?');
        updateValues.push(newEnglish);
    }
    if (newVietnamese) {
        updateFields.push('vietnamese = ?');
        updateValues.push(newVietnamese);
    }
    if (newLevel) {
        updateFields.push('level = ?');
        updateValues.push(newLevel);
    }
    if (newDescription) {
        updateFields.push('description = ?');
        updateValues.push(newDescription);
    }
    if (newImageUrl) {
        updateFields.push('imageUrl = ?');
        updateValues.push(newImageUrl);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updateValues.push(id);

    const sql = `UPDATE words SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log(sql)
    db.run(sql, updateValues, function (err) {
        if (err) {
            console.error('Error updating word', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true });
        }
    });
});

app.post('/delete-word', checkAuthentication, (req, res) => {
    const username = req.session.user;
    const { id } = req.body;
    db.run(`DELETE FROM words WHERE id = ?`,
        [id],
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
    db.all(`SELECT id, english, vietnamese ,level ,description,imageUrl FROM words WHERE session = ?`,
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

app.post('/create-url',checkAuthentication, (req, res) => {
    const data = req.body;
    data.username =  req.session.user

    // Convert data object to JSON string
    const dataString = JSON.stringify(data);
    console.log(dataString)

    // Compress the data string
    zlib.deflate(dataString, (err, buffer) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Compression error' });
        }

        // Create a hash of the compressed data
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Use Hashids to create a short unique ID
        const shortId = hashids.encodeHex(hash.slice(0, 8)); // Using part of the hash for shorter ID

        // Store the compressed and encrypted data in the database
        let url = ""
        db.run(`INSERT INTO encoded_data (id, data) VALUES (?, ?)`, [shortId, buffer.toString('base64')], function(err) {
            if (err) {
                let restThat = res;
                db.get(`SELECT data FROM encoded_data WHERE id = ?`, [shortId], (err, row) => {
                    if (!err) {
                        console.log("Error get old")
                    }
                    if (!row) {
                        console.log("Not exits data")
                    }
                    url = row.data;
                });
            }
            // Create URL with short ID
            url = `http://localhost:3000/?data=${encodeURIComponent(shortId)}`;
            console.log(url)

            res.json({ success: true, url });
        });
    });
});

// Add a route to decrypt the data
app.get('/quiz', (req, res) => {
    const shortId = req.query.data;

    if (!shortId) {
        return res.status(400).json({ success: false, message: 'No data provided' });
    }

    data = {};
    // Retrieve the original compressed and encrypted data using the short ID
    db.get(`SELECT data FROM encoded_data WHERE id = ?`, [shortId], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ success: false, message: 'Data not found' });
        }

        // Decompress the data
        const buffer = Buffer.from(row.data, 'base64');
        zlib.inflate(buffer, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Decompression error' });
            }

            // Parse the decompressed data
            data = JSON.parse(result.toString());
            console.log(data)
            getWord(data, res)
        });
    });

});

function getWord(data, res) {
    const session = data.session;
    const numberQuestion = data.numberQuestion;
    const hard = data.hard;
    const medium = data.medium;
    const easy = data.easy;
    const username = data.username;
    remainQuestion = 0;
    notIn = [];

    if (numberQuestion) {
        remainQuestion = Number(numberQuestion);
    }
    let baseQuery = `SELECT * FROM words WHERE username = ?`;
    let queryParams = []
    let queryParts = [];
    if (hard) {
        queryParts.push(`SELECT * FROM (SELECT * FROM words WHERE username = ? AND level = 'Hard' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(hard);
        notIn.push('Hard');
        queryParams.push(Number(hard));
    }
    if (medium) {
        queryParts.push(`SELECT * FROM (SELECT * FROM words WHERE username = ? AND level = 'Medium' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(medium);
        notIn.push('Medium');
        queryParams.push(Number(medium));
    }
    if (easy) {
        queryParts.push(`SELECT * FROM  (SELECT * FROM words WHERE username = ? AND level = 'Easy' ${session && session !== 'all' ? 'AND session = ?' : ''} LIMIT ?)`);
        queryParams.push(username);
        if (session && session !== 'all') queryParams.push(session);
        remainQuestion = remainQuestion - Number(easy);
        notIn.push('easy');
        queryParams.push(Number(easy));
    }

    if (remainQuestion > 0 && notIn.length != 3) {
        queryParams.push(username);
        if (session && session !== 'all') {
            baseQuery += ` AND session = ?`;
            queryParams.push(session);
        }
        if(notIn.length == 0) {
            queryParams.push(Number(remainQuestion));
            queryParts.push(`SELECT * FROM  ( ` + baseQuery + ` LIMIT ? )`);
        } else {
            queryParams.push(Number(remainQuestion));
            queryParts.push( `SELECT * FROM  ( ` + baseQuery + ` and level not in ('` + notIn.join('\',\'') + `') LIMIT ? )`);
        }
    }
    if(queryParts.length == 0) {
        queryParams.push(username);
        if (session && session !== 'all') {
            baseQuery += ` AND session = ?`;
            queryParams.push(session);
        }
        
        queryParts.push(baseQuery)
    }

    finalQuery = queryParts.join(' UNION ALL ');

    console.log(finalQuery)
    db.all(finalQuery, queryParams, (err, rows) => {
        if (err) {
            console.error('Error retrieving words', err.message);
            res.status(500).json({ success: false, message: 'Database error' });
        } else {

            res.json({ success: true, 
                type:data.type, 
                time:data.time,
                tryAgainTimes:data.tryAgainTimes,
                wrongMinusScoreHard:data.wrongMinusScore.hard,
                wrongMinusScoreMedium:data.wrongMinusScore.medium,
                wrongMinusScoreEasy:data.wrongMinusScore.easy,
                rightPlusScoreHard:data.rightPlusScore.hard,
                rightPlusScoreMedium:data.rightPlusScore.medium,
                rightPlusScoreEasy:data.rightPlusScore.easy,
                skipMinusScoreHard:data.skipMinusScore.hard,
                skipMinusScoreMedium:data.skipMinusScore.medium,
                skipMinusScoreEasy:data.skipMinusScore.easy,
                hintMinusScoreHard:data.hintMinusScore.hard,
                hintMinusScoreMedium:data.hintMinusScore.medium,
                hintMinusScoreEasy:data.hintMinusScore.easy,
                skip:data.skip,
                hint:data.hint,
                maxHint:data.maxHint,
                correctCheck:data.correctCheck,
                correctDisplay:data.correctDisplay,
                words: rows });
        }
    });
}
app.get('/get-sessions',checkAuthentication, (req, res) => {
    const username = req.session.user;
    db.all(`SELECT session, session_encode FROM topic WHERE username = ?`, [username], (err, rows) => {
        if (err) {
            console.error('Error querying sessions', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, sessions: rows });
        }
    });
});

app.post('/add-session',checkAuthentication, (req, res) => {
    const username = req.session.user;
    const { session } = req.body;
    var tmp = username + '_' + session;
    var session_encode = crypto.createHash('md5').update(tmp).digest('hex');
    db.run(`INSERT INTO topic (username, session, session_encode) VALUES (?,?,?)`, [username,session,session_encode], function(err) {
        if (err) {
            console.error('Error inserting session', err.message);
            res.status(500).json({ success: false });
        } else {
            res.json({ success: true, session_encode: session_encode  });
        }
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
