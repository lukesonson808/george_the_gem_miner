/**
 * MyHarvard Course URL Scraper
 * Scrapes course URLs from Harvard's course catalog (beta.my.harvard.edu)
 * Port of get_myharvard_url_chunks.py to Node.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class MyHarvardURLScraper {
  constructor(year, term, options = {}) {
    this.year = year;
    this.term = term;
    this.startPage = options.startPage || 1;
    this.outputFile = options.outputFile || 'course_urls.txt';
    this.maxWorkers = options.maxWorkers || 10;
    
    this.baseUrl = `https://beta.my.harvard.edu/search/?q=&sort=relevance&school=All&term=${year}+${term}`;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/json'
    };
    
    this.totalCourses = 0;
    this.scrapedUrls = [];
  }

  /**
   * Get initial data to determine total number of courses
   */
  async getInitialData() {
    try {
      const response = await axios.get(`${this.baseUrl}&page=1`, { headers: this.headers });
      this.totalCourses = response.data.total_hits || 0;
      console.log(`📊 Found ${this.totalCourses} total courses for ${this.year} ${this.term}`);
      return this.totalCourses;
    } catch (error) {
      console.error('❌ Error getting initial data:', error.message);
      return 0;
    }
  }

  /**
   * Extract course URLs from API response
   */
  extractCourseUrls(htmlContent) {
    const courseUrls = [];
    
    // Use regex to find course links in HTML
    // Looking for: /course/COURSECODE/YEAR-TERM/SECTION
    const linkRegex = /href="(\/course\/[^"]+)"/g;
    let match;
    
    while ((match = linkRegex.exec(htmlContent)) !== null) {
      const url = `https://beta.my.harvard.edu${match[1]}`;
      if (!courseUrls.includes(url)) {
        courseUrls.push(url);
      }
    }
    
    return courseUrls;
  }

  /**
   * Load existing URLs from file if resuming
   */
  loadExistingUrls() {
    if (this.startPage > 1 && fs.existsSync(this.outputFile)) {
      const content = fs.readFileSync(this.outputFile, 'utf-8');
      this.scrapedUrls = content.split('\n').filter(url => url.trim());
      console.log(`📂 Loaded ${this.scrapedUrls.length} existing URLs`);
    } else if (this.startPage <= 1 && fs.existsSync(this.outputFile)) {
      // Starting fresh, remove old file
      fs.unlinkSync(this.outputFile);
      console.log('🗑️  Removed existing course_urls.txt to start fresh');
    }
  }

  /**
   * Save URLs to file (append mode)
   */
  saveUrls(urls) {
    const content = urls.join('\n') + '\n';
    fs.appendFileSync(this.outputFile, content);
  }

  /**
   * Fetch a single page of data
   */
  async fetchPage(pageNum) {
    try {
      const url = `${this.baseUrl}&page=${pageNum}`;
      const response = await axios.get(url, { headers: this.headers });
      
      if (response.data && response.data.hits) {
        const urls = this.extractCourseUrls(response.data.hits);
        return urls;
      }
      
      return [];
    } catch (error) {
      console.error(`❌ Error fetching page ${pageNum}:`, error.message);
      return [];
    }
  }

  /**
   * Main scraping method
   */
  async scrape() {
    console.log(`🚀 Starting MyHarvard URL scraper for ${this.year} ${this.term}`);
    console.log(`📍 Starting from page ${this.startPage}`);
    
    // Load existing URLs if resuming
    this.loadExistingUrls();
    
    // Get total number of courses
    const totalHits = await this.getInitialData();
    if (totalHits === 0) {
      console.log('❌ No courses found. Exiting.');
      return [];
    }
    
    let currentPage = this.startPage;
    let consecutiveEmptyPages = 0;
    const expectedMaxPages = Math.ceil(totalHits / 10) + 10; // Buffer
    
    const startTime = Date.now();
    let progressCount = this.scrapedUrls.length;
    
    while (true) {
      const urls = await this.fetchPage(currentPage);
      
      if (urls.length === 0) {
        consecutiveEmptyPages++;
        console.log(`⚠️  Page ${currentPage} returned no URLs (${consecutiveEmptyPages} consecutive empty pages)`);
        
        if (consecutiveEmptyPages >= 10 || currentPage > expectedMaxPages) {
          console.log(`🛑 Reached stopping criteria at page ${currentPage}`);
          break;
        }
      } else {
        consecutiveEmptyPages = 0;
        
        // Save URLs incrementally
        this.saveUrls(urls);
        this.scrapedUrls.push(...urls);
        progressCount += urls.length;
        
        // Progress update
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = (progressCount / totalHits * 100).toFixed(1);
        const avgTimePerCourse = elapsed / progressCount;
        const remaining = totalHits - progressCount;
        const eta = Math.round(avgTimePerCourse * remaining);
        
        console.log(`📈 Progress: ${progressCount}/${totalHits} (${progress}%) | Page ${currentPage} | ETA: ${eta}s`);
      }
      
      currentPage++;
      
      // Small delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Scraping complete!`);
    console.log(`📊 Total courses found: ${this.scrapedUrls.length}`);
    console.log(`⏱️  Time elapsed: ${totalTime}s`);
    console.log(`💾 URLs saved to: ${this.outputFile}`);
    
    return this.scrapedUrls;
  }
}

// CLI usage
if (require.main === module) {
  const year = process.argv[2] || '2026';
  const term = process.argv[3] || 'Spring';
  const startPage = parseInt(process.argv[4]) || 1;
  
  console.log(`\n🎓 Harvard Course URL Scraper`);
  console.log(`📅 Year: ${year}, Term: ${term}`);
  console.log(`📄 Starting from page: ${startPage}\n`);
  
  const scraper = new MyHarvardURLScraper(year, term, { startPage });
  
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

module.exports = MyHarvardURLScraper;

