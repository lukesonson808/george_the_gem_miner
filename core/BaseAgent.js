/**
 * BaseAgent - Abstract base class for all AI agents
 * 
 * Provides common functionality and structure that all agents share:
 * - Agent metadata (name, role, description)
 * - System prompt management
 * - Generation options
 * - Model selection (Claude vs Gemini)
 * - Validation methods
 * 
 * Usage:
 *   class MyAgent extends BaseAgent {
 *     constructor() {
 *       super({
 *         name: 'My Agent',
 *         role: 'Assistant',
 *         model: 'claude',
 *         ...
 *       });
 *     }
 *     
 *     getSystemPrompt() {
 *       return `Your custom system prompt...`;
 *     }
 *   }
 */

class BaseAgent {
  /**
   * @param {Object} config - Agent configuration
   * @param {string} config.name - Agent display name
   * @param {string} config.role - Agent role/title
   * @param {string} config.description - Agent description
   * @param {string} config.model - AI model to use ('claude' or 'gemini')
   * @param {Object} config.generationOptions - Default generation options
   * @param {Object} config.metadata - Optional additional metadata
   */
  constructor(config) {
    if (new.target === BaseAgent) {
      throw new Error('BaseAgent is abstract and cannot be instantiated directly');
    }

    this.name = config.name;
    this.role = config.role;
    this.description = config.description;
    this.model = config.model || 'claude';
    this.generationOptions = config.generationOptions || {};
    this.metadata = config.metadata || {};

    // Validate required fields
    this.validate();
  }

  /**
   * Validate agent configuration
   * @throws {Error} If validation fails
   */
  validate() {
    if (!this.name) {
      throw new Error('Agent must have a name');
    }
    if (!this.role) {
      throw new Error('Agent must have a role');
    }
    if (!['claude', 'gemini'].includes(this.model)) {
      throw new Error(`Invalid model: ${this.model}. Must be 'claude' or 'gemini'`);
    }
  }

  /**
   * Get the system prompt for this agent
   * Must be implemented by subclasses
   * @returns {string} System prompt
   */
  getSystemPrompt() {
    throw new Error('getSystemPrompt() must be implemented by subclass');
  }

  /**
   * Get welcome message for chat.started event
   * Can be overridden by subclasses for custom welcome messages
   * @param {string} userName - User's name (if available)
   * @param {boolean} isAnonymous - Whether the user is anonymous
   * @returns {string} Welcome message
   */
  getWelcomeMessage(userName, isAnonymous) {
    // Create personalized greeting
    let greeting;
    if (userName && !isAnonymous) {
      const firstName = userName.split(' ')[0];
      greeting = `Hey ${firstName}! 👋`;
    } else {
      greeting = `Hey there! 👋`;
    }

    // Default welcome message (agents should override this)
    return `${greeting}

I'm ${this.name}, your ${this.role}.

${this.description}

How can I help you today?`;
  }

  /**
   * Get generation options for AI model
   * Can be overridden by subclasses
   * @returns {Object} Generation options
   */
  getGenerationOptions() {
    return this.generationOptions;
  }

  /**
   * Check if this agent uses Claude
   * @returns {boolean}
   */
  usesClaude() {
    return this.model === 'claude';
  }

  /**
   * Check if this agent uses Gemini
   * @returns {boolean}
   */
  usesGemini() {
    return this.model === 'gemini';
  }

  /**
   * Get agent info as a plain object
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      role: this.role,
      description: this.description,
      model: this.model,
      generationOptions: this.generationOptions,
      metadata: this.metadata
    };
  }

  /**
   * Get a human-readable string representation
   * @returns {string}
   */
  toString() {
    return `${this.name} (${this.role}) - Model: ${this.model}`;
  }
}

module.exports = BaseAgent;

