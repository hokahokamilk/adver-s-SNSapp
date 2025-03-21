import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

dotenv.config();

// 環境変数のバリデーション
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Environment variable ${varName} is missing.`);
  }
});

async function createMySQLDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS ??;', [process.env.DB_NAME]);
    console.log(`Database ${process.env.DB_NAME} created or already exists.`);
  } catch (error) {
    console.error('Error creating database:', error.message);
    process.exit(1); // 重要: エラー発生時にプロセスを終了
  } finally {
    if (connection) await connection.end();
  }
}

async function createMySQLTables() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(2083),
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS threads (
        thread_id VARCHAR(255) PRIMARY KEY,
        thread_name VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        genre_tag VARCHAR(100) NOT NULL,
        last_posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletion_flag BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

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
    process.exit(1); // 重要: エラー発生時にプロセスを終了
  } finally {
    if (connection) await connection.end();
  }
}

async function createDynamoDBTables() {
  const client = new DynamoDBClient({ region: "ap-northeast-1" });

  try {
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
    console.log('DynamoDB table "ReactionCounts" created successfully.');
  } catch (error) {
    if (error.name === "ResourceInUseException") {
      console.log('Table "ReactionCounts" already exists.');
    } else {
      console.error('Error creating DynamoDB table:', error.message);
      process.exit(1); // 重要: エラー発生時にプロセスを終了
    }
  }
}

async function main() {
  try {
    console.log('Starting database creation...');

    await createMySQLDatabase().then(() => createMySQLTables());
    console.log('MySQL database and tables created successfully.');

    await createDynamoDBTables();
    console.log('DynamoDB tables created successfully.');

    console.log('All database setup completed successfully.');
  } catch (error) {
    console.error(`Error during execution: ${error.message}`);
    process.exit(1); // 重要: エラー発生時にプロセスを終了
  }
}

main();
