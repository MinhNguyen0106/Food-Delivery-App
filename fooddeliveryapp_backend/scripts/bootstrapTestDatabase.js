const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { db } = require('../src/config/env');

const databaseName = db.database;
if (!/^food_delivery_app_it_\d{8}(?:_\d+)?$/.test(databaseName)) {
  throw new Error(
    'Refusing to bootstrap: DB_NAME must be an isolated food_delivery_app_it_YYYYMMDD[_N] database'
  );
}

async function main() {
  const schemaPath = path.resolve(__dirname, '../DB_Script_FoodDeliveryApp.sql');
  const source = (await fs.readFile(schemaPath, 'utf8')).replace(/^\uFEFF/, '');
  const destructiveHeader =
    /(^|\r?\n)DROP DATABASE IF EXISTS food_delivery_app;\s*CREATE DATABASE food_delivery_app\s+CHARACTER SET utf8mb4\s+COLLATE utf8mb4_unicode_ci;\s*USE food_delivery_app;\s*/m;
  let schema = source.replace(destructiveHeader, '$1');
  if (
    schema === source ||
    /\bDROP\s+(?:DATABASE|SCHEMA|TABLE)\b/i.test(schema) ||
    /\bCREATE\s+DATABASE\b/i.test(schema) ||
    /\bUSE\s+food_delivery_app\s*;/i.test(schema)
  ) {
    throw new Error('Schema safety check failed; no database was modified');
  }
  const triggers = [...schema.matchAll(/CREATE TRIGGER[\s\S]*?END\$\$/g)]
    .map((match) => match[0].replace(/END\$\$$/, 'END;'));
  if (triggers.length !== 2) {
    throw new Error('Expected both same-Restaurant cart triggers; no database was modified');
  }
  schema = schema
    .replace(/CREATE TRIGGER[\s\S]*?END\$\$/g, '')
    .replace(/^\s*DELIMITER\s+\$\$\s*$/gm, '')
    .replace(/^\s*DELIMITER\s+;\s*$/gm, '');

  const server = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
  });
  try {
    const [existing] = await server.execute(
      'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [databaseName]
    );
    if (existing.length) {
      throw new Error(
        `${databaseName} already exists. Refusing to overwrite it; choose a new isolated test database name.`
      );
    }
    await server.query(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await server.end();
  }

  const testDatabase = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: databaseName,
    multipleStatements: true,
  });
  try {
    await testDatabase.query(schema);
    for (const trigger of triggers) {
      await testDatabase.query(trigger);
    }
    await testDatabase.execute(
      `UPDATE payments payment
       JOIN orders order_record ON order_record.order_id = payment.order_id
       SET payment.amount = order_record.total_amount
       WHERE payment.payment_id = 3 AND payment.order_id = 3`
    );
    const [tables] = await testDatabase.query('SHOW TABLES');
    const [seedPayment] = await testDatabase.execute(
      'SELECT payment.amount = order_record.total_amount AS consistent FROM payments payment JOIN orders order_record ON order_record.order_id = payment.order_id WHERE payment.payment_id = 3'
    );
    if (tables.length < 20 || Number(seedPayment[0]?.consistent) !== 1) {
      throw new Error('Test schema verification failed after import');
    }
    console.log(`Created isolated database ${databaseName}; imported ${tables.length} tables.`);
    console.log('Corrected Payment 3 amount in the isolated test database only.');
  } finally {
    await testDatabase.end();
  }
}

main().catch((error) => {
  console.error(
    'Test database bootstrap failed:',
    error.code || error.message,
    error.sqlMessage || ''
  );
  process.exitCode = 1;
});
