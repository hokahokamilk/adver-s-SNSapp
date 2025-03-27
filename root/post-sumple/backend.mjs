import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// .env ファイルの読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

const app = express();
const PORT = 3000;

// POSTリクエストのデータ処理
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// MySQL接続設定
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// スレッド一覧ページ
app.set('view engine', 'ejs'); // EJSを使う設定
app.set('views', path.join(__dirname, 'views')); // viewsフォルダにテンプレートを格納
app.get('/', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    const [threads] = await connection.execute(
      'SELECT thread_id, thread_name FROM threads ORDER BY created_at DESC;'
    );
    res.render('index', { threads });  // index.ejs にデータを渡す
  } catch (error) {
    res.status(500).send('Error fetching threads: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});

// スレッド作成ページ
app.get('/create-thread', (req, res) => {
  res.render('create-thread');
});

// スレッド作成処理（POST）
app.post('/create-thread', async (req, res) => {
  const { thread_name } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // UUIDでthread_idを生成
    const threadId = uuidv4();

    // スレッドを作成
    await connection.execute(
      'INSERT INTO threads (thread_id, thread_name, genre_tag) VALUES (?, ?, "");',
      [threadId, thread_name]
    );

    // 作成したスレッドのページにリダイレクト（insertIdではなく、threadIdを使用）
    res.redirect(`/thread/${threadId}`);
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

    // スレッド名を取得
    const [threadResult] = await connection.execute(
      'SELECT thread_name FROM threads WHERE thread_id = ?;',
      [threadId]
    );

    // スレッドが見つからない場合のエラーハンドリング
    if (threadResult.length === 0) {
      return res.status(404).send('Thread not found.');
    }

    const threadName = threadResult[0].thread_name;

    // スレッドに関連する投稿を取得
    const [posts] = await connection.execute(
      'SELECT post_id, content, posted_at FROM posts WHERE thread_id = ? ORDER BY posted_at ASC;',
      [threadId]
    );

    // スレッド名と投稿データをテンプレートに渡す
    res.render('thread-page', { posts, threadId, threadName });  // thread-page.ejs に渡す
  } catch (error) {
    res.status(500).send('Error fetching posts: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});


// 投稿作成処理（POST）
app.post('/create-post', async (req, res) => {
  const { thread_id, content } = req.body;

  // バリデーション: contentが空ではないか確認
  if (!content || content.trim() === "") {
    return res.status(400).send('Content cannot be empty.');
  }

  // thread_idが存在しない場合にエラー
  if (!thread_id) {
    return res.status(400).send('Thread ID is required.');
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // ゲストユーザーの user_id（固定のID）を使用して投稿を作成
    const guestUserId = 'guest_user_id';  // ゲストユーザーの user_id を指定

    // 新しい投稿を挿入（user_id にゲストユーザーIDを使用）
    await connection.execute(
      'INSERT INTO posts (post_id, thread_id, user_id, content) VALUES (UUID(), ?, ?, ?);',
      [thread_id, guestUserId, content]
    );

    // 投稿後、スレッドページにリダイレクト
    res.redirect(`/thread/${thread_id}`);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).send('Error creating post: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});


//スレッド削除処理
app.post('/delete-thread', async (req, res) => {
  const { thread_id } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // 投稿を削除
    await connection.execute(
      'DELETE FROM posts WHERE thread_id = ?;',
      [thread_id]
    );

    // スレッドを削除
    await connection.execute(
      'DELETE FROM threads WHERE thread_id = ?;',
      [thread_id]
    );

    // スレッド一覧ページにリダイレクト
    res.redirect('/');

  } catch (error) {
    res.status(500).send('Error deleting thread: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});


//投稿削除処理
app.post('/delete-post', async (req, res) => {
  const { post_id, thread_id } = req.body;
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    // 投稿を削除
    await connection.execute(
      'DELETE FROM posts WHERE post_id = ?;',
      [post_id]
    );

    // 元のスレッドページにリダイレクト
    res.redirect(`/thread/${thread_id}`);

  } catch (error) {
    res.status(500).send('Error deleting post: ' + error.message);
  } finally {
    if (connection) await connection.end();
  }
});


// サーバー起動
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

