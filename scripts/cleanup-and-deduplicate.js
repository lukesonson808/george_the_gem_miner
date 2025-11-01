#!/usr/bin/env node
/**
 * Comprehensive Course Catalog Cleanup
 * 1. Removes ALL duplicates (same subject + course_number)
 * 2. Parses meeting times properly (TR, MWF, MW, etc.)
 * 3. Separates instructors, requirements, and descriptions
 * 4. Creates clean, structured data
 */

const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'AY_2025_2026_courses_raw.csv');
const outputPath = path.join(__dirname, '..', 'AY_2025_2026_courses.csv');
const backupPath = path.join(__dirname, '..', 'AY_2025_2026_courses_backup_final.csv');

console.log('🧹 Comprehensive Course Catalog Cleanup\n');

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
  // Always quote if contains comma, quote, or newline
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}

/**
 * Parse meeting pattern from description/meeting field
 * Patterns: TR, MWF, MW, MF, TTh, etc.
 * Returns: { weekdays: "Tue/Thu", startTime: "12:00 PM", endTime: "1:15 PM", raw: "..." }
 */
function parseMeetingTime(text) {
  if (!text) return null;
  
  // Common patterns
  const dayMap = {
    'M': 'Mon',
    'T': 'Tue', 
    'W': 'Wed',
    'R': 'Thu',  // R = Thursday
    'F': 'Fri',
    'S': 'Sat',
    'U': 'Sun'
  };
  
  // Try to match meeting pattern: "MW 1030 AM - 1145 AM"
  const match = text.match(/\b([MTWRFSU]+)\s+(\d{4})\s+(AM|PM)\s*-\s*(\d{4})\s+(AM|PM)/i);
  
  if (match) {
    const [, dayCodes, startTime, startPeriod, endTime, endPeriod] = match;
    
    // Convert day codes to readable format
    const weekdays = dayCodes
      .split('')
      .map(code => dayMap[code] || code)
      .join('/');
    
    // Format times
    const formatTime = (time, period) => {
      const hours = time.slice(0, -2);
      const minutes = time.slice(-2);
      return `${hours}:${minutes} ${period}`;
    };
    
    return {
      weekdays,
      startTime: formatTime(startTime, startPeriod),
      endTime: formatTime(endTime, endPeriod),
      raw: match[0]
    };
  }
  
  // Check for "No meeting time" pattern
  if (text.toLowerCase().includes('no meeting') || text.toLowerCase().includes('no time listed')) {
    return {
      weekdays: '',
      startTime: '',
      endTime: '',
      raw: 'No meeting time listed'
    };
  }
  
  return null;
}

/**
 * Extract instructor names from text
 * Instructors usually appear after meeting time or at start of description
 */
function extractInstructors(text) {
  if (!text) return '';
  
  // Remove "Instructor Permission Required" phrase first
  let cleaned = text.replace(/Instructor Permission Required/gi, '');
  
  // Common patterns: names appear after meeting time or at start
  // Pattern 1: After time "1245 PM Vincent Brown This..."
  const afterTimeMatch = cleaned.match(/(?:PM|AM)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z,]+)*?)(?:\s+This|\s+Students|\s+The|\s+Explore)/);
  if (afterTimeMatch) {
    return afterTimeMatch[1].trim();
  }
  
  // Pattern 2: At the beginning "Vincent Brown This course..."
  const startMatch = cleaned.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})(?:\s+This|\s+Students|\s+The|\s+Explore|\s+In\s+this)/);
  if (startMatch) {
    return startMatch[1].trim();
  }
  
  // Pattern 3: Between meeting time and description "MW 1030 AM - 1145 AM John Smith This"
  const betweenMatch = cleaned.match(/[MTWRFSU]+\s+\d{4}\s+(?:AM|PM)\s*-\s*\d{4}\s+(?:AM|PM)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (betweenMatch) {
    return betweenMatch[1].trim();
  }
  
  return '';
}

