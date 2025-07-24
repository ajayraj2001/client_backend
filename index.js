require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase } = require('./config');
const app = require('./src/app');
const scripts = require('./src/scripts');
const { initializeSocket } = require('./socket'); // Import Socket.IO setup
const { cleanupPendingTransactions } = require('./src/controllers/cronJobs/cronJobController')

const { PORT } = process.env || 5001;

(async () => {
  try {
    console.log('Initializing server');
    await connectToDatabase();
    await scripts();

    // Start the cron job for cleaning up pending transactions
    cleanupPendingTransactions();

    // app.listen(PORT, () => console.log(`Server is running on ${PORT}`)).on('error', shutdown);

    // Create HTTP server
    const server = app.listen(PORT, () => console.log(`Server is running on ${PORT}`)).on('error', shutdown);
    // Initialize Socket.IO
    initializeSocket(server);
  } catch (error) {
    shutdown(error);
  }
})();

async function shutdown(err) {
  console.log('Unable to initialize the server:', err);
  await mongoose.connection.close();
  process.exit(1);
}
