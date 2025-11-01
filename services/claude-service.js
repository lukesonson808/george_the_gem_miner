const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

class ClaudeService {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: config.claude.apiKey
    });
  }

  /**
   * Generate text response using Claude
   * @param {string} prompt - User prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generate(prompt, options = {}) {
    try {
      const response = await this.anthropic.messages.create({
        model: options.model || config.claude.defaultModel,
        max_tokens: options.maxTokens || config.claude.maxTokens,
        temperature: options.temperature ?? config.claude.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        system: options.systemPrompt
      });

      // Extract text from response
      const textContent = response.content.find(item => item.type === 'text');
      return textContent ? textContent.text : '';
    } catch (error) {
      // Normalize API key errors for upstream handling
      if (error.message && (error.message.includes('API key') || error.message.includes('authentication'))) {
        const apiKeyError = new Error('Claude API key is invalid or expired. Please renew CLAUDE_API_KEY.');
        apiKeyError.code = 'CLAUDE_API_KEY_INVALID';
        throw apiKeyError;
      }
      console.error('Claude generation error:', error);
      throw error;
    }
  }

  /**
   * Generate response with conversation history
   * @param {Array} messages - Message history [{role, content}]
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async chat(messages, options = {}) {
    try {
      // Convert messages to Claude format
      const claudeMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await this.anthropic.messages.create({
        model: options.model || config.claude.defaultModel,
        max_tokens: options.maxTokens || config.claude.maxTokens,
        temperature: options.temperature ?? config.claude.temperature,
        messages: claudeMessages,
        system: options.systemInstruction || options.systemPrompt
      });

      // Extract text from response
      const textContent = response.content.find(item => item.type === 'text');
      return textContent ? textContent.text : '';
    } catch (error) {
      // Normalize API key errors for upstream handling
      if (error.message && (error.message.includes('API key') || error.message.includes('authentication'))) {
        const apiKeyError = new Error('Claude API key is invalid or expired. Please renew CLAUDE_API_KEY.');
        apiKeyError.code = 'CLAUDE_API_KEY_INVALID';
        throw apiKeyError;
      }
      console.error('Claude chat error:', error);
      throw error;
    }
  }

  /**
   * Analyze an image with text prompt
   * @param {string} imageUrl - URL of the image to analyze
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Analysis result
   */
  async analyzeImage(imageUrl, prompt, options = {}) {
    try {
      // Fetch image data
      const axios = require('axios');
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      const imageBase64 = Buffer.from(imageResponse.data).toString('base64');
      const imageMimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      const response = await this.anthropic.messages.create({
        model: options.model || config.claude.defaultModel,
        max_tokens: options.maxTokens || config.claude.maxTokens,
        temperature: options.temperature ?? config.claude.temperature,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMimeType,
                  data: imageBase64
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ],
        system: options.systemPrompt
      });

      const textContent = response.content.find(item => item.type === 'text');
      return textContent ? textContent.text : '';
    } catch (error) {
      if (error.message && (error.message.includes('API key') || error.message.includes('authentication'))) {
        const apiKeyError = new Error('Claude API key is invalid or expired. Please renew CLAUDE_API_KEY.');
        apiKeyError.code = 'CLAUDE_API_KEY_INVALID';
        throw apiKeyError;
      }
      console.error('Claude image analysis error:', error);
      throw error;
    }
  }
}

module.exports = new ClaudeService();

