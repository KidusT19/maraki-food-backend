const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('database.sqlite');

async function updateCredentials() {
  console.log("Starting credentials update...");
  
  const credentials = [
    { rest_id: 1, email: "habeshagourment@gmail.com", password: "habesha1234" },
    { rest_id: 2, email: "addisspice@gmail.com", password: "addis1234" },
    { rest_id: 3, email: "sheger@gmail.com", password: "sheger1234" }
  ];

  db.serialize(async () => {
    for (let cred of credentials) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(cred.password, salt);

      // We'll update the email and password for the user that has the matching restaurant_id
      db.run(
        `UPDATE users SET email = ?, password = ? WHERE restaurant_id = ?`,
        [cred.email, hashedPassword, cred.rest_id],
        function(err) {
          if (err) {
            console.error(`Error updating restaurant ${cred.rest_id}:`, err);
          } else {
            console.log(`Updated credentials for restaurant ${cred.rest_id} to ${cred.email}`);
          }
        }
      );
    }
  });
}

updateCredentials();
