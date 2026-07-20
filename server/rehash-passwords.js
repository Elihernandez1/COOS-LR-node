const pool = require('./db');
const bcrypt = require('bcrypt');

async function rehashAll() {
  try {
    const users = await pool.query('SELECT user_id, email FROM users');
    console.log(`Found ${users.rows.length} users. Re-hashing with bcrypt...`);

    const newHash = await bcrypt.hash('demo123', 12);

    for (const user of users.rows) {
      await pool.query('UPDATE users SET password = $1 WHERE user_id = $2', [newHash, user.user_id]);
      console.log(`Updated: ${user.email}`);
    }

    console.log('Done. All users now use bcrypt hashes for password "demo123".');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

rehashAll();