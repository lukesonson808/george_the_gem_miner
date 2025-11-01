# 🪨⛏️ Georgie the Gem Miner

**Harvard's Q-Report Course Advisor Agent**

Georgie helps Harvard students find "Gems" — easy, high-rated courses with light workload and great vibes!

---

## 🎯 What Georgie Does

- **Ranks 1,567+ courses** from Spring 2025 Q-Report data
- **GemScore algorithm** (0-100 scale) based on ratings + workload + student sentiment
- **Natural conversation** - chat naturally, not robotic search queries
- **Complete info** - ratings, workload, meeting times, GenEds, Q-Report links
- **Anti-hallucination** - only recommends courses that exist in the data

## 📊 Data Sources

| Source | Courses | Contains |
|--------|---------|----------|
| **Q-Report** | 1,567 | Ratings, workload, comments, links |
| **Course Catalog** | 5,389 | Meeting times, GenEds, instructors |
| **Merged** | ~3,300 | Combined + ranked |

## 🚀 Quick Start

### 1. Install & Configure

```bash
# Clone repo
git clone <repo-url>
cd george_the_gem_miner

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Add your API keys
```

Required environment variables:
```bash
GEMINI_API_KEY=your_gemini_api_key
GEM_MINER_API_KEY=your_a1zap_api_key  # or use A1ZAP_API_KEY
GEM_MINER_AGENT_ID=your_agent_id      # or use A1ZAP_AGENT_ID
```

### 2. Verify Setup

```bash
# Check configuration
npm run check

# Test Georgie
npm run georgie:test
```

Expected output:
```
✅ Q-Report Loader: Loaded 1567 courses
✅ Catalog loaded: 5389 courses
✅ Gem Miner: 3173 courses after merge
✅ Georgie working! 3173 courses found
```

### 3. Start Server

```bash
# Start server
npm start

# In another terminal, start tunnel
npm run tunnel
```

### 4. Configure A1Zap

1. Go to A1Zap dashboard
2. Create/edit agent
3. Set webhook: `https://your-tunnel.loca.lt/webhook/gem-miner`
4. Test: "Hey Georgie, show me easy CS classes!"

## 💬 Example Queries

```
"Show me easy CS classes"
"Find psych courses with no final exam"
"What are gems that meet in the morning?"
"I need a light GenEd under 5 hours/week"
"Show me top ECON classes"
"When does CS 50 meet?"
```

## 📈 GemScore Algorithm

**Scale:** 0-100 (higher = better gem)

```
GemScore = Rating (0-50) + Workload (0-40) + Comments (0-10)
```

### Rating (0-50 points)
- ⭐⭐⭐⭐⭐ 4.5+: 50 points
- ⭐⭐⭐⭐ 4.0-4.5: 40 points
- ⭐⭐⭐ 3.5-4.0: 30 points
- ⭐⭐ 3.0-3.5: 20 points

### Workload (0-40 points)
- 💎 ≤3 hrs: 40 points (very light)
- ✨ ≤5 hrs: 30 points (light)
- ⚡ ≤8 hrs: 20 points (moderate)
- 📚 ≤10 hrs: 10 points (medium)

### Comment Bonus (0-10 points)
- Mentions "gem" or "easy class": +10 points

## 🔄 Updating Data

### Quick Update

```bash
# Automated update script
npm run georgie:update

# Or manually specify semester
node scripts/update-qreport-data.js 2026 Spring
```

This will:
1. ✅ Scrape MyHarvard course URLs
2. ✅ Get course details (times, GenEds, instructors)
3. ✅ Save to correct locations
4. ⚠️ Q-Report data requires manual download (Harvard login required)

### Manual Q-Report Update

1. Visit: https://qreports.fas.harvard.edu/browse/index
2. Log in with HarvardKey
3. Download Spring 2026 evaluations
4. Save as: `data/qreport-spring-2026.csv`
5. Update `QREPORT_CSV_PATH` in `.env`

## 🛠️ NPM Scripts

```bash
npm start            # Start server
npm run dev          # Start with auto-reload
npm run tunnel       # Create public tunnel
npm run check        # Check configuration
npm run georgie:test # Test Georgie data loading
npm run georgie:update # Update course data
```

## 📂 Project Structure

```
agents/
  gem-miner-agent.js       # Georgie personality & prompts
webhooks/
  gem-miner-webhook.js     # Request handling
services/
  gem-miner.js             # Main orchestration
  qreport-loader.js        # Q-Report data
  catalog-ay-loader.js     # Course catalog loader
  catalog-parser.js        # Course catalog parser
  gem-ranking.js           # GemScore algorithm
  department-mapper.js     # "CS" → "COMPSCI"
  canvas-signals.js        # Canvas assessment data
scrapers/
  myharvard-url-scraper.js # Get course URLs
  scrape-all-courses.js    # Scrape details
  README.md                # Scraper docs
data/
  qreport-spring-2025.csv  # Q-Report data
AY_2025_2026_courses.csv   # Course catalog
```

## 🧪 Testing

```bash
# Test data loading
npm run georgie:test

# Test specific department
node -e "const {findGems} = require('./services/gem-miner'); findGems({filters: {department: 'PSYCH'}}).then(g => console.log(g.length, 'psych courses found'));"
```

## 🔧 Configuration

See `config.js` for all configuration options. Key settings:

- **Gemini API**: Used for AI responses
- **A1Zap API**: Used for webhook delivery
- **Q-Report CSV**: Path to Q-Report data file
- **Catalog CSV**: Path to course catalog file

## 📝 License

MIT

---

**Built with ❤️ for Harvard students**

