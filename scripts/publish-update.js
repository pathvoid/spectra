#!/usr/bin/env node

/**
 * Script to publish a new version of Spectra
 * Usage: node scripts/publish-update.js [version]
 * 
 * This script will:
 * 1. Update the version in package.json
 * 2. Create a git tag
 * 3. Push the tag
 * 4. Build and publish the release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Get version from command line or increment patch version
const newVersion = process.argv[2] || incrementVersion(packageJson.version);

function incrementVersion(version) {
  const parts = version.split('.');
  parts[2] = (parseInt(parts[2]) + 1).toString();
  return parts.join('.');
}

console.log(`Publishing version ${newVersion}...`);

// Update package.json version
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

try {
  // Create git tag
  execSync(`git add package.json`);
  execSync(`git commit -m "Bump version to ${newVersion}"`);
  execSync(`git tag v${newVersion}`);
  execSync(`git push origin main`);
  execSync(`git push origin v${newVersion}`);
  
  console.log('✅ Git tag created and pushed');
  
  // Build and publish
  console.log('Building and publishing...');
  execSync('npm run make', { stdio: 'inherit' });
  execSync('npm run publish', { stdio: 'inherit' });
  
  console.log(`✅ Version ${newVersion} published successfully!`);
  console.log('Users will be notified of the update automatically.');
  
} catch (error) {
  console.error('❌ Error during publish:', error.message);
  process.exit(1);
}
