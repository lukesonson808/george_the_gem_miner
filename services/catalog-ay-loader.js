// AY 2025-2026 Catalog Loader
// Loads the full course catalog from the Academic Year CSV
// Provides comprehensive course listings with meeting times, descriptions, terms

const fs = require('fs');
const path = require('path');

class CatalogAYLoader {
  constructor(options = {}) {
    this.csvPath = options.csvPath || 
                   process.env.CATALOG_AY_CSV_PATH ||
                   path.join(__dirname, '..', 'AY_2025_2026_courses.csv');
    this.cache = null;
    console.log(`📚 AY Catalog Loader initialized: ${this.csvPath}`);
  }

  /**
   * Parse CSV line handling quoted fields with proper escaping
   */
  parseCSVLine(line) {
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

  /**
   * Parse meeting time string into structured data
   * Examples:
   *   "TR 1200 PM - 0115 PM" => {weekdays: "Tue/Thu", startTime: "12:00 PM", endTime: "1:15 PM"}
   *   "MW 1030 AM - 1145 AM" => {weekdays: "Mon/Wed", startTime: "10:30 AM", endTime: "11:45 AM"}
   *   "No meeting time listed" => null
   */
  parseMeetingTime(meeting) {
    if (!meeting || meeting.toLowerCase().includes('no meeting')) {
      return null;
    }

    // Map day codes to full names
    const dayMap = {
      'M': 'Mon',
      'T': 'Tue',
      'W': 'Wed',
      'R': 'Thu',  // R = Thursday in college schedules
      'F': 'Fri',
      'S': 'Sat',
      'U': 'Sun'
    };

    // Extract day codes and time range
    // Pattern: "MW 1030 AM - 1145 AM" or "TR 1200 PM - 0115 PM"
    const match = meeting.match(/^([MTWRFSU]+)\s+(\d{4})\s+(AM|PM)\s+-\s+(\d{4})\s+(AM|PM)/);
    
    if (!match) {
      return { raw: meeting };
    }

    const [, dayCodes, startTimeRaw, startPeriod, endTimeRaw, endPeriod] = match;
    
    // Convert day codes to readable format
    const weekdays = dayCodes
      .split('')
      .map(code => dayMap[code] || code)
      .join('/');
    
    // Format times (e.g., "1030" => "10:30")
    const formatTime = (time, period) => {
      const hours = time.slice(0, -2);
      const minutes = time.slice(-2);
      return `${hours}:${minutes} ${period}`;
    };
    
    return {
      weekdays,
      startTime: formatTime(startTimeRaw, startPeriod),
      endTime: formatTime(endTimeRaw, endPeriod),
      raw: meeting
    };
  }

  /**
   * Load catalog data from CSV
   */
  loadData() {
    if (this.cache) {
      console.log(`✅ AY Catalog: Using cached data (${this.cache.length} courses)`);
      return this.cache;
    }

    if (!fs.existsSync(this.csvPath)) {
      console.warn(`⚠️  AY Catalog CSV not found: ${this.csvPath}`);
      return [];
    }

    try {
      const content = fs.readFileSync(this.csvPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        console.warn('⚠️  AY Catalog CSV is empty');
        return [];
      }

      // Parse header
      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);
      
      console.log(`📋 CSV Headers: ${headers.join(', ')}`);
      
      // Find column indices (flexible to handle different column orders)
      const getColIndex = (name) => headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
      
      const departmentIdx = getColIndex('department');
      const subjectIdx = getColIndex('subject');
      const courseNumberIdx = getColIndex('course_number');
      const titleIdx = getColIndex('title');
      const courseIdIdx = getColIndex('course_id');
      const termIdx = getColIndex('term');
      const creditsIdx = getColIndex('credits');
      const weekdaysIdx = getColIndex('weekdays');
      const startTimeIdx = getColIndex('start_time');
      const endTimeIdx = getColIndex('end_time');
      const instructorsIdx = getColIndex('instructors');
      const distributionIdx = getColIndex('distribution');
      const requirementsIdx = getColIndex('requirements');
      const descriptionIdx = getColIndex('description');
      
      // Parse data rows
      const courses = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          const values = this.parseCSVLine(line);
          
          // Extract fields using indices
          const department = values[departmentIdx] || '';
          const subject = values[subjectIdx] || '';
          const courseNumber = values[courseNumberIdx] || '';
          const title = values[titleIdx] || '';
          const courseId = values[courseIdIdx] || '';
          const term = values[termIdx] || '';
          const credits = values[creditsIdx] || '';
          const weekdays = values[weekdaysIdx] || '';
          const startTime = values[startTimeIdx] || '';
          const endTime = values[endTimeIdx] || '';
          const instructors = values[instructorsIdx] || '';
          const distribution = values[distributionIdx] || '';
          const requirements = values[requirementsIdx] || '';
          const description = values[descriptionIdx] || '';
          
          // Skip table of contents entries and invalid rows
          if (title.includes('HARVARD UNIVERSITY') || title.includes('TABLE OF CONTENTS')) {
            continue;
          }
          
          // Skip rows without a valid course ID
          if (!courseId || courseId.trim() === '') {
            continue;
          }
          
          // Create meeting parsed object from the already-separated fields
          const meetingParsed = {
            weekdays: weekdays.trim() || null,
            startTime: startTime.trim() || null,
            endTime: endTime.trim() || null,
            raw: weekdays && startTime && endTime 
              ? `${weekdays} ${startTime} - ${endTime}`
              : 'No meeting time listed'
          };
          
      // Clean up instructors field - remove trailing words that are part of description
      let cleanedInstructors = instructors.trim();
      
      // If the entire instructor field is just a common word (description leaked), mark as unavailable
      const commonDescriptionWords = /^(How|What|This|In|The|A|An|Is|Are|Was|Were|Do|Does|Did|Can|Could|Will|Would|Should|May|Might|Must|Shall|Big|We)$/i;
      if (commonDescriptionWords.test(cleanedInstructors)) {
        cleanedInstructors = 'Instructor not listed';
      } else {
        // Remove common words that bleed from description into instructor field (at the end)
        cleanedInstructors = cleanedInstructors.replace(/\s+(How|What|This|In|The|A|An|Is|Are|Was|Were|Do|Does|Did|Field|Course|Students|Topics|Instructor|Professor|We|It|For|To|From|With|By|At|On|Of|And|Or|But|As|Can|Could|Will|Would|Big|Small|Large|Many|Some|All|Each|Every|Most)$/i, '');
      }
      
      // Create course object
      const course = {
        courseId: `${subject} ${courseNumber}`.trim(),
        subject: subject.trim(),
        courseNumber: courseNumber.trim(),
        title: title.trim(),
        department: department.trim(),
        term: term.trim(),
        credits: credits.trim(),
        meeting: meetingParsed.raw, // Reconstructed meeting string
        meetingParsed,
        weekdays: weekdays.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        instructors: cleanedInstructors,
        distribution: distribution.trim(),
        requirements: requirements.trim(),
        description: description.trim()
      };
          
          courses.push(course);
          
        } catch (err) {
          console.warn(`⚠️  Failed to parse line ${i + 1}: ${err.message}`);
        }
      }

