import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { DynamoDBClient, DeleteTableCommand } from "@aws-sdk/client-dynamodb";

dotenv.config();

async function deleteMySQLDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });

    try {
        await connection.query(`DROP DATABASE IF EXISTS ??;`, [process.env.DB_NAME]);
        console.log(`MySQLデータベース「${process.env.DB_NAME}」を削除しました。`);
    } catch (err) {
        console.error(`MySQLデータベースの削除に失敗: ${err.message}`);
    } finally {
        await connection.end();
    }
}

async function deleteDynamoDBTables() {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION });

    try {
        // すべてのテーブルを取得
        const { TableNames } = await client.send(new ListTablesCommand({}));

        if (!TableNames || TableNames.length === 0) {
            console.log("削除対象のDynamoDBテーブルはありません。");
            return;
        }

        // 各テーブルを削除
        for (const tableName of TableNames) {
            try {
                await client.send(new DeleteTableCommand({ TableName: tableName }));
                console.log(`DynamoDBテーブル「${tableName}」を削除しました。`);
            } catch (err) {
                console.error(`DynamoDBテーブル「${tableName}」の削除に失敗: ${err.message}`);
            }
        }
    } catch (err) {
        console.error(`DynamoDBテーブルの取得に失敗: ${err.message}`);
    }
}

async function main() {
    await deleteMySQLDatabase();
    await deleteDynamoDBTables();
    console.log('すべてのデータベースとテーブルを削除しました。');
}

main().catch(console.error);
