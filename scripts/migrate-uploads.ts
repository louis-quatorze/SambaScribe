import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

async function migrateUploads() {
  console.log('Starting uploads migration...');
  
  // Define source and target directories
  const sourceDir = path.join(process.cwd(), 'public', 'uploads');
  const targetDir = path.join(process.cwd(), 'uploads');
  
  // Check if source directory exists
  if (!existsSync(sourceDir)) {
    console.log('Source directory does not exist, nothing to migrate.');
    return;
  }
  
  // Create target directory if it doesn't exist
  if (!existsSync(targetDir)) {
    await fs.mkdir(targetDir, { recursive: true });
    console.log('Created target directory:', targetDir);
  }
  
  // Get list of files in source directory
  try {
    const files = await fs.readdir(sourceDir);
    console.log(`Found ${files.length} files to migrate.`);
    
    // Move each file
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      // Check if it's a directory
      const stat = await fs.stat(sourcePath);
      if (stat.isDirectory()) {
        console.log(`Skipping directory: ${file}`);
        continue;
      }
      
      // Check if file already exists in target
      if (existsSync(targetPath)) {
        console.log(`File already exists in target, skipping: ${file}`);
        continue;
      }
      
      // Copy file to new location
      await fs.copyFile(sourcePath, targetPath);
      console.log(`Migrated: ${file}`);
      
      // Delete original file
      await fs.unlink(sourcePath);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUploads().catch(console.error); 