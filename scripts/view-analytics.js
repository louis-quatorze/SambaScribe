/**
 * View and manage analytics logs from the command line
 * Usage examples:
 *   node scripts/view-analytics.js view              - View last 50 log entries
 *   node scripts/view-analytics.js view 100          - View last 100 log entries
 *   node scripts/view-analytics.js summary           - See summary statistics
 *   node scripts/view-analytics.js filter click      - Filter logs by event type
 *   node scripts/view-analytics.js clear             - Clear all logs (with confirmation)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path for log files - must match what's in server/analytics.ts
const LOG_DIR = process.env.ANALYTICS_LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'analytics.log');

// Command line interface
async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];

  try {
    // Check if log file exists
    if (!fs.existsSync(LOG_FILE) && command !== 'help') {
      console.log('No analytics log file found at:', LOG_FILE);
      return;
    }

    switch (command) {
      case 'view':
        viewLogs(parseInt(arg) || 50);
        break;
      case 'summary':
        summarizeLogs();
        break;
      case 'filter':
        if (!arg) {
          console.log('Please specify a filter term (event type, user, etc.)');
          return;
        }
        filterLogs(arg);
        break;
      case 'clear':
        await clearLogs();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// View the last N log entries
function viewLogs(count = 50) {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('Log file is empty');
      return;
    }
    
    console.log(`Showing last ${Math.min(count, lines.length)} of ${lines.length} log entries:\n`);
    
    lines.slice(-count).forEach((line, index) => {
      try {
        const [timestamp, jsonData] = line.split(' | ');
        const data = JSON.parse(jsonData);
        
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`  Type: ${data.type}, Target: ${data.target}`);
        
        if (data.metadata) {
          console.log('  Metadata:', typeof data.metadata === 'object' 
            ? JSON.stringify(data.metadata) 
            : data.metadata);
        }
        
        console.log('');
      } catch (error) {
        console.log(`[${index + 1}] Error parsing log entry:`, line);
      }
    });
  } catch (error) {
    console.error('Error reading log file:', error);
  }
}

// Generate a summary of logs
function summarizeLogs() {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('Log file is empty');
      return;
    }
    
    const eventTypes = {};
    const targets = {};
    const users = {};
    let lastTimestamp = '';
    let firstTimestamp = '';
    
    lines.forEach((line, index) => {
      try {
        const [timestamp, jsonData] = line.split(' | ');
        const data = JSON.parse(jsonData);
        
        if (index === 0) firstTimestamp = timestamp;
        lastTimestamp = timestamp;
        
        // Count event types
        eventTypes[data.type] = (eventTypes[data.type] || 0) + 1;
        
        // Count targets
        targets[data.target] = (targets[data.target] || 0) + 1;
        
        // Count users if available
        if (data.metadata && data.metadata.userId) {
          users[data.metadata.userId] = (users[data.metadata.userId] || 0) + 1;
        }
        
        if (data.metadata && data.metadata.email) {
          users[data.metadata.email] = (users[data.metadata.email] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid entries
      }
    });
    
    console.log(`Analytics Summary (${lines.length} events)`);
    console.log(`Time Range: ${firstTimestamp} to ${lastTimestamp}\n`);
    
    console.log('Event Types:');
    Object.entries(eventTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count} (${(count / lines.length * 100).toFixed(1)}%)`);
      });
    
    console.log('\nTargets:');
    Object.entries(targets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([target, count]) => {
        console.log(`  ${target}: ${count}`);
      });
    
    if (Object.keys(users).length > 0) {
      console.log('\nTop Users:');
      Object.entries(users)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([user, count]) => {
          console.log(`  ${user}: ${count} events`);
        });
    }
  } catch (error) {
    console.error('Error generating summary:', error);
  }
}

// Filter logs by a search term
function filterLogs(searchTerm) {
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('Log file is empty');
      return;
    }
    
    const matches = [];
    
    lines.forEach((line, index) => {
      try {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
          matches.push({ index, line });
        }
      } catch (error) {
        // Skip invalid entries
      }
    });
    
    if (matches.length === 0) {
      console.log(`No log entries found matching '${searchTerm}'`);
      return;
    }
    
    console.log(`Found ${matches.length} entries matching '${searchTerm}':\n`);
    
    matches.forEach(({ index, line }, i) => {
      try {
        const [timestamp, jsonData] = line.split(' | ');
        const data = JSON.parse(jsonData);
        
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`  Type: ${data.type}, Target: ${data.target}`);
        
        if (data.metadata) {
          console.log('  Metadata:', typeof data.metadata === 'object' 
            ? JSON.stringify(data.metadata) 
            : data.metadata);
        }
        
        console.log('');
      } catch (error) {
        console.log(`[${index + 1}] Error parsing log entry:`, line);
      }
    });
  } catch (error) {
    console.error('Error filtering logs:', error);
  }
}

// Clear all logs (with confirmation)
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

// Show help information
function showHelp() {
  console.log('Analytics Log Viewer and Manager');
  console.log('Usage:');
  console.log('  node scripts/view-analytics.js view [count]    - View last N log entries (default: 50)');
  console.log('  node scripts/view-analytics.js summary         - See summary statistics');
  console.log('  node scripts/view-analytics.js filter <term>   - Filter logs by search term');
  console.log('  node scripts/view-analytics.js clear           - Clear all logs (with confirmation)');
  console.log('  node scripts/view-analytics.js help            - Show this help message');
}

// Run the main function
main(); 