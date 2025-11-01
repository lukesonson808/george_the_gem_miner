/**
 * Configuration checker script for Georgie the Gem Miner
 * Checks if all API keys and data files are properly configured
 */

const config = require('./config');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Georgie Configuration Check\n');
console.log('='.repeat(50));

// Check Gemini API
console.log('\n📡 Gemini API:');
if (config.gemini.apiKey && !config.gemini.apiKey.includes('your_')) {
  console.log('  ✅ Configured');
  console.log(`  Model: ${config.gemini.defaultModel}`);
} else {
  console.log('  ❌ Not configured');
  console.log('  Set GEMINI_API_KEY environment variable');
}

// Check Gem Miner A1Zap API
console.log('\n⛏️  Gem Miner A1Zap:');
const gemMinerConfig = config.agents.gemMiner;
if (gemMinerConfig.apiKey && !gemMinerConfig.apiKey.includes('your_')) {
  console.log('  ✅ API Key configured');
} else {
  console.log('  ❌ API Key not configured');
  console.log('  Set GEM_MINER_API_KEY or A1ZAP_API_KEY environment variable');
}

if (gemMinerConfig.agentId && !gemMinerConfig.agentId.includes('your_')) {
  console.log('  ✅ Agent ID configured');
  console.log(`  Agent ID: ${gemMinerConfig.agentId}`);
} else {
  console.log('  ❌ Agent ID not configured');
  console.log('  Set GEM_MINER_AGENT_ID or A1ZAP_AGENT_ID environment variable');
}

// Check Data Files
console.log('\n📊 Data Files:');

const qreportPath = path.join(__dirname, 'data', 'qreport-spring-2025.csv');
if (fs.existsSync(qreportPath)) {
  const stats = fs.statSync(qreportPath);
  console.log('  ✅ Q-Report data found');
  console.log(`  File: ${qreportPath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log('  ❌ Q-Report data not found');
  console.log(`  Expected: ${qreportPath}`);
  console.log('  Download Q-Report data from Harvard Q-Report website');
}

const catalogPath = path.join(__dirname, 'AY_2025_2026_courses.csv');
if (fs.existsSync(catalogPath)) {
  const stats = fs.statSync(catalogPath);
  console.log('  ✅ Course catalog found');
  console.log(`  File: ${catalogPath}`);
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.log('  ❌ Course catalog not found');
  console.log(`  Expected: ${catalogPath}`);
  console.log('  Run scrapers to download course catalog data');
}

// Check Server
console.log('\n🚀 Server:');
console.log(`  Port: ${config.server.port}`);
console.log(`  Base URL: ${config.server.baseUrl}`);

// Endpoints
console.log('\n🔗 Available Endpoints:');
console.log('  POST /webhook/gem-miner  - Georgie webhook endpoint');
console.log('  GET  /health             - Health check');

// Summary
console.log('\n' + '='.repeat(50));
const geminiOk = config.gemini.apiKey && !config.gemini.apiKey.includes('your_');
const a1zapOk = gemMinerConfig.apiKey && !gemMinerConfig.apiKey.includes('your_') && 
                gemMinerConfig.agentId && !gemMinerConfig.agentId.includes('your_');
const dataOk = fs.existsSync(qreportPath) && fs.existsSync(catalogPath);

console.log('\n📊 Summary:');
if (geminiOk && a1zapOk && dataOk) {
  console.log('  ✅ All configurations complete! Georgie is ready to go!\n');
} else {
  console.log('  ⚠️  Some configurations missing. Check above for details.\n');
  
  if (!geminiOk) console.log('  - Set GEMINI_API_KEY');
  if (!a1zapOk) console.log('  - Set GEM_MINER_API_KEY and GEM_MINER_AGENT_ID (or A1ZAP_API_KEY and A1ZAP_AGENT_ID)');
  if (!dataOk) console.log('  - Ensure Q-Report and course catalog data files exist');
  console.log();
}

console.log('📚 Documentation:');
console.log('   - Setup guide: README.md');
console.log('   - Data updates: See scrapers/README.md\n');
