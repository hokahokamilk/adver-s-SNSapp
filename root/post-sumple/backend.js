import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// .env ファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = 3000;

// public フォルダの静的ファイルを提供
app.use(express.static(path.join(__dirname, 'public')));

// POSTリクエストのデータ処理
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// MySQL接続設定
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// スレッド一覧ページ
app.get('/', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [threads] = await connection.execute(
      'SELECT thread_id, thread_name FROM threads ORDER BY created_at DESC;'
    );
    res.sendFile(path.join(__dirname, 'public', 'index.html'));  // index.html を表示
  } catch (error) {
    res.status(500).send('Error fetching threads: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});

// スレッド作成ページ
app.get('/create-thread', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'create-thread.html'));  // create-thread.html を表示
});

// スレッド作成処理（POST）
app.post('/create-thread', async (req, res) => {
  const { thread_name } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'INSERT INTO threads (thread_id, thread_name, genre_tag) VALUES (UUID(), ?, "");',
      [thread_name]
    );
    res.redirect(`/thread/${result.insertId}`);  // 作成したスレッドのページにリダイレクト
  } catch (error) {
    res.status(500).send('Error creating thread: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});

// スレッドページ（スレッドに関連する投稿を表示）
app.get('/thread/:id', async (req, res) => {
  const threadId = req.params.id;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [posts] = await connection.execute(
      'SELECT post_id, content, posted_at FROM posts WHERE thread_id = ? ORDER BY posted_at ASC;',
      [threadId]
    );
    res.sendFile(path.join(__dirname, 'public', 'thread-page.html'));  // thread-page.html を表示
  } catch (error) {
    res.status(500).send('Error fetching posts: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});

// 投稿作成処理（POST）
app.post('/create-post', async (req, res) => {
  const { thread_id, content } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    await connection.execute(
      'INSERT INTO posts (post_id, thread_id, user_id, content) VALUES (UUID(), ?, 0, ?);',
      [thread_id, content]
    );
    res.redirect(`/thread/${thread_id}`);  // 投稿後、スレッドページにリダイレクト
  } catch (error) {
    res.status(500).send('Error creating post: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

