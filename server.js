/**
 * Steve the Schedule Helper - Server
 * 
 * Harvard's Q-Report Course Advisor Agent
 * 
 * Architecture:
 * - BaseAgent: Abstract agent class
 * - BaseWebhook: Abstract webhook handler
 * - BaseA1ZapClient: Unified messaging client
 * - AgentRegistry: Central agent management
 */

// Load configuration
const config = require('./config');
const express = require('express');
const bodyParser = require('body-parser');

// Core architecture
const AgentRegistry = require('./core/AgentRegistry');

// Steve the Schedule Helper agent configuration
const gemMinerAgent = require('./agents/gem-miner-agent');
const gemMinerWebhookHandler = require('./webhooks/gem-miner-webhook');

// Initialize agent registry
const agentRegistry = new AgentRegistry();
agentRegistry.register('gem-miner', gemMinerAgent, gemMinerWebhookHandler);

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    config: {
      hasGeminiApiKey: !!config.gemini.apiKey && !config.gemini.apiKey.includes('your_'),
      hasClaudeApiKey: !!config.claude.apiKey && !config.claude.apiKey.includes('your_'),
      hasA1ZapApiKey: !!config.agents.gemMiner.apiKey && !config.agents.gemMiner.apiKey.includes('your_')
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Steve the Schedule Helper',
    version: '1.0.0',
    description: "Harvard's Q-Report Course Advisor Agent",
    agents: agentRegistry.listAgents(),
    endpoints: {
      health: 'GET /health',
      gemMiner: 'POST /webhook/gem-miner'
    }
  });
});

// Gem Miner webhook endpoint
app.post('/webhook/gem-miner', gemMinerWebhookHandler);
// Keep old endpoint for backwards compatibility  
app.post('/webhook/yc-photographer', gemMinerWebhookHandler);

// Validate configuration before starting server
console.log('\n🔍 Validating configuration...\n');

// Validate AI services
const geminiValidation = config.validation.validateAIService('Gemini', config.gemini);
const claudeValidation = config.validation.validateAIService('Claude', config.claude);

// Validate gem-miner agent
const gemMinerValidation = config.validation.validateAgent('gem-miner', config.agents.gemMiner);

// Collect all errors and warnings
let allErrors = [...geminiValidation.errors, ...claudeValidation.errors, ...gemMinerValidation.errors];
let allWarnings = [...geminiValidation.warnings, ...claudeValidation.warnings, ...gemMinerValidation.warnings];

// Display warnings
if (allWarnings.length > 0) {
  console.log('⚠️  Configuration Warnings:');
  allWarnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}

// Display errors
if (allErrors.length > 0) {
  console.log('❌ Configuration Errors:');
  allErrors.forEach(e => console.log(`  ${e}`));
  console.log('');
  console.log('💡 To fix these errors:');
  console.log('  1. Create a .env file in the project root');
  console.log('  2. Add the required API keys and agent IDs');
  console.log('  3. See README.md for setup instructions\n');
  console.log('⚠️  The server will start, but Steve may not work!\n');
}

// Start server
const PORT = config.server.port;
// Bind to 0.0.0.0 in production/Railway, localhost for local dev
const HOST = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Steve the Schedule Helper running on http://${HOST}:${PORT}`);
  console.log(`   Version: 1.0.0`);
  
  // Print agent registry summary
  agentRegistry.printSummary();
  
  console.log(`Webhook Endpoints:`);
  console.log(`  POST /webhook/gem-miner     - Steve the Schedule Helper`);
  console.log(`  GET  /health                - Health check\n`);
  console.log(`Configuration:`);
  console.log(`  Gemini API: ${config.gemini.apiKey.includes('your_') ? '❌ Not configured' : '✅ Configured'}`);
  console.log(`  Claude API: ${config.claude.apiKey.includes('your_') ? '❌ Not configured' : '✅ Configured'}`);
  console.log(`  A1Zap API: ${config.agents.gemMiner.apiKey.includes('your_') ? '❌ Not configured' : '✅ Configured'}\n`);
});

// Error handling
server.on('error', (error) => {
  console.error(`❌ Server error:`, error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📴 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
