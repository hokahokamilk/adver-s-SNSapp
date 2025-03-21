import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabases() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const [databases] = await connection.query('SHOW DATABASES');
    console.log('Databases:', databases);

    // データベースが作成されているか確認
    const dbExists = databases.some(db => db.Database === process.env.DB_NAME);
    if (dbExists) {
      console.log(`Database ${process.env.DB_NAME} exists.`);
    } else {
      console.log(`Database ${process.env.DB_NAME} does not exist.`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkDatabases();
