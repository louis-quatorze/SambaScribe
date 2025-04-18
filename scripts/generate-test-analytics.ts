/**
 * Generate test analytics data and save it to the log file
 * Run with: npx tsx scripts/generate-test-analytics.ts
 */

import fs from 'fs';
import path from 'path';
import { type EventType, type AnalyticsEvent } from '@/lib/analytics';

// Path for log files - must match what's in server/analytics.ts
const LOG_DIR = process.env.ANALYTICS_LOG_DIR || './logs';
const LOG_FILE = path.join(LOG_DIR, 'analytics.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  console.log(`Created log directory: ${LOG_DIR}`);
}

// Sample event types
const eventTypes = ['view', 'click', 'upload', 'analyze', 'auth'] as EventType[];

// Sample targets for each event type
const eventTargets = {
  view: ['homepage', 'login_attempt', 'login_success', 'login_error', 'analytics_page'],
  click: ['sample_pdf', 'upload_button', 'settings_button', 'login_button'],
  upload: ['user_file'],
  analyze: ['analysis_start', 'analysis_complete'],
  auth: ['signin_success', 'signin_error', 'signout']
};

// Sample users
const users = [
  { id: 'user1', email: 'user1@example.com' },
  { id: 'user2', email: 'user2@example.com' },
  { id: 'user3', email: 'user3@example.com' },
  { id: 'anonymous', email: null }
];

// Sample PDF files
const samplePdfs = ['Aainjaa.pdf', 'Mangueira.pdf', 'Samba-Da-Musa.pdf'];

// Function to generate a random date within the last 7 days
function randomDate(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
}

// Function to get a random item from an array
function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to generate a random event
function generateEvent() {
  const eventType = randomItem(eventTypes);
  const target = randomItem(eventTargets[eventType as keyof typeof eventTargets]);
  const user = randomItem(users);
  const timestamp = randomDate();
  
  // Generate metadata based on event type and target
  let metadata: any = { userId: user.id };
  if (user.email) metadata.email = user.email;
  
  if (eventType === 'click' && target === 'sample_pdf') {
    metadata.name = randomItem(samplePdfs);
  }
  
  if (eventType === 'upload') {
    metadata.fileType = 'application/pdf';
    metadata.fileSize = Math.floor(Math.random() * 5000000) + 1000000; // 1-6MB
  }
  
  if (eventType === 'analyze') {
    if (target === 'analysis_start') {
      const source = Math.random() > 0.5 ? 'sample' : 'upload';
      metadata.source = source;
      metadata.name = source === 'sample' ? randomItem(samplePdfs) : `uploaded_file_${Math.floor(Math.random() * 100)}.pdf`;
    } else if (target === 'analysis_complete') {
      const source = Math.random() > 0.5 ? 'sample' : 'upload';
      metadata.source = source;
      metadata.name = source === 'sample' ? randomItem(samplePdfs) : `uploaded_file_${Math.floor(Math.random() * 100)}.pdf`;
      metadata.success = Math.random() > 0.2; // 80% success rate
    }
  }
  
  if (eventType === 'auth') {
    if (target === 'signin_success') {
      metadata = { email: user.email, provider: 'google', userId: user.id };
    } else if (target === 'signin_error') {
      metadata = { error: 'Invalid credentials', provider: 'google' };
    }
  }
  
  return {
    type: eventType,
    target,
    metadata,
    timestamp: timestamp.getTime()
  };
}

// Generate log entries
function generateLogEntries(count: number) {
  const entries = [];
  
  for (let i = 0; i < count; i++) {
    const event = generateEvent();
    const timestamp = new Date(event.timestamp).toISOString();
    entries.push(`${timestamp} | ${JSON.stringify(event)}\n`);
  }
  
  return entries;
}

// Main function
async function main() {
  const entryCount = process.argv[2] ? parseInt(process.argv[2]) : 100;
  const entries = generateLogEntries(entryCount);
  
  try {
    // Append to existing file or create new one
    fs.appendFileSync(LOG_FILE, entries.join(''));
    console.log(`Generated ${entryCount} test analytics entries in ${LOG_FILE}`);
  } catch (error) {
    console.error('Error writing to log file:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 