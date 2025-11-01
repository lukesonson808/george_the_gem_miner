#!/usr/bin/env node
/**
 * Update Q-Report Data Script
 * 
 * This script helps update Georgie's Q-Report data by:
 * 1. Running the MyHarvard scrapers to get latest course info
 * 2. Optionally downloading Q-Report data (requires Harvard login)
 * 3. Merging the data for Georgie to use
 * 
 * Usage:
 *   node scripts/update-qreport-data.js [year] [term]
 * 
 * Example:
 *   node scripts/update-qreport-data.js 2026 Spring
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Default to current academic year
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const academicYear = currentMonth >= 7 ? currentYear + 1 : currentYear; // Aug+ = next year
const defaultTerm = currentMonth >= 1 && currentMonth <= 5 ? 'Spring' : 'Fall';

const year = process.argv[2] || academicYear;
const term = process.argv[3] || defaultTerm;

console.log(`\n🎓 Updating Q-Report Data for ${year} ${term}\n`);
console.log('=' .repeat(60));

async function runCommand(command, description) {
  console.log(`\n📝 ${description}...`);
  console.log(`   Command: ${command}\n`);
  
  try {
    const { stdout, stderr } = await execPromise(command, { 
      cwd: path.join(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.warn(stderr);
    
    console.log(`✅ ${description} complete!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('\n📋 Step 1: Scraping MyHarvard Course URLs');
  console.log('-' .repeat(60));
  
  const urlsFile = `course_urls_${year}_${term.toLowerCase()}.txt`;
  const success1 = await runCommand(
    `node scrapers/myharvard-url-scraper.js ${year} ${term}`,
    'Scraping course URLs from MyHarvard'
  );
  
  if (!success1) {
    console.log('\n⚠️  URL scraping failed. Trying to continue with existing URLs...');
  }
  
  console.log('\n📋 Step 2: Scraping Course Details');
  console.log('-' .repeat(60));
  
  const outputJson = `myharvard_${year}_${term.toLowerCase()}.json`;
  const outputCsv = `myharvard_${year}_${term.toLowerCase()}.csv`;
  
  const success2 = await runCommand(
    `node scrapers/scrape-all-courses.js ${urlsFile} ${outputJson} 10`,
    'Scraping detailed course information'
  );
  
  if (!success2) {
    console.log('\n❌ Course detail scraping failed. Cannot continue.');
    process.exit(1);
  }
  
  console.log('\n📋 Step 3: Copying Data to Georgie Directory');
  console.log('-' .repeat(60));
  
  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  }
  
  // Copy CSV to data directory for Georgie
  const sourceCsv = path.join(__dirname, '..', outputCsv);
  const destCatalog = path.join(__dirname, '..', `AY_${year}_${year+1}_courses.csv`);
  
  if (fs.existsSync(sourceCsv)) {
    fs.copyFileSync(sourceCsv, destCatalog);
    console.log(`✅ Copied ${outputCsv} → ${destCatalog}`);
  }
  
  console.log('\n📋 Step 4: Q-Report Data (Manual Step)');
  console.log('-' .repeat(60));
  console.log(`
⚠️  Q-Report data requires Harvard login and cannot be automated.

To update Q-Report data manually:

1. Visit: https://qreports.fas.harvard.edu/browse/index
2. Log in with HarvardKey
3. Download the Spring ${year} course evaluations CSV
4. Save as: data/qreport-${term.toLowerCase()}-${year}.csv

For now, Georgie will continue using: data/qreport-spring-2025.csv

📚 See scrapers/README.md for detailed instructions on Q-Report scraping.
  `);
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ Data update complete!');
  console.log('\n📊 Summary:');
  console.log(`   - Course catalog: ${destCatalog}`);
  console.log(`   - Q-Report: data/qreport-spring-2025.csv (requires manual update)`);
  console.log('\n🚀 Restart your server to use the updated data:\n');
  console.log('   npm start\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

