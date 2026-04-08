const path = require('path');
const sqlite3 = require('sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'voting.db');

function openDb() {
  return new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) console.error('Failed to open DB:', err.message);
  });
}

async function init() {
  const db = openDb();
    await run(db, `CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      party TEXT,
      imageURL TEXT NOT NULL,
      voteCount INTEGER DEFAULT 0
    )`);
  db.close();
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function getCandidates() {
  const db = openDb();
  try {
    const rows = await all(db, 'SELECT id, name, party, imageURL, voteCount FROM candidates');
    return rows;
  } finally {
    db.close();
  }
}

async function getResults() {
  const db = openDb();
  try {
    const rows = await all(db, 'SELECT id, name, party, imageURL, voteCount FROM candidates ORDER BY voteCount DESC');
    return rows;
  } finally {
    db.close();
  }
}

async function addCandidate({ name, party = '', imageURL }) {
  const db = openDb();
  try {
    const stmt = await run(db, 'INSERT INTO candidates (name, party, imageURL, voteCount) VALUES (?, ?, ?, 0)', [name, party, imageURL]);
    const id = stmt.lastID;
    return { id, name, party, imageURL, voteCount: 0 };
  } finally {
    db.close();
  }
}

async function incrementVote(candidateId) {
  const db = openDb();
  // Ensure atomic update using a serialized transaction
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('UPDATE candidates SET voteCount = voteCount + 1 WHERE id = ?');
      stmt.run(candidateId, function (err) {
        if (err) {
          db.run('ROLLBACK', () => {
            stmt.finalize();
            db.close();
            return reject(err);
          });
        } else {
          stmt.finalize((finalizeErr) => {
            if (finalizeErr) {
              db.run('ROLLBACK', () => {
                db.close();
                return reject(finalizeErr);
              });
            } else {
              db.run('COMMIT', async (commitErr) => {
                if (commitErr) {
                  db.run('ROLLBACK', () => { db.close(); return reject(commitErr); });
                } else {
                  const results = await getResults();
                  db.close();
                  return resolve(results);
                }
              });
            }
          });
        }
      });
    });
  });
}

module.exports = {
  init,
  getCandidates,
  getResults,
  incrementVote
};

