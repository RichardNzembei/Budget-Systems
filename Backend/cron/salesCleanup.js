const cron = require('node-cron');
const db = require('../db');

// Run cleanup every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running sales cleanup cron job...');

  try {
    // Delete sales older than 90 days (adjust as needed)
    const [result] = await db.query(
        'DELETE FROM sales WHERE sale_date < DATE_SUB(NOW(), INTERVAL 90 DAY)'
    );

    console.log(`Cleaned up ${result.affectedRows} old sales records`);
  } catch (error) {
    console.error('Error in sales cleanup cron:', error);
  }
});

console.log('Sales cleanup cron job initialized');