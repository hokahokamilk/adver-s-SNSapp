import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

// .env ファイルから環境変数を読み込む
dotenv.config();

async function createMySQLDatabase() {
  // MySQL への接続
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    // データベースが存在しない場合、作成
    await connection.query('CREATE DATABASE IF NOT EXISTS ??;', [process.env.DB_NAME]);
    console.log(`Database ${process.env.DB_NAME} created or already exists.`);
  } catch (error) {
    console.error('Error creating database:', error.message);
  } finally {
    await connection.end();
  }
}

async function createMySQLTables() {
  // MySQL への接続
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // ユーザーテーブル作成
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(2083),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // スレッドテーブル作成
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS threads (
        thread_id VARCHAR(255) PRIMARY KEY,
        thread_name VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        genre_tag VARCHAR(100) NOT NULL,
        last_posted_at DATETIME NOT NULL ON UPDATE CURRENT_TIMESTAMP,
        deletion_flag BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    // 投稿テーブル作成
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        post_id VARCHAR(255) PRIMARY KEY,
        thread_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        image_url VARCHAR(2083),
        FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id)
      );
    `);

    // アーカイブメタデータテーブル作成
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS archive_metadata (
        thread_id VARCHAR(255) PRIMARY KEY,
        archive_file_location VARCHAR(2083) NOT NULL,
        deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        archive_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        archive_size BIGINT NOT NULL,
        restore_flag BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    console.log('MySQL tables created.');
  } catch (error) {
    console.error('Error creating tables:', error.message);
  } finally {
    await connection.end();
  }
}

// DynamoDB テーブル作成
async function createDynamoDBTables() {
  const client = new DynamoDBClient({ region: "ap-northeast-1" });

  try {
    // ReactionCounts テーブル作成
    await client.send(new CreateTableCommand({
      TableName: "ReactionCounts",
      KeySchema: [
        { AttributeName: "thread_id", KeyType: "HASH" },
        { AttributeName: "post_id", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "thread_id", AttributeType: "S" },
        { AttributeName: "post_id", AttributeType: "S" }
      ],
      BillingMode: "PAY_PER_REQUEST",
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: "NEW_IMAGE"
      }
    }));

    // UserActivityLog テーブル作成
    await client.send(new CreateTableCommand({
      TableName: "UserActivityLog",
      KeySchema: [
        { AttributeName: "user_id", KeyType: "HASH" },
        { AttributeName: "thread_id", KeyType: "RANGE" }
      ],
      AttributeDefinitions: [
        { AttributeName: "user_id", AttributeType: "S" },
        { AttributeName: "thread_id", AttributeType: "S" }
      ],
      BillingMode: "PAY_PER_REQUEST"
    }));

    console.log('DynamoDB tables created.');
  } catch (error) {
    console.error('Error creating DynamoDB tables:', error.message);
  }
}

// 実行部分
async function main() {
  try {
    // MySQL データベース作成
    await createMySQLDatabase();

    // MySQL テーブル作成
    await createMySQLTables();

    // DynamoDB テーブル作成
    await createDynamoDBTables();

    console.log('All tables created successfully.');
  } catch (error) {
    console.error('Error in main execution:', error.message);
  }
}

main();
