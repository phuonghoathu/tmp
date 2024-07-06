const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data.db'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS words (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            english TEXT,
            vietnamese TEXT,
            session TEXT,
            level TEXT,
            description TEXT,
            imageUrl TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS topic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            session TEXT,
            session_encode
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS encoded_data (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS user 
        (username TEXT, password TEXT, active INTEGER, last_login TEXT)`);
        
        // Insert dummy users for example purposes
        db.run("INSERT INTO user (username, password, active, last_login) VALUES ('teacher', 'a', 1, NULL)");
        db.run("INSERT INTO user (username, password, active, last_login) VALUES ('user', 'a', 1, NULL)");

        db.run(`INSERT INTO topic (username, session, session_encode)  VALUES ('teacher','Session01','e87120c1b331a44cecc60380e2286978')`);
        db.run(`INSERT INTO topic (username, session, session_encode)  VALUES ('user','Session01','5e0a9d73ec8c67fd451c879366cb4f98')`);
        
    }
});
