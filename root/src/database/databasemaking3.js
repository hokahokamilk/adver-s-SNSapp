// Amazon RDS for MySQL (RDB) Tables using JavaScript (AWS SDK)

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

await connection.execute(`
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    profile_image_url VARCHAR(2083),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

await connection.execute(`
CREATE TABLE threads (
    thread_id VARCHAR(255) PRIMARY KEY,
    thread_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    genre_tag VARCHAR(100) NOT NULL,
    last_posted_at DATETIME NOT NULL,
    deletion_flag BOOLEAN NOT NULL DEFAULT FALSE
);
`);

await connection.execute(`
CREATE TABLE posts (
    post_id VARCHAR(255) PRIMARY KEY,
    thread_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    posted_at DATETIME NOT NULL,
    image_url VARCHAR(2083),
    FOREIGN KEY (thread_id) REFERENCES threads(thread_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
`);

await connection.execute(`
CREATE TABLE archive_metadata (
    thread_id VARCHAR(255) PRIMARY KEY,
    archive_file_location VARCHAR(2083) NOT NULL,
    deleted_at DATETIME NOT NULL,
    archive_created_at DATETIME NOT NULL,
    archive_size BIGINT NOT NULL,
    restore_flag BOOLEAN NOT NULL DEFAULT FALSE
);
`);

// Amazon DynamoDB Tables using AWS SDK
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "ap-northeast-1" });

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