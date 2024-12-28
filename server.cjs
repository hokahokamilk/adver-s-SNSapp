const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// CORSの設定
app.use(cors());

// JSONパースミドルウェア
app.use(bodyParser.json());

// ダミーのユーザーデータ（実際にはデータベースで管理します）
const users = [
  { username: 'user1', password: 'password123' },
  { username: 'user2', password: 'securepass456' }
];

// ログイン認証のエンドポイント
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // ユーザー認証
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ success: true, message: 'ログイン成功！' });
  } else {
    res.status(401).json({ success: false, message: 'ユーザー名またはパスワードが間違っています。' });
  }
});

// 仮のユーザー情報
let userData = {
  username: 'taro_yamada',
  email: 'taro@example.com',
  bio: 'こんにちは！私はタロウです。趣味は読書と旅行です。'
};

// プロフィール情報取得エンドポイント
app.get('/profile', (req, res) => {
    res.json(userData);
  });

// プロフィール更新エンドポイント
app.post('/updateProfile', (req, res) => {
    const { username, email, bio } = req.body;
  
    // 入力されたデータが正しいか検証
    if (!username || !email || !bio) {
        return res.status(400).json({ message: 'すべてのフィールドを入力してください。' });
    }
  
    // ユーザー情報の更新
    userData = { username, email, bio };
  
    // 更新が成功した場合
    res.json({ message: 'プロフィールが更新されました。' });
});

app.listen(port, () => {
  console.log(`サーバーが http://localhost:${port} で起動しています。`);
});