require('dotenv').config();
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'supersecretkey',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Change to true if using HTTPS
        httpOnly: true,
        sameSite: 'lax'
    }
}));

const DATABASE_DIR = path.join(__dirname, 'databases');

if (!fs.existsSync(DATABASE_DIR)) {
    fs.mkdirSync(DATABASE_DIR);
}

function createUserDb(userId) {
    const dbPath = path.join(DATABASE_DIR, `${userId}.db`);
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS example (id INTEGER PRIMARY KEY, data TEXT)");
    });
    db.close();
    return dbPath;
}

function executeSql(userId, sql, callback) {
    const dbPath = path.join(DATABASE_DIR, `${userId}.db`);
    const db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.all(sql, [], (err, rows) => {
            db.close();
            callback(err, rows);
        });
    });
}

function executeMultipleSql(userId, sqlArray, callback) {
    const dbPath = path.join(DATABASE_DIR, `${userId}.db`);
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        sqlArray.forEach((sql, index) => {
            db.run(sql, [], (err) => {
                if (err) {
                    db.run("ROLLBACK");
                    db.close();
                    return callback(err);
                }
                // If this is the last query, commit the transaction
                if (index === sqlArray.length - 1) {
                    db.run("COMMIT", (commitErr) => {
                        db.close();
                        callback(commitErr);
                    });
                }
            });
        });
    });
}

app.post('/execute-multiple', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).json({ error: "No active session" });
    }

    const sqlArray = req.body.sqlArray;
    if (!sqlArray || !Array.isArray(sqlArray)) {
        return res.status(400).json({ error: "No SQL commands provided or not an array" });
    }

    executeMultipleSql(userId, sqlArray, (err, result) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ result: "All queries executed successfully" });
    });
});

app.post('/start', (req, res) => {
    const userId = uuidv4();
    req.session.userId = userId;
    createUserDb(userId);
    res.json({ message: "Game started", userId });
});

app.post('/execute', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).json({ error: "No active session" });
    }

    const sql = req.body.sql;
    if (!sql) {
        return res.status(400).json({ error: "No SQL command provided" });
    }

    executeSql(userId, sql, (err, result) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ sql, result });
    });
});

app.post('/end', (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(400).json({ error: "No active session" });
    }

    const dbPath = path.join(DATABASE_DIR, `${userId}.db`);
    if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
    }

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to end session" });
        }
        res.json({ message: "Game ended and database deleted" });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
