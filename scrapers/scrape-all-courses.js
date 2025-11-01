/**
 * All Courses Scraper Orchestrator
 * Orchestrates the full scraping workflow for MyHarvard courses
 * Port of get_all_course_data.py to Node.js
 */

const fs = require('fs');
const path = require('path');
const { MyHarvardCourseScraper, CourseDataNotFoundError } = require('./myharvard-course-scraper');

class AllCoursesScraper {
  constructor(options = {}) {
    this.urlsFile = options.urlsFile || 'course_urls.txt';
    this.outputFile = options.outputFile || 'myharvard_courses.json';
    this.maxWorkers = options.maxWorkers || 10;
    this.debug = options.debug || false;
  }

  /**
   * Read course URLs from file
   */
  readCourseUrls() {
    if (!fs.existsSync(this.urlsFile)) {
      throw new Error(`URLs file not found: ${this.urlsFile}`);
    }
    
    const content = fs.readFileSync(this.urlsFile, 'utf-8');
    const urls = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log(`📂 Loaded ${urls.length} course URLs from ${this.urlsFile}`);
    return urls;
  }

  /**
   * Format instructor names into comma-separated string
   */
  formatInstructors(instructors) {
    return instructors.map(i => i.name).join(', ');
  }

  /**
   * Scrape a single course
   */
  async scrapeSingleCourse(url) {
    try {
      const scraper = new MyHarvardCourseScraper(url, { debug: this.debug });
      const courseData = await scraper.scrape();
      
      // Format instructors
      courseData.instructors = this.formatInstructors(courseData.instructors);
      
      return courseData;
    } catch (error) {
      if (error instanceof CourseDataNotFoundError) {
        console.error(`⚠️  Missing data for ${url}: ${error.message}`);
      } else {
        console.error(`❌ Error scraping ${url}: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Scrape courses with concurrency control
   */
  async scrapeWithConcurrency(urls) {
    const results = [];
    const total = urls.length;
    let completed = 0;
    let errors = 0;
    
    const startTime = Date.now();
    
    // Process in batches
    for (let i = 0; i < urls.length; i += this.maxWorkers) {
      const batch = urls.slice(i, i + this.maxWorkers);
      const promises = batch.map(url => this.scrapeSingleCourse(url));
      
      const batchResults = await Promise.all(promises);
      
      batchResults.forEach(result => {
        if (result) {
          results.push(result);
        } else {
          errors++;
        }
        completed++;
      });
      
      // Progress update
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = (completed / total * 100).toFixed(1);
      const avgTimePerCourse = elapsed / completed;
      const remaining = total - completed;
      const eta = Math.round(avgTimePerCourse * remaining);
      
      console.log(`📈 Progress: ${completed}/${total} (${progress}%) | Errors: ${errors} | ETA: ${eta}s`);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Main scraping method
   */
  async scrape() {
    console.log(`\n🚀 Starting course scraping...`);
    console.log(`📊 Max concurrent workers: ${this.maxWorkers}`);
    
    // Read URLs
    const urls = this.readCourseUrls();
    
    if (urls.length === 0) {
      console.log('❌ No URLs to scrape');
      return [];
    }
    
    // Scrape all courses
    const courseData = await this.scrapeWithConcurrency(urls);
    
    // Remove duplicates by course_id
    const uniqueCourses = [];
    const seenIds = new Set();
    
    for (const course of courseData) {
      const id = course.course_id || course.subject_catalog;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueCourses.push(course);
      }
    }
    
    console.log(`\n✅ Scraping complete!`);
    console.log(`📊 Total courses scraped: ${courseData.length}`);
    console.log(`📊 Unique courses: ${uniqueCourses.length}`);
    
    // Save to JSON
    fs.writeFileSync(this.outputFile, JSON.stringify(uniqueCourses, null, 2));
    console.log(`💾 Saved to: ${this.outputFile}`);
    
    // Also save as CSV for compatibility
    await this.saveAsCSV(uniqueCourses);
    
    return uniqueCourses;
  }

  /**
   * Save data as CSV
   */
  async saveAsCSV(courses) {
    if (courses.length === 0) return;
    
    const csvFile = this.outputFile.replace('.json', '.csv');
    
    // Define headers (match Python version)
    const headers = [
      'course_title', 'subject_catalog', 'instructors', 'year_term', 'term_type',
      'start_date', 'end_date', 'start_time', 'end_time', 'weekdays',
      'class_number', 'course_id', 'consent', 'enrolled', 'waitlist',
      'lecture_sunday', 'lecture_monday', 'lecture_tuesday', 'lecture_wednesday',
      'lecture_thursday', 'lecture_friday', 'lecture_saturday',
      'description', 'notes', 'school', 'units', 'cross_registration',
      'department', 'course_component', 'instruction_mode', 'grading_basis',
      'course_requirements', 'general_education', 'quantitative_reasoning', 'divisional_distribution'
    ];
    
    // Build CSV content
    const rows = [headers.join(',')];
    
    for (const course of courses) {
      const row = headers.map(header => {
        const value = course[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        // Escape commas and quotes
        const strValue = String(value).replace(/"/g, '""');
        return strValue.includes(',') ? `"${strValue}"` : strValue;
      });
      rows.push(row.join(','));
    }
    
    fs.writeFileSync(csvFile, rows.join('\n'));
    console.log(`💾 Also saved as CSV: ${csvFile}`);
  }
}

// CLI usage
if (require.main === module) {
  const urlsFile = process.argv[2] || 'course_urls.txt';
  const outputFile = process.argv[3] || 'myharvard_courses.json';
  const maxWorkers = parseInt(process.argv[4]) || 10;
  
  console.log(`\n🎓 Harvard Course Scraper`);
  console.log(`📂 Input: ${urlsFile}`);
  console.log(`💾 Output: ${outputFile}`);
  console.log(`⚙️  Workers: ${maxWorkers}\n`);
  
  const scraper = new AllCoursesScraper({ 
    urlsFile, 
    outputFile, 
    maxWorkers,
    debug: false
  });
  
  scraper.scrape()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = AllCoursesScraper;

