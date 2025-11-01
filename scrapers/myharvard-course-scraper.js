/**
 * MyHarvard Course Details Scraper
 * Scrapes detailed course information from MyHarvard course pages
 * Port of get_course_myharvard.py to Node.js
 */

const axios = require('axios');
const cheerio = require('cheerio');

class CourseDataNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CourseDataNotFoundError';
  }
}

class MyHarvardCourseScraper {
  constructor(url, options = {}) {
    this.url = url;
    this.debug = options.debug || false;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    this.$ = null;
  }

  /**
   * Make HTTP request and return HTML
   */
  async makeRequest() {
    try {
      const response = await axios.get(this.url, { headers: this.headers });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching page: ${error.message}`);
    }
  }

  /**
   * Safely extract text from an element
   */
  safeText(element) {
    if (!element || element.length === 0) return '';
    return element.text().trim();
  }

  /**
   * Safely extract text from a label
   */
  safeLabelText(labelText) {
    const label = this.$('strong').filter((i, el) => this.$(el).text() === labelText);
    if (label.length === 0) return '';
    
    const value = label.next('span').length > 0 
      ? label.next('span') 
      : label.next('a');
    
    return this.safeText(value);
  }

  /**
   * Safely extract text from a div with ID
   */
  safeDivText(divId) {
    const div = this.$(`#${divId}`);
    if (div.length === 0) return '';
    
    const p = div.find('p');
    return this.safeText(p);
  }

  /**
   * Extract course days from the HTML
   */
  extractDays() {
    const days = {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false
    };
    
    const daysDiv = this.$('div[role="group"][aria-label="Week Days"]');
    if (daysDiv.length === 0) return days;
    
    daysDiv.find('div[role="text"]').each((i, el) => {
      const ariaLabel = this.$(el).attr('aria-label');
      if (ariaLabel && ariaLabel.includes(', selected')) {
        const dayName = ariaLabel.replace(', selected', '').trim().toLowerCase();
        if (days.hasOwnProperty(dayName)) {
          days[dayName] = true;
        }
      }
    });
    
    return days;
  }

  /**
   * Extract instructor information
   */
  extractInstructors() {
    const instructors = [];
    const instructorDiv = this.$('#course-instructor');
    
    if (instructorDiv.length === 0) return instructors;
    
    instructorDiv.find('a.flex').each((i, el) => {
      const spans = this.$(el).find('> span');
      if (spans.length >= 2) {
        const href = this.$(el).attr('href') || '';
        const instructorId = href.split('/').pop();
        instructors.push({
          name: this.$(spans[1]).text().trim(),
          id: instructorId
        });
      }
    });
    
    return instructors;
  }

  /**
   * Extract basic course information
   */
  extractCourseInfo() {
    const courseInfoDiv = this.$('#course-info');
    if (courseInfoDiv.length === 0) {
      return {
        class_number: '',
        course_id: '',
        consent: '',
        enrolled: '',
        waitlist: ''
      };
    }
    
    const getInfoValue = (labelText) => {
      const label = courseInfoDiv.find('span').filter((i, el) => {
        return this.$(el).text() === labelText;
      });
      
      if (label.length === 0) return '';
      const value = label.next('span');
      return this.safeText(value);
    };
    
    return {
      class_number: getInfoValue('Class Number:'),
      course_id: getInfoValue('Course ID:'),
      consent: getInfoValue('Consent:'),
      enrolled: getInfoValue('Enrolled:'),
      waitlist: getInfoValue('Waitlist:')
    };
  }

  /**
   * Extract event-related data
   */
  extractEventData() {
    const eventElement = this.$('[data-event-term][data-event-session][data-event-start-date]');
    
    if (eventElement.length === 0) {
      return {
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        weekdays: ''
      };
    }
    
    return {
      start_date: eventElement.attr('data-event-start-date') || '',
      end_date: eventElement.attr('data-event-end-date') || '',
      start_time: eventElement.attr('data-event-start-time') || '',
      end_time: eventElement.attr('data-event-end-time') || '',
      weekdays: eventElement.attr('data-event-weekdays') || ''
    };
  }

  /**
   * Extract course title and subject/catalog
   */
  extractCourseTitle() {
    const titleElem = this.$('h1.text-lg');
    
    if (titleElem.length === 0) {
      return {
        course_title: '',
        subject_catalog: ''
      };
    }
    
    const courseTitleElem = titleElem.find('#course-title');
    const course_title = this.safeText(courseTitleElem);
    
    const subjectCatElem = titleElem.find('#course-sub-cat > span').first();
    const subject_catalog = this.safeText(subjectCatElem);
    
    return {
      course_title,
      subject_catalog
    };
  }

  /**
   * Main scraping method
   */
  async scrape() {
    try {
      // Get and parse HTML
      const htmlContent = await this.makeRequest();
      
      // Save HTML if debug mode
      if (this.debug) {
        const fs = require('fs');
        const path = require('path');
        const debugDir = 'debug_html';
        
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${debugDir}/course_${timestamp}.html`;
        fs.writeFileSync(filename, htmlContent);
        console.log(`💾 Saved HTML to ${filename}`);
      }
      
      this.$ = cheerio.load(htmlContent);
      
      // Extract course title
      const titleInfo = this.extractCourseTitle();
      
      if (!titleInfo.course_title) {
        throw new CourseDataNotFoundError('Critical course information (course title) is missing');
      }
      
      // Extract course time information
      const courseTimeDiv = this.$('#course-time');
      let year_term = '';
      let term_type = '';
      
      if (courseTimeDiv.length > 0) {
        const spans = courseTimeDiv.find('span');
        year_term = spans.length > 0 ? this.$(spans[0]).text().trim() : '';
        term_type = spans.length > 1 ? this.$(spans[1]).text().trim() : '';
      }
      
      // Extract days
      const days = this.extractDays();
      const dayFields = {};
      for (const [day, value] of Object.entries(days)) {
        dayFields[`lecture_${day}`] = value;
      }
      
      // Combine all data
      const courseData = {
        ...titleInfo,
        instructors: this.extractInstructors(),
        year_term,
        term_type,
        ...this.extractEventData(),
        ...this.extractCourseInfo(),
        ...dayFields,
        
        // Additional course information
        description: this.safeDivText('course-desc'),
        notes: this.safeDivText('course-notes'),
        school: this.safeLabelText('School'),
        units: this.safeLabelText('Units'),
        cross_registration: this.safeLabelText('Cross Reg'),
        department: this.safeLabelText('Department'),
        course_component: this.safeLabelText('Course Component'),
        instruction_mode: this.safeLabelText('Instruction Mode'),
        grading_basis: this.safeLabelText('Grading Basis'),
        course_requirements: this.safeLabelText('Course Requirements'),
        general_education: this.safeLabelText('General Education'),
        quantitative_reasoning: this.safeLabelText('Quantitative Reasoning with Data'),
        divisional_distribution: this.safeLabelText('Divisional Distribution')
      };
      
      return courseData;
      
    } catch (error) {
      if (error instanceof CourseDataNotFoundError) {
        throw error;
      }
      throw new Error(`Unexpected error: ${error.message}`);
    }
  }
}

// CLI usage
if (require.main === module) {
  const url = process.argv[2] || 'https://beta.my.harvard.edu/course/STAT109A/2025-Fall/001';
  
  const scraper = new MyHarvardCourseScraper(url, { debug: true });
  
  scraper.scrape()
    .then(courseData => {
      console.log('\n✅ Course data scraped successfully:');
      console.log(JSON.stringify(courseData, null, 2));
      
      // Save to JSON file
      const fs = require('fs');
      fs.writeFileSync('course_data.json', JSON.stringify(courseData, null, 2));
      console.log('\n💾 Saved to course_data.json');
    })
    .catch(error => {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = { MyHarvardCourseScraper, CourseDataNotFoundError };

