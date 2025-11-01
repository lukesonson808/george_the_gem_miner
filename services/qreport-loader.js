// Q-Report Data Loader - Loads pre-scraped Q-Report data from CSV
// Uses the 2025_spring.csv data from the Python scrapers

const fs = require('fs');
const path = require('path');

class QReportLoader {
  constructor(options = {}) {
    // Default to data/qreport-spring-2025.csv which has complete Q-Report data
    this.csvPath = options.csvPath || 
                   process.env.QREPORT_CSV_PATH ||
                   path.join(__dirname, '..', 'data', 'qreport-spring-2025.csv');
    this.cache = null;
    console.log(`📊 Q-Report Loader initialized: ${this.csvPath}`);
  }

  /**
   * Parse CSV line handling quoted fields
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
   * Load Q-Report data from CSV
   */
  loadData() {
    if (this.cache) {
      console.log(`✅ Q-Report Loader: Using cached data (${this.cache.length} courses)`);
      return this.cache;
    }

    if (!fs.existsSync(this.csvPath)) {
      console.warn(`⚠️  Q-Report CSV not found: ${this.csvPath}`);
      return [];
    }

    try {
      const content = fs.readFileSync(this.csvPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        console.warn('⚠️  Q-Report CSV is empty');
        return [];
      }

      // Parse header
      const headerLine = lines[0];
      const headers = this.parseCSVLine(headerLine);
      
      // Find column indices (silently handle optional columns)
      const getIndex = (name, isOptional = false) => {
        const idx = headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (idx === -1 && !isOptional) console.warn(`⚠️  Column not found: ${name}`);
        return idx;
      };

      const courseCodeIdx = getIndex('course_code');
      const courseTitleIdx = getIndex('course_title');
      const courseScoreIdx = getIndex('course_score_mean');
      const workloadIdx = getIndex('workload_score_mean');
      const recScoreIdx = getIndex('rec_score_mean');
      const sentimentIdx = getIndex('sentiment_score_mean');
      const gemProbIdx = getIndex('gem_probability_mean');
      const bestCommentIdx = getIndex('best_gem_comment');
      const numRespondedIdx = getIndex('num_responded');
      const linkIdx = getIndex('link'); // Q-Report link
      
      // Optional columns (from catalog, not Q-Report)
      const descriptionIdx = getIndex('description', true); // Course description (optional)
      const genEdIdx = getIndex('general_education', true); // GenEd requirement (optional)
      const weekdaysIdx = getIndex('weekdays', true); // Meeting days (optional)
      const startTimeIdx = getIndex('start_time', true); // Start time (optional)
      const endTimeIdx = getIndex('end_time', true); // End time (optional)

      // Parse data rows
      const courses = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        try {
          const values = this.parseCSVLine(line);
          
          const courseCode = values[courseCodeIdx] || '';
          const courseTitle = values[courseTitleIdx] || '';
          
          // Skip if no course code
          if (!courseCode) continue;

          // Parse numeric values
          const parseNum = (idx) => {
            if (idx === -1 || !values[idx]) return null;
            const val = parseFloat(values[idx]);
            return isNaN(val) ? null : val;
          };

          const course = {
            courseId: courseCode.trim(),
            title: courseTitle.replace(/^"(.*)"$/, '$1').trim(),
            rating: parseNum(courseScoreIdx),
            workloadHrs: parseNum(workloadIdx),
            recScore: parseNum(recScoreIdx),
            sentiment: parseNum(sentimentIdx),
            gemProbability: parseNum(gemProbIdx),
            bestComment: bestCommentIdx !== -1 ? values[bestCommentIdx]?.replace(/^"(.*)"$/, '$1') : null,
            numResponded: parseNum(numRespondedIdx),
            qreportLink: linkIdx !== -1 ? values[linkIdx] : null,
            description: descriptionIdx !== -1 ? values[descriptionIdx]?.replace(/^"(.*)"$/, '$1') : null,
            genEd: genEdIdx !== -1 ? values[genEdIdx]?.replace(/^"(.*)"$/, '$1') : null,
            weekdays: weekdaysIdx !== -1 ? values[weekdaysIdx] : null,
            startTime: startTimeIdx !== -1 ? values[startTimeIdx] : null,
            endTime: endTimeIdx !== -1 ? values[endTimeIdx] : null
          };

          courses.push(course);
        } catch (err) {
          console.warn(`⚠️  Failed to parse line ${i}: ${err.message}`);
        }
      }

      console.log(`✅ Q-Report Loader: Loaded ${courses.length} courses from CSV`);
      this.cache = courses;
      return courses;

    } catch (err) {
      console.error('❌ Q-Report Loader: Failed to load CSV:', err.message);
      return [];
    }
  }

  /**
   * Fetch courses with optional filters
   */
  async fetchCourses(filters = {}) {
    const courses = this.loadData();
    return this.applyFilters(courses, filters);
  }

  /**
   * Apply filters to course list
   */
  applyFilters(courses, filters) {
    let filtered = [...courses];

    // Filter by department/subject
    if (filters.department) {
      const dept = filters.department.toUpperCase();
      filtered = filtered.filter(c => 
        c.courseId.toUpperCase().startsWith(dept) ||
        c.courseId.toUpperCase().includes(dept) ||
        c.title.toUpperCase().includes(dept)
      );
    }

    // Filter by title search (for keywords like "psychology")
    if (filters.titleSearch) {
      const search = filters.titleSearch.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(search) ||
        (c.description && c.description.toLowerCase().includes(search))
      );
    }

    // Filter by min rating
    if (filters.minRating != null) {
      filtered = filtered.filter(c => c.rating != null && c.rating >= filters.minRating);
    }

    // Filter by max workload
    if (filters.maxHrsPerWeek != null) {
      filtered = filtered.filter(c => c.workloadHrs != null && c.workloadHrs <= filters.maxHrsPerWeek);
    }

    // Filter by min gem probability
    if (filters.minGemProb != null) {
      filtered = filtered.filter(c => 
        c.gemProbability != null && c.gemProbability >= filters.minGemProb
      );
    }

    return filtered;
  }
}

module.exports = QReportLoader;

