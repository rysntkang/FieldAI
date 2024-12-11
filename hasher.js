const bcrypt = require('bcryptjs');

const plainPassword = 'admin'; // Replace with the desired password
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, (err, hashedPassword) => {
  if (err) {
    console.error('Error hashing password:', err);
  } else {
    console.log('Hashed Password:', hashedPassword);
  }
});