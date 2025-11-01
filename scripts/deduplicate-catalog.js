#!/usr/bin/env node
/**
 * Deduplicate Course Catalog
 * Removes duplicate courses from AY_2025_2026_courses.csv
 * Keeps the entry with the most data for each unique course
 */

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'AY_2025_2026_courses.csv');
const outputPath = path.join(__dirname, '..', 'AY_2025_2026_courses_clean.csv');
const backupPath = path.join(__dirname, '..', 'AY_2025_2026_courses_backup.csv');

console.log('📚 Course Catalog Deduplication Tool\n');
console.log(`Reading: ${csvPath}`);

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Escape CSV field
function escapeCSV(field) {
  if (!field) return '';
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

// Count non-empty fields in a row
function countData(row) {
  return row.filter(field => field && field.trim() !== '').length;
}

// Score a row for priority (more specific criteria)
function scoreRow(row, headers) {
  let score = 0;
  
  // Count total non-empty fields
  score += countData(row) * 10;
  
  // Bonus for having meeting time data
  const meetingIdx = headers.indexOf('meeting');
  if (meetingIdx !== -1 && row[meetingIdx] && row[meetingIdx].trim() !== '' && !row[meetingIdx].includes('No meeting')) {
    score += 50;
  }
  
  // Bonus for having instructor data
  const instructorIdx = headers.indexOf('instructors');
  if (instructorIdx !== -1 && row[instructorIdx] && row[instructorIdx].trim() !== '') {
    score += 30;
  }
  
  // Bonus for having description
  const descIdx = headers.indexOf('description');
  if (descIdx !== -1 && row[descIdx] && row[descIdx].trim() !== '' && row[descIdx].length > 100) {
    score += 20;
  }
  
  // Prefer Spring 2026 over Fall 2025 (more recent)
  const termIdx = headers.indexOf('term');
  if (termIdx !== -1 && row[termIdx]) {
    if (row[termIdx].includes('2026 Spring')) {
      score += 5;
    } else if (row[termIdx].includes('2025 Fall')) {
      score += 3;
    }
  }
  
  return score;
}

try {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  console.log(`Total lines: ${lines.length}\n`);
  
  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  console.log(`Columns: ${headers.join(', ')}\n`);
  
  // Find key column indices
  const subjectIdx = headers.indexOf('subject');
  const courseNumIdx = headers.indexOf('course_number');
  const titleIdx = headers.indexOf('title');
  const courseIdIdx = headers.indexOf('course_id');
  
  if (subjectIdx === -1 || courseNumIdx === -1) {
    throw new Error('Required columns not found: subject, course_number');
  }
  
  // Parse all rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      const values = parseCSVLine(line);
      
      // Skip table of contents entries
      if (values[titleIdx] && (
        values[titleIdx].includes('HARVARD UNIVERSITY') || 
        values[titleIdx].includes('TABLE OF CONTENTS')
      )) {
        continue;
      }
      
      rows.push({
        lineNum: i + 1,
        values,
        score: scoreRow(values, headers)
      });
    } catch (err) {
      console.warn(`⚠️  Failed to parse line ${i + 1}: ${err.message}`);
    }
  }
  
  console.log(`Parsed ${rows.length} valid course entries\n`);
  
  // Group by subject + course_number (ignoring term - same course offered multiple times)
  // This will treat "PSYCH 1 Fall 2025" and "PSYCH 1 Spring 2026" as duplicates
  const courseGroups = new Map();
  
  for (const row of rows) {
    const subject = row.values[subjectIdx];
    const courseNum = row.values[courseNumIdx];
    
    // Remove section numbers like (001), (002), etc. for true deduplication
    // But keep them in the actual data
    const cleanedNum = courseNum.replace(/\s*\([^)]*\)/g, '').trim();
    const key = `${subject}|${cleanedNum}`.toUpperCase();
    
    if (!courseGroups.has(key)) {
      courseGroups.set(key, []);
    }
    courseGroups.get(key).push(row);
  }
  
  console.log(`Found ${courseGroups.size} unique courses\n`);
  
  // Find duplicates and choose best entry for each
  const deduped = [];
  const duplicates = [];
  
  for (const [key, group] of courseGroups.entries()) {
    if (group.length > 1) {
      // Sort by score (highest first)
      group.sort((a, b) => b.score - a.score);
      
      // Keep the best one
      deduped.push(group[0]);
      
      // Track duplicates for reporting
      duplicates.push({
        key,
        count: group.length,
        kept: group[0],
        removed: group.slice(1)
      });
    } else {
      // No duplicates, keep as-is
      deduped.push(group[0]);
    }
  }
  
  console.log(`📊 Deduplication Results:`);
  console.log(`   Original: ${rows.length} courses`);
  console.log(`   Unique: ${deduped.length} courses`);
  console.log(`   Removed: ${rows.length - deduped.length} duplicates\n`);
  
  // Show some examples of duplicates removed
  if (duplicates.length > 0) {
    console.log(`📋 Example Duplicates Removed (showing first 10):\n`);
    duplicates.slice(0, 10).forEach(dup => {
      const [subject, courseNum] = dup.key.split('|');
      const title = dup.kept.values[titleIdx] || 'Unknown';
      console.log(`   ${subject} ${courseNum}: ${title}`);
      console.log(`      Kept 1, removed ${dup.removed.length} duplicate(s)`);
      console.log(`      Kept entry score: ${dup.kept.score}\n`);
    });
    
    if (duplicates.length > 10) {
      console.log(`   ... and ${duplicates.length - 10} more\n`);
    }
  }
  
  // Create backup of original file
  console.log(`💾 Creating backup: ${backupPath}`);
  fs.copyFileSync(csvPath, backupPath);
  
  // Write deduplicated CSV
  console.log(`✍️  Writing clean CSV: ${outputPath}\n`);
  
  const outputLines = [headerLine];
  
  // Sort deduped by original line number to maintain order
  deduped.sort((a, b) => a.lineNum - b.lineNum);
  
  for (const row of deduped) {
    const escapedValues = row.values.map(escapeCSV);
    outputLines.push(escapedValues.join(','));
  }
  
  fs.writeFileSync(outputPath, outputLines.join('\n') + '\n', 'utf-8');
  
  console.log('✅ Deduplication complete!\n');
  console.log('📁 Files:');
  console.log(`   Original (backup): ${backupPath}`);
  console.log(`   Cleaned: ${outputPath}\n`);
  console.log('🔄 To use the cleaned file:');
  console.log(`   mv "${outputPath}" "${csvPath}"\n`);
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}