      console.log(`✅ AY Catalog: Loaded ${courses.length} courses from CSV`);
      this.cache = courses;
      return courses;

    } catch (err) {
      console.error('❌ AY Catalog: Failed to load CSV:', err.message);
      return [];
    }
  }

  /**
   * Get all courses for a specific term
   */
  getCoursesByTerm(term) {
    const courses = this.loadData();
    return courses.filter(c => c.term.toLowerCase().includes(term.toLowerCase()));
  }

  /**
   * Get all courses by department/subject
   */
  getCoursesBySubject(subject) {
    const courses = this.loadData();
    const subjectUpper = subject.toUpperCase();
    return courses.filter(c => 
      c.subject.toUpperCase() === subjectUpper ||
      c.subject.toUpperCase().includes(subjectUpper)
    );
  }

  /**
   * Get courses by weekday pattern (e.g., "Tue/Thu", "Mon/Wed/Fri")
   */
  getCoursesByWeekdays(weekdayPattern) {
    const courses = this.loadData();
    const pattern = weekdayPattern.toLowerCase();
    return courses.filter(c => {
      if (!c.meetingParsed || !c.meetingParsed.weekdays) return false;
      const weekdays = c.meetingParsed.weekdays.toLowerCase();
      return weekdays.includes(pattern) || pattern.includes(weekdays);
    });
  }

  /**
   * Search courses by keyword in title or description
   */
  searchCourses(keyword) {
    const courses = this.loadData();
    const lowerKeyword = keyword.toLowerCase();
    return courses.filter(c =>
      c.title.toLowerCase().includes(lowerKeyword) ||
      c.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get course by exact course ID
   */
  getCourseById(courseId) {
    if (!courseId) return undefined;
    
    const courses = this.loadData();
    const searchId = courseId.toUpperCase().trim();
    
    // Try exact match first
    let course = courses.find(c => 
      c.courseId.toUpperCase().trim() === searchId
    );
    
    if (course) return course;
    
    // Try matching without section numbers (e.g., "COMPSCI 50 001" matches "COMPSCI 50")
    course = courses.find(c => {
      const cId = c.courseId.toUpperCase().trim();
      return cId === searchId || cId.startsWith(searchId + ' ');
    });
    
    if (course) return course;
    
    // Try CS/COMPSCI variations (e.g., "CS 50" matches "COMPSCI 50")
    if (searchId.startsWith('CS ')) {
      const compsciId = searchId.replace('CS ', 'COMPSCI ');
      course = courses.find(c => {
        const cId = c.courseId.toUpperCase().trim();
        return cId === compsciId || cId.startsWith(compsciId + ' ');
      });
    } else if (searchId.startsWith('COMPSCI ')) {
      const csId = searchId.replace('COMPSCI ', 'CS ');
      course = courses.find(c => {
        const cId = c.courseId.toUpperCase().trim();
        return cId === csId || cId.startsWith(csId + ' ');
      });
    }
    
    return course;
  }
}

module.exports = CatalogAYLoader;

