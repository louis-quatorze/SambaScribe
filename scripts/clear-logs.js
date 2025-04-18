/**
 * Clear analytics logs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for log files - must match what's in server/analytics.ts
const LOG_DIR = process.env.ANALYTICS_LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'analytics.log');

// Clear the log file
async function clearLogs() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Are you sure you want to clear all analytics logs? (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes') {
        try {
          fs.writeFileSync(LOG_FILE, '');
          console.log('Analytics logs cleared successfully');
        } catch (error) {
          console.error('Error clearing logs:', error);
        }
      } else {
        console.log('Operation cancelled');
      }
      rl.close();
      resolve();
    });
  });
}

// Just clear logs without confirmation
function forceClearLogs() {
  try {
    fs.writeFileSync(LOG_FILE, '');
    console.log('Analytics logs cleared successfully');
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
}

// Handle command line arguments
if (process.argv.includes('--force')) {
  forceClearLogs();
} else {
  clearLogs();
} 