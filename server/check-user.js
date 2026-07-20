const pool = require('./db');

pool.query(
  "SELECT email, role, LEFT(password, 12) AS hash_prefix FROM users WHERE email = $1",
  ['staff@luigi.com']
).then(result => {
  console.log(result.rows);
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});