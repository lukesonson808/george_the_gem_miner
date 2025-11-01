#!/bin/bash
# Full Harvard Course Scraping Pipeline
# Usage: ./scrapers/run-full-scrape.sh 2026 Spring

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 2 ]; then
    echo "Usage: ./run-full-scrape.sh YEAR TERM"
    echo "Example: ./run-full-scrape.sh 2026 Spring"
    exit 1
fi

YEAR=$1
TERM=$2
OUTPUT_DIR="data/scraped/${YEAR}_${TERM}"

echo -e "${BLUE}🎓 Harvard Course Scraping Pipeline${NC}"
echo -e "${BLUE}📅 Year: $YEAR, Term: $TERM${NC}\n"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Step 1: Scrape Course URLs
echo -e "${GREEN}Step 1: Scraping course URLs from MyHarvard...${NC}"
node scrapers/myharvard-url-scraper.js $YEAR $TERM
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ URL scraping failed!${NC}"
    exit 1
fi

# Move URLs file
mv course_urls.txt "$OUTPUT_DIR/course_urls.txt"
echo -e "${GREEN}✅ Course URLs saved to $OUTPUT_DIR/course_urls.txt${NC}\n"

# Step 2: Scrape Course Details
echo -e "${GREEN}Step 2: Scraping course details...${NC}"
node scrapers/scrape-all-courses.js "$OUTPUT_DIR/course_urls.txt" "$OUTPUT_DIR/myharvard_courses.json" 10
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}❌ Course details scraping failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Course details saved to $OUTPUT_DIR/myharvard_courses.json${NC}\n"

# Step 3: Q-Report (if cookies exist)
if [ -f "secret_cookie.txt" ]; then
    echo -e "${GREEN}Step 3: Downloading Q-Report data...${NC}"
    echo -e "${YELLOW}⚠️  Q-Report scraper not yet implemented${NC}\n"
    # node scrapers/qreport-downloader.js "$OUTPUT_DIR/courses.csv"
else
    echo -e "${YELLOW}⚠️  Skipping Q-Report: secret_cookie.txt not found${NC}"
    echo -e "${YELLOW}   To scrape Q-Report data:${NC}"
    echo -e "${YELLOW}   1. Log into https://qreports.fas.harvard.edu/${NC}"
    echo -e "${YELLOW}   2. Open DevTools → Application → Cookies${NC}"
    echo -e "${YELLOW}   3. Copy cookies to secret_cookie.txt${NC}\n"
fi

# Summary
echo -e "${GREEN}✨ Scraping complete!${NC}"
echo -e "${BLUE}📁 Output directory: $OUTPUT_DIR${NC}"
echo ""
echo -e "Files created:"
echo -e "  📄 ${OUTPUT_DIR}/course_urls.txt"
echo -e "  📄 ${OUTPUT_DIR}/myharvard_courses.json"
echo -e "  📄 ${OUTPUT_DIR}/myharvard_courses.csv"
echo ""
echo -e "Next steps:"
echo -e "  1. Get Q-Report session cookies (see README.md)"
echo -e "  2. Run Q-Report downloader (coming soon)"
echo -e "  3. Integrate with Georgie the Gem Miner"