/**
 * Extract requirements/prerequisites from text
 */
function extractRequirements(text) {
  if (!text) return '';
  
  const requirements = [];
  
  // "Instructor Permission Required"
  if (text.includes('Instructor Permission Required')) {
    requirements.push('Instructor Permission Required');
  }
  
  // Prerequisites patterns
  const prereqMatch = text.match(/(?:Prerequisite|Prerequisites|Requires?):([^.]+)/i);
  if (prereqMatch) {
    requirements.push(prereqMatch[0].trim());
  }
  
  // Enrollment limitations
  const enrollMatch = text.match(/Enrollment\s+limited[^.]+/i);
  if (enrollMatch) {
    requirements.push(enrollMatch[0].trim());
  }
  
  return requirements.join('; ');
}

/**
 * Clean description by removing meeting times, instructors, and other metadata
 */
function cleanDescription(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove meeting time patterns
  cleaned = cleaned.replace(/\b[MTWRFSU]+\s+\d{4}\s+(?:AM|PM)\s*-\s*\d{4}\s+(?:AM|PM)/gi, '');
  
  // Remove "No meeting time listed"
  cleaned = cleaned.replace(/No meeting time listed/gi, '');
  
  // Remove "Instructor Permission Required"
  cleaned = cleaned.replace(/Instructor Permission Required/gi, '');
  
  // Remove "HARVARD UNIVERSITY X of Y" patterns
  cleaned = cleaned.replace(/HARVARD UNIVERSITY \d+ of \d+/g, '');
  
  // Remove leading instructor names (1-3 words starting with capital)
  // "Vincent Brown This course" => "This course"
  // "Carla Martin This" => "This"
  cleaned = cleaned.replace(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+(?=This|Students|The|Explore|In\s+this)/i, '');
  
  // Clean up "This" at the start if it's standalone
  cleaned = cleaned.replace(/^This\s+/, '');
  
  // Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter if needed
  if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Score a row for priority (keep the one with most data)
 */
function scoreRow(row, headers) {
  let score = 0;
  
  // Count non-empty fields
  score += row.filter(f => f && f.trim()).length * 10;
  
  // Bonus for meeting time
  const meetingIdx = headers.indexOf('meeting');
  const descIdx = headers.indexOf('description');
  const combinedText = (row[meetingIdx] || '') + ' ' + (row[descIdx] || '');
  
  if (combinedText.match(/[MTWRFSU]+\s+\d{4}\s+(?:AM|PM)/)) {
    score += 50;
  }
  
  // Bonus for instructor
  if (combinedText.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/)) {
    score += 30;
  }
  
  // Bonus for description length
  if (descIdx !== -1 && row[descIdx] && row[descIdx].length > 100) {
    score += 20;
  }
  
  // Prefer Spring 2026 (more recent)
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
  
  console.log(`📖 Reading: ${csvPath}`);
  console.log(`   Total lines: ${lines.length}\n`);
  
  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  
  // Find column indices
  const subjectIdx = headers.indexOf('subject');
  const courseNumIdx = headers.indexOf('course_number');
  const titleIdx = headers.indexOf('title');
  const courseIdIdx = headers.indexOf('course_id');
  const termIdx = headers.indexOf('term');
  const meetingIdx = headers.indexOf('meeting');
  const instructorIdx = headers.indexOf('instructors');
  const descIdx = headers.indexOf('description');
  const notesIdx = headers.indexOf('notes');
  
  // Parse all rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      const values = parseCSVLine(line);
      
      // Skip table of contents
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
      console.warn(`⚠️  Failed to parse line ${i + 1}`);
    }
  }
  
  console.log(`✅ Parsed ${rows.length} course entries\n`);
  
  // Group by subject + course_number (ignoring section numbers)
  const courseGroups = new Map();
  
  for (const row of rows) {
    const subject = row.values[subjectIdx];
    const courseNum = row.values[courseNumIdx];
    
    // Remove section numbers like (001), (002) etc.
    const baseNum = courseNum.replace(/\s*\([^)]*\)/g, '').trim();
    const key = `${subject}|${baseNum}`.toUpperCase();
    
    if (!courseGroups.has(key)) {
      courseGroups.set(key, []);
    }
    courseGroups.get(key).push(row);
  }
  
  console.log(`🔍 Found ${courseGroups.size} unique courses (after removing sections)\n`);
  
  // Select best entry for each course
  const deduped = [];
  let totalRemoved = 0;
  
  for (const [key, group] of courseGroups.entries()) {
    // Sort by score (highest first)
    group.sort((a, b) => b.score - a.score);
    deduped.push(group[0]);
    
    if (group.length > 1) {
      totalRemoved += group.length - 1;
    }
  }
  
  console.log(`📊 Deduplication Results:`);
  console.log(`   Original: ${rows.length} entries`);
  console.log(`   Unique: ${deduped.length} courses`);
  console.log(`   Removed: ${totalRemoved} duplicates\n`);
  
  // Create backup
  console.log(`💾 Creating backup: ${path.basename(backupPath)}`);
  fs.copyFileSync(csvPath, backupPath);
  
  // Process and clean up data
  console.log(`🧹 Cleaning and restructuring data...\n`);
  
  const cleanedData = deduped.map(row => {
    const values = row.values;
    const combinedText = (values[meetingIdx] || '') + ' ' + (values[descIdx] || '');
    
    // Parse meeting time
    const meetingData = parseMeetingTime(combinedText);
    
    // Extract instructors
    let instructors = values[instructorIdx] || '';
    if (!instructors) {
      instructors = extractInstructors(combinedText);
    }
    
    // Extract requirements
    const requirements = extractRequirements(combinedText);
    
    // Clean description
    const description = cleanDescription(values[descIdx] || '');
    
    return {
      department: values[0] || '',
      subject: values[subjectIdx] || '',
      course_number: values[courseNumIdx] || '',
      title: values[titleIdx] || '',
      course_id: values[courseIdIdx] || '',
      term: values[termIdx] || '',
      credits: values[6] || '',
      weekdays: meetingData?.weekdays || '',
      start_time: meetingData?.startTime || '',
      end_time: meetingData?.endTime || '',
      instructors: instructors,
      distribution: values[9] || '',
      requirements: requirements,
      description: description
    };
  });
  
  // Write new CSV with clean structure
  console.log(`✍️  Writing cleaned CSV: ${path.basename(outputPath)}\n`);
  
  const newHeaders = [
    'department',
    'subject',
    'course_number',
    'title',
    'course_id',
    'term',
    'credits',
    'weekdays',
    'start_time',
    'end_time',
    'instructors',
    'distribution',
    'requirements',
    'description'
  ];
  
  const outputLines = [newHeaders.join(',')];
  
  for (const course of cleanedData) {
    const line = newHeaders.map(header => escapeCSV(course[header])).join(',');
    outputLines.push(line);
  }
  
  fs.writeFileSync(outputPath, outputLines.join('\n') + '\n', 'utf-8');
  
  console.log('✅ Cleanup complete!\n');
  console.log('📁 Files:');
  console.log(`   Original (backup): ${path.basename(backupPath)}`);
  console.log(`   Cleaned: ${path.basename(outputPath)}\n`);
  console.log('🔄 To use the cleaned file:');
  console.log(`   mv "${outputPath}" "${csvPath}"\n`);
  console.log('📋 New structure:');
  console.log('   - Separate weekdays, start_time, end_time columns');
  console.log('   - Clean instructors field');
  console.log('   - Separate requirements field');
  console.log('   - Clean description (no metadata mixed in)');
  console.log(`   - ${deduped.length} unique courses\n`);
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

