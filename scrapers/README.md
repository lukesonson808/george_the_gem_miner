# Harvard Course Scrapers

Node.js scrapers for collecting Harvard course data from MyHarvard and Q-Report.

## Overview

These scrapers collect comprehensive Harvard course data from two sources:
1. **MyHarvard** (`beta.my.harvard.edu`) - Course details, meeting times, GenEd requirements
2. **Q-Report/Bluera** (`harvard.bluera.com`) - Student ratings, workload, reviews

## Setup

```bash
npm install axios cheerio
```

## Usage

### Step 1: Scrape MyHarvard Course URLs

```bash
node scrapers/myharvard-url-scraper.js 2026 Spring
```

This creates `course_urls.txt` with ~3000+ course URLs.

**Parameters:**
- `year`: Academic year (e.g., `2026`)
- `term`: Term (`Spring` or `Fall`)
- `startPage` (optional): Resume from specific page

**Resume scraping:**
```bash
node scrapers/myharvard-url-scraper.js 2026 Spring 42
```

**Output:** `course_urls.txt` (one URL per line)

---

### Step 2: Scrape Course Details from MyHarvard

```bash
node scrapers/scrape-all-courses.js course_urls.txt myharvard_2026_spring.json 10
```

**Parameters:**
- `urlsFile`: Input file with course URLs (from Step 1)
- `outputFile`: JSON output filename
- `maxWorkers`: Number of concurrent scrapers (default: 10)

**Output:** 
- `myharvard_2026_spring.json` (detailed JSON)
- `myharvard_2026_spring.csv` (CSV format)

**Data includes:**
- Course title, ID, department
- Meeting times (days/hours)
- Instructors
- GenEd/distribution requirements
- Enrollment numbers
- Course description

---

### Step 3: Get Q-Report Data (Requires Login)

**⚠️ You need Bluera session cookies to download Q-Report data.**

#### Getting Session Cookies:

1. **Log into Harvard's Q-Report:**
   - Visit: https://qreports.fas.harvard.edu/browse/index
   - Log in with HarvardKey

2. **Get your session cookies:**
   - Open Chrome DevTools (F12)
   - Go to **Application** → **Cookies** → `https://harvard.bluera.com`
   - Copy the cookie values:
     - `ASP.NET_SessionId`
     - `session_token`
     - Any other cookies

3. **Create `secret_cookie.txt`:**
   ```bash
   echo "ASP.NET_SessionId=your_value; session_token=your_value" > secret_cookie.txt
   ```

#### Download Q-Report Pages:

Coming soon: `qreport-downloader.js`

---

## Full Pipeline

```bash
# 1. Get course URLs
node scrapers/myharvard-url-scraper.js 2026 Spring

# 2. Scrape course details
node scrapers/scrape-all-courses.js course_urls.txt myharvard_2026_spring.json

# 3. Download Q-Report data (requires cookies)
# node scrapers/qreport-downloader.js courses.csv

# 4. Analyze Q-Report ratings
# node scrapers/qreport-analyzer.js
```

---

## Data Schema

### MyHarvard Course Data

```json
{
  "course_title": "Introduction to Computer Science",
  "subject_catalog": "CS 50",
  "course_id": "123456",
  "instructors": "David Malan",
  "department": "Computer Science",
  "year_term": "2026 Spring",
  "start_date": "2026-01-26",
  "end_date": "2026-05-12",
  "start_time": "10:30",
  "end_time": "12:00",
  "weekdays": "MW",
  "lecture_monday": true,
  "lecture_wednesday": true,
  "general_education": "Quantitative Reasoning",
  "units": "4",
  "description": "...",
  "enrolled": "350",
  "waitlist": "20"
}
```

### Q-Report Data (Coming Soon)

```json
{
  "course_code": "CS 50",
  "course_score_mean": 4.8,
  "workload_score_mean": 12.5,
  "lecturer_score_mean": 4.9,
  "rec_score_mean": 4.7,
  "sentiment_score_mean": 0.85,
  "gem_probability_mean": 0.9,
  "num_responded": 280,
  "best_comment": "...",
  "best_gem_comment": "..."
}
```

---

## Troubleshooting

### "No URLs found"
- Check year/term parameters
- MyHarvard may have changed their API endpoint

### "Timeout errors"
- Reduce `maxWorkers` (try 5 instead of 10)
- Check internet connection

### "Cookie expired" (Q-Report)
- Get fresh cookies from DevTools
- Cookies typically expire after 24 hours

### "Course data missing"
- Some courses may not have detail pages
- Check the URL format matches: `/course/{CODE}/{YEAR}-{TERM}/{SECTION}`

---

## Files

- `myharvard-url-scraper.js` - Scrapes course URLs from MyHarvard search
- `myharvard-course-scraper.js` - Scrapes individual course details
- `scrape-all-courses.js` - Orchestrates bulk course scraping
- `qreport-downloader.js` - Downloads Q-Report pages (TODO)
- `qreport-analyzer.js` - Analyzes Q-Report ratings (TODO)

---

## Notes

- **Rate Limiting:** Built-in 100ms delays between requests
- **Resume Support:** URL scraper can resume from any page
- **Error Handling:** Continues on individual failures, logs errors
- **Progress Tracking:** Real-time ETA and progress updates

---

## Integration with Georgie

Once data is scraped, it's automatically integrated with the Gem Miner service:

```javascript
const gemMiner = require('../services/gem-miner');
const gems = await gemMiner.findGems({ maxHrsPerWeek: 8, noFinal: true });
```

See `services/gem-miner.js` for ranking algorithm details.

