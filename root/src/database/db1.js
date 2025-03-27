const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');

// RDS for MySQL 設定
const rdsConfig = {
  host: 'your-rds-endpoint',
  user: 'your-username',
  password: 'your-password',
  database: 'sns_app',
};

// DynamoDB 設定
AWS.config.update({ region: 'your-region' });
const dynamoDB = new AWS.DynamoDB();

async function setupRDS() {
  const connection = await mysql.createConnection(rdsConfig);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      profile_image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS threads (
      thread_id INT AUTO_INCREMENT PRIMARY KEY,
      thread_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      genre_tags JSON
    );
  `);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS posts (
      post_id INT AUTO_INCREMENT PRIMARY KEY,
      thread_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      opinion_id INT,
      image_url TEXT,
      FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );
  `);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reactions (
      post_id INT NOT NULL,
      like_count INT DEFAULT 0,
      PRIMARY KEY (post_id),
      FOREIGN KEY (post_id) REFERENCES posts(post_id)
    );
  `);
  
  console.log('RDS setup complete');
  await connection.end();
}

async function setupDynamoDB() {
  const tables = [
    {
      TableName: 'TimelineData',
      KeySchema: [{ AttributeName: 'thread_id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'thread_id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: 'ActivityLog',
      KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'user_id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: 'ReactionData',
      KeySchema: [
        { AttributeName: 'post_id', KeyType: 'HASH' },
        { AttributeName: 'user_id', KeyType: 'RANGE' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'post_id', AttributeType: 'S' },
        { AttributeName: 'user_id', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
    },
    {
      TableName: 'UserInterestTags',
      KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'user_id', AttributeType: 'S' }],
      BillingMode: 'PAY_PER_REQUEST',
    }
  ];
  
  for (const table of tables) {
    try {
      await dynamoDB.createTable(table).promise();
      console.log(`Table ${table.TableName} created.`);
    } catch (err) {
      if (err.code === 'ResourceInUseException') {
        console.log(`Table ${table.TableName} already exists.`);
      } else {
        console.error(`Error creating table ${table.TableName}:`, err);
      }
    }
  }
}

(async () => {
  await setupRDS();
  await setupDynamoDB();
})();