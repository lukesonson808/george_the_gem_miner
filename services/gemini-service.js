const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  /**
   * Generate text response using Gemini
   * @param {string} prompt - User prompt
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateText(prompt, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: options.model || config.gemini.defaultModel
      });

      const generationConfig = {
        temperature: options.temperature || config.gemini.temperature,
        maxOutputTokens: options.maxOutputTokens || config.gemini.maxOutputTokens,
        topP: options.topP || 0.95,
        topK: options.topK || 40
      };

      // Build chat history if provided
      const chat = model.startChat({
        generationConfig,
        history: options.history || []
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini text generation error:', error);
      throw error;
    }
  }

  /**
   * Analyze image and generate response
   * @param {string} imageUrl - URL of the image
   * @param {string} prompt - Text prompt for analysis
   * @param {Object} options - Generation options
   * @returns {Promise<string>} Generated response
   */
  async analyzeImage(imageUrl, prompt, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: options.model || 'gemini-2.0-flash-exp'
      });

      const generationConfig = {
        temperature: options.temperature || config.gemini.temperature,
        maxOutputTokens: options.maxOutputTokens || config.gemini.maxOutputTokens
      };

      // Fetch image data
      const axios = require('axios');
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const imageData = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

      // Generate content with image
      const result = await model.generateContent([
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType
          }
        },
        prompt
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini image analysis error:', error);
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
      const model = this.genAI.getGenerativeModel({
        model: options.model || config.gemini.defaultModel,
        systemInstruction: options.systemInstruction
      });

      const generationConfig = {
        temperature: options.temperature || config.gemini.temperature,
        maxOutputTokens: options.maxOutputTokens || config.gemini.maxOutputTokens,
        topP: options.topP || 0.95,
        topK: options.topK || 40
      };

      // Convert messages to Gemini format
      let history = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Gemini requires chat history to start with a user message
      // Remove any leading model messages
      while (history.length > 0 && history[0].role === 'model') {
        console.log('⚠️  Removing leading model message from history (Gemini requires user message first)');
        history.shift();
      }

      const chat = model.startChat({
        generationConfig,
        history
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.content);
      const response = await result.response;
      return response.text();
    } catch (error) {
      // Normalize API key errors for upstream handling
      const message = String(error?.message || '');
      const details = error?.errorDetails || [];
      const reason = Array.isArray(details) && details.find(d => d?.reason)?.reason;
      if (message.includes('API key expired') || message.includes('API key invalid') || reason === 'API_KEY_INVALID') {
        const apiKeyError = new Error('Gemini API key is invalid or expired. Please renew GEMINI_API_KEY.');
        apiKeyError.code = 'GEMINI_API_KEY_INVALID';
        throw apiKeyError;
      }
      console.error('Gemini chat error:', error);
      throw error;
    }
  }

  /**
   * Generate or edit an image using Gemini's image generation capabilities
   * @param {string|null} imageUrl - URL of the image to edit (null for text-to-image generation)
   * @param {string} prompt - Text prompt describing the desired changes or image
   * @param {Object} options - Generation options
   * @param {string|null} options.referenceImageUrl - Optional reference image URL for style/composition guidance
   * @returns {Promise<{text: string|null, imageData: string|null, mimeType: string|null}>} Generated response with text and/or image
   */
  async generateEditedImage(imageUrl, prompt, options = {}) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: options.model || 'gemini-2.5-flash-image'
      });

      const generationConfig = {
        temperature: options.temperature || config.gemini.temperature,
        maxOutputTokens: options.maxOutputTokens || config.gemini.maxOutputTokens,
        topP: options.topP || 0.95
      };

      const axios = require('axios');
      let parts = [];

      // If reference image provided, add it FIRST for style/composition guidance
      if (options.referenceImageUrl) {
        console.log(`🎨 Loading reference image: ${options.referenceImageUrl}`);
        try {
          const refImageResponse = await axios.get(options.referenceImageUrl, {
            responseType: 'arraybuffer'
          });

          const refImageData = Buffer.from(refImageResponse.data).toString('base64');
          const refMimeType = refImageResponse.headers['content-type'] || 'image/jpeg';

          parts.push({
            inlineData: {
              data: refImageData,
              mimeType: refMimeType
            }
          });
          console.log(`✅ Reference image loaded successfully`);
        } catch (refError) {
          console.warn(`⚠️  Failed to load reference image, continuing without it:`, refError.message);
          // Continue without reference image rather than failing entirely
        }
      }

      // If user image URL provided, fetch and add to request (for image editing)
      if (imageUrl) {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer'
        });

        const imageData = Buffer.from(imageResponse.data).toString('base64');
        const mimeType = imageResponse.headers['content-type'] || 'image/jpeg';

        parts.push({
          inlineData: {
            data: imageData,
            mimeType: mimeType
          }
        });
      }

      // Add text prompt
      parts.push({ text: prompt });

      // Debug logging
      console.log(`\n🔍 Gemini Input Summary:`);
      console.log(`   Total parts: ${parts.length}`);
      parts.forEach((part, idx) => {
        if (part.inlineData) {
          console.log(`   Part ${idx + 1}: Image (${part.inlineData.mimeType}, ${part.inlineData.data.length} chars)`);
        } else if (part.text) {
          console.log(`   Part ${idx + 1}: Text (${part.text.substring(0, 100)}...)`);
        }
      });
      console.log('');

      // Generate content
      const result = await model.generateContent({
        contents: [{ parts }],
        generationConfig
      });

      const response = await result.response;
      
      // Extract text and image from response
      let textResponse = null;
      let imageData = null;
      let imageMimeType = null;

      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textResponse = part.text;
        } else if (part.inlineData) {
          imageData = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || 'image/png';
        }
      }

      return {
        text: textResponse,
        imageData: imageData,
        mimeType: imageMimeType
      };
    } catch (error) {
      console.error('Gemini image generation error:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
