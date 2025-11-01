/**
 * AgentRegistry - Central registry for all AI agents
 * 
 * Provides a single source of truth for agent management:
 * - Register agents
 * - Lookup agents by ID or name
 * - Validate all required agents exist
 * - List all available agents
 * 
 * Usage:
 *   const registry = new AgentRegistry();
 *   
 *   // Register agents
 *   registry.register('claude-docubot', claudeAgent, claudeWebhook);
 *   registry.register('brandoneats', brandonEatsAgent, brandonEatsWebhook);
 *   
 *   // Lookup
 *   const agent = registry.getAgent('claude-docubot');
 *   const webhook = registry.getWebhook('brandoneats');
 *   
 *   // List all
 *   const all = registry.listAgents();
 */

class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.webhooks = new Map();
  }

  /**
   * Register an agent and its webhook handler
   * @param {string} id - Unique agent identifier (e.g., 'claude-docubot')
   * @param {BaseAgent} agent - Agent configuration instance
   * @param {BaseWebhook} webhook - Webhook handler instance
   */
  register(id, agent, webhook) {
    if (!id) {
      throw new Error('Agent ID is required');
    }
    if (!agent) {
      throw new Error('Agent instance is required');
    }
    if (!webhook) {
      throw new Error('Webhook instance is required');
    }

    if (this.agents.has(id)) {
      console.warn(`⚠️  Agent '${id}' is already registered. Overwriting...`);
    }

    this.agents.set(id, agent);
    this.webhooks.set(id, webhook);
    
    console.log(`✅ Registered agent: ${id} (${agent.name})`);
  }

  /**
   * Get an agent by ID
   * @param {string} id - Agent ID
   * @returns {BaseAgent|null} Agent instance or null if not found
   */
  getAgent(id) {
    return this.agents.get(id) || null;
  }

  /**
   * Get a webhook handler by agent ID
   * @param {string} id - Agent ID
   * @returns {BaseWebhook|null} Webhook instance or null if not found
   */
  getWebhook(id) {
    return this.webhooks.get(id) || null;
  }

  /**
   * Check if an agent is registered
   * @param {string} id - Agent ID
   * @returns {boolean}
   */
  has(id) {
    return this.agents.has(id);
  }

  /**
   * List all registered agent IDs
   * @returns {Array<string>} Array of agent IDs
   */
  listAgentIds() {
    return Array.from(this.agents.keys());
  }

  /**
   * List all registered agents with details
   * @returns {Array<Object>} Array of agent info objects
   */
  listAgents() {
    const result = [];
    for (const [id, agent] of this.agents.entries()) {
      result.push({
        id,
        name: agent.name,
        role: agent.role,
        description: agent.description,
        model: agent.model
      });
    }
    return result;
  }

  /**
   * Get the total number of registered agents
   * @returns {number}
   */
  count() {
    return this.agents.size;
  }

  /**
   * Validate that all required agents are registered
   * @param {Array<string>} requiredIds - Array of required agent IDs
   * @throws {Error} If any required agents are missing
   */
  validateRequired(requiredIds) {
    const missing = [];
    for (const id of requiredIds) {
      if (!this.has(id)) {
        missing.push(id);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing required agents: ${missing.join(', ')}`);
    }
  }

  /**
   * Clear all registered agents (useful for testing)
   */
  clear() {
    this.agents.clear();
    this.webhooks.clear();
    console.log('🧹 Agent registry cleared');
  }

  /**
   * Get registry info as a string
   * @returns {string}
   */
  toString() {
    return `AgentRegistry(${this.count()} agents: ${this.listAgentIds().join(', ')})`;
  }

  /**
   * Print a summary of all registered agents
   */
  printSummary() {
    console.log('\n📋 Agent Registry Summary:');
    console.log(`   Total agents: ${this.count()}`);
    console.log('\n   Registered agents:');
    for (const info of this.listAgents()) {
      console.log(`   - ${info.id}: ${info.name} (${info.model})`);
      console.log(`     ${info.role}`);
    }
    console.log('');
  }
}

module.exports = AgentRegistry;

