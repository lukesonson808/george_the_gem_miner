// Load environment variables
require('dotenv').config();

module.exports = {
  // AI Model Configurations
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'your_gemini_api_key_here',
    defaultModel: 'gemini-2.5-flash',
    temperature: 0.7,
    maxOutputTokens: 65565
  },

  // Agent-Specific A1Zap Configurations
  agents: {
    gemMiner: {
      apiKey: process.env.GEM_MINER_API_KEY || process.env.A1ZAP_API_KEY || 'your_gem_miner_api_key_here',
      agentId: process.env.GEM_MINER_AGENT_ID || process.env.A1ZAP_AGENT_ID || 'your_gem_miner_agent_id_here',
      apiUrl: process.env.GEM_MINER_API_URL || 'https://api.a1zap.com/v1/messages/individual',
      agentName: 'gem-miner'
    }
  },

  // Legacy compatibility (deprecated - use config.agents.gemMiner instead)
  a1zap: {
    apiKey: process.env.A1ZAP_API_KEY || 'your_a1zap_api_key_here',
    agentId: process.env.A1ZAP_AGENT_ID || 'your_agent_id_here',
    apiUrl: 'https://api.a1zap.com/v1/messages/individual'
  },
  ycPhotographer: {
    apiKey: process.env.YC_PHOTOGRAPHER_API_KEY || process.env.A1ZAP_API_KEY || 'your_yc_photographer_api_key_here',
    agentId: process.env.YC_PHOTOGRAPHER_AGENT_ID || process.env.A1ZAP_AGENT_ID || 'your_yc_photographer_agent_id_here',
    apiUrl: process.env.YC_PHOTOGRAPHER_API_URL || 'https://api.a1zap.com/v1/messages/individual'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },

  // Q-Report/Catalog configuration
  qreport: {
    mode: process.env.HUGEMS_MODE || 'live',
    hugemsUrl: process.env.HUGEMS_URL || 'https://hugems.net/',
    catalogCsvPath: process.env.CATALOG_CSV_PATH || process.env.COURSE_CSV_PATH || './AY_2025_2026_courses.csv'
  },

  // Helper functions for validation
  validation: {
    /**
     * Check if a value is a placeholder (not properly configured)
     */
    isPlaceholder(value) {
      if (!value) return true;
      const placeholders = [
        'your_',
        'YOUR_',
        'undefined',
        'null',
        ''
      ];
      return placeholders.some(p => String(value).startsWith(p));
    },

    /**
     * Validate agent configuration
     */
    validateAgent(agentName, agentConfig) {
      const warnings = [];
      const errors = [];

      if (this.isPlaceholder(agentConfig.apiKey)) {
        errors.push(`❌ ${agentName}: API Key is not configured (using placeholder value)`);
      }

      if (this.isPlaceholder(agentConfig.agentId)) {
        errors.push(`❌ ${agentName}: Agent ID is not configured (using placeholder value)`);
      }

      return { warnings, errors };
    },

    /**
     * Validate AI service configuration
     */
    validateAIService(serviceName, serviceConfig) {
      const warnings = [];
      const errors = [];

      if (this.isPlaceholder(serviceConfig.apiKey)) {
        warnings.push(`⚠️  ${serviceName}: API Key is not configured (using placeholder value)`);
      }

      return { warnings, errors };
    }
  }
};
