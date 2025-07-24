const mongoose = require('mongoose');
const { DB_URI } = process.env;

const connectToDatabase = async () => {
  console.log(`Connecting to database...`);
  mongoose.connection
    .on('error', (err) => console.log('Database connection error:', err.message))
    .on('open', () => console.log(`Database connection is open.`))
    .on('connected', () => console.log('Database connection established.'))
    .on('disconnected', () => console.log('Database disconnected.'));

  return new Promise((resolve, reject) => {
    mongoose
      .connect(DB_URI)
      .then(resolve)
      .catch((err) => {
        console.log('Unable to connect to the database:', err.message);
        mongoose.connection.close(); //also emmits disconnected
        reject(err);
      });
  });
};

module.exports = connectToDatabase;
