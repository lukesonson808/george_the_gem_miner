const BaseWebhook = require('../core/BaseWebhook');
const BaseA1ZapClient = require('../core/BaseA1ZapClient');
const geminiService = require('../services/gemini-service');
const claudeService = require('../services/claude-service');
const gemMinerAgent = require('../agents/gem-miner-agent');
const webhookHelpers = require('../services/webhook-helpers');
const conversationCache = require('../services/conversation-cache');
const config = require('../config');
const { findGems, getAllAvailableCourses, getCourseDetails } = require('../services/gem-miner');
const { mapDepartment } = require('../services/department-mapper');
const { getGenEdCategory } = require('../services/gened-categories');

/**
 * Steve the Schedule Helper webhook handler (text-first ranking)
 * Returns ranked course recommendations with GemScore and reasons
 * 
 * Key Features:
 * - Multi-turn conversation support
 * - Image context tracking (from current message, history, or cache)
 * - Two modes: IMAGE mode (generate edited image) and TEXT mode (conversational)
 * - Automatic style detection (YC sign or orange background)
 * - Automatic image storage and delivery
 */
class GemMinerWebhook extends BaseWebhook {
  constructor() {
    // Create A1Zap client for this agent
    const client = new BaseA1ZapClient(config.agents.gemMiner);
    
    // Initialize base webhook
    super(gemMinerAgent, client);
  }
  
  /**
   * Get reference image URL for a given style
   * @param {string} style - 'sign' or 'orange'
   * @returns {string|null} Public URL of reference image or null if not found
   */
  getReferenceImageUrl(style) {
    if (!this.referenceImagesEnabled) {
      return null;
    }
    
    // Map style to filename
    const referenceFiles = {
      'sign': 'yc-sign-reference.jpg',
      'orange': 'yc-orange-reference.jpg'
    };
    
    const filename = referenceFiles[style];
    if (!filename) {
      return null;
    }
    
    // Check if file exists
    const filePath = path.join(this.referenceImagesDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Reference image not found: ${filePath}`);
      return null;
    }
    
    // Generate public URL
    const baseUrl = config.server.baseUrl || `http://localhost:${config.server.port}`;
    return `${baseUrl}/reference-images/${filename}`;
  }
  
  /**
   * Send reference image for the detected style
   * @param {string} chatId - Chat ID
   * @param {string} style - 'sign' or 'orange'
   * @returns {Promise<void>}
   */
  async sendReferenceImage(chatId, style) {
    const referenceUrl = this.getReferenceImageUrl(style);
    
    if (!referenceUrl) {
      console.log(`⚠️  No reference image available for style: ${style}`);
      return;
    }
    
    const styleNames = {
      'sign': 'YC Sign Entrance',
      'orange': 'YC Orange Background'
    };
    
    const message = `📸 Here's what the ${styleNames[style]} looks like! I'll place you in this setting.`;
    
    console.log(`📤 Sending reference image: ${style} (${referenceUrl})`);
    
    try {
      await this.client.sendMediaMessage(
        chatId,
        message,
        referenceUrl,
        { contentType: 'image/jpeg' }
      );
      console.log('✅ Reference image sent successfully');
    } catch (error) {
      console.error('❌ Failed to send reference image:', error.message);
      // Don't throw - reference image is optional
    }
  }

  /**
   * Should include images in conversation history
   * @override
   */
  shouldIncludeImagesInHistory() { return false; }

  /**
   * Get history limit for YC photographer conversations (needs more context)
   * @override
   */
  getHistoryLimit() { return 20; }

  /**
   * Process YC Photographer request
   * @param {Object} data - Request data with conversation history
   * @returns {Promise<Object>} Result with response text and optional image
   */
  async processRequest(data) {
    const { userMessage, conversation, chatId } = data;

    // Cache incoming content FIRST (before trying to fetch history)
    if (userMessage && userMessage !== '[Image]') {
      conversationCache.storeRequest(chatId, userMessage);
    }
    return await this.processTextMode(userMessage, conversation, chatId);
  }

  /**
   * Find the effective image URL from various sources
   * @param {string|null} currentImageUrl - Image from current message
   * @param {Array} conversation - Conversation history
   * @param {string} chatId - Chat ID
   * @returns {Object} { effectiveImageUrl, imageSource }
   */
  findEffectiveImage(currentImageUrl, conversation, chatId) {
    let effectiveImageUrl = currentImageUrl;
    let imageSource = currentImageUrl ? 'current_message' : null;

    if (!effectiveImageUrl) {
      // Try history first
      effectiveImageUrl = webhookHelpers.findRecentImage(conversation, 5);
      if (effectiveImageUrl) {
        imageSource = 'history';
        console.log(`📸 Using recent image from history`);
      }
    }

    if (!effectiveImageUrl) {
      // Fall back to cache if history didn't help
      effectiveImageUrl = conversationCache.getRecentImage(chatId, 5);
      if (effectiveImageUrl) {
        imageSource = 'cache';
        console.log(`📸 Using recent image from cache (history unavailable)`);
      }
    }

    return { effectiveImageUrl, imageSource };
  }

  /**
   * Find previous YC photo request from history or cache
   * @param {Array} conversation - Conversation history
   * @param {string} chatId - Chat ID
   * @returns {string|null} Previous request or null
   */
  findPreviousRequest(conversation, chatId) {
    // Extract YC photo-related requests from conversation
    let previousRequest = null;
    
    if (conversation.length > 0) {
      const recentMessages = conversation.slice(-10);
      const ycRequests = recentMessages
        .filter(msg => msg.role === 'user' && msg.content && msg.content.trim() !== '[Image]')
        .map(msg => msg.content.trim())
        .filter(content => {
          const lowerContent = content.toLowerCase();
          return lowerContent.includes('yc') || 
                 lowerContent.includes('combinator') || 
                 lowerContent.includes('sign') || 
                 lowerContent.includes('orange') || 
                 lowerContent.includes('background') ||
                 content.length > 15;
        });
      
      if (ycRequests.length > 0) {
        previousRequest = ycRequests[ycRequests.length - 1];
      }
    }

    if (!previousRequest) {
      // Fall back to cache if history didn't provide context
      previousRequest = conversationCache.getRecentRequest(chatId, 5);
      if (previousRequest) {
        console.log(`📸 Using previous request from cache (history unavailable)`);
      }
    }

    return previousRequest;
  }

  /**
   * Process IMAGE mode - generate edited image with YC setting
   * @param {string} effectiveImageUrl - Image URL to edit
   * @param {string} userMessage - User's message
   * @param {string|null} currentImageUrl - Image from current message (if any)
   * @param {Array} conversation - Conversation history
   * @param {string|null} previousRequest - Previous YC photo request
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Result with image URL
   */
  async processImageMode(effectiveImageUrl, userMessage, currentImageUrl, conversation, previousRequest, chatId) {
    console.log('Image available - generating YC photo with Gemini...');

    const isFirstMessage = conversation.length === 0;

    // Detect style for reference image
    let detectedStyle;
    if (!currentImageUrl && effectiveImageUrl && previousRequest) {
      detectedStyle = this.agent.detectStyle(previousRequest);
    } else {
      detectedStyle = this.agent.detectStyle(userMessage || previousRequest || '');
    }
    
    // Get reference image URL for AI generation (if enabled)
    let referenceImageUrl = null;
    if (this.referenceImagesEnabled) {
      console.log(`🎨 Detected style: ${detectedStyle}`);
      referenceImageUrl = this.getReferenceImageUrl(detectedStyle);
      
      if (referenceImageUrl) {
        console.log(`🎨 Will use reference image in AI generation: ${referenceImageUrl}`);
        
        // Send reference image to user first (if enabled and not test mode)
        if (this.sendReferenceToUser && !webhookHelpers.isTestChat(chatId)) {
          console.log(`📤 Sending reference image to user as preview`);
          await this.sendReferenceImage(chatId, detectedStyle);
          
          // Small delay to ensure reference image is sent first
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (!this.sendReferenceToUser) {
          console.log(`⏭️  Skipping sending reference to user (YC_SEND_REFERENCE_TO_USER=false)`);
        }
      }
    }
    
    // Build prompt with context awareness
    // Include reference image context if using one
    const willUseReferenceImage = !!referenceImageUrl;
    let prompt;
    
    if (!currentImageUrl && effectiveImageUrl && previousRequest) {
      // User is referring to a previous image and previous style
      prompt = `${this.agent.getStylePrompt(detectedStyle, willUseReferenceImage)}\n\nKeep your response brief and enthusiastic.`;
      console.log('📝 Using previous YC style as context (no new image)');
    } else {
      // Build initial prompt
      const basePrompt = this.agent.buildPrompt(userMessage, conversation, isFirstMessage);
      
      // If using reference image, replace the style prompt section with reference-aware version
      if (willUseReferenceImage) {
        const stylePrompt = this.agent.getStylePrompt(detectedStyle, willUseReferenceImage);
        prompt = stylePrompt + '\n\nKeep your text response brief and enthusiastic - describe what you\'ve done in 1-2 sentences.';
      } else {
        prompt = basePrompt;
      }
    }

    console.log('Generated prompt for image editing:');
    console.log('---');
    console.log(prompt);
    console.log('---');

    // Generate edited image using Gemini (with optional reference image)
    const generationOptions = {
      ...this.agent.getGenerationOptions(),
      referenceImageUrl: referenceImageUrl // Pass reference image to AI
    };

    const result = await geminiService.generateEditedImage(
      effectiveImageUrl,
      prompt,
      generationOptions
    );

    console.log('Generated response:', {
      hasText: !!result.text,
      hasImage: !!result.imageData,
      imageSize: result.imageData ? `${result.imageData.length} chars` : 'N/A'
    });

    // Prepare response text
    let responseText = result.text || "📸 Here's your YC photo! Looking great!";

    // If image was generated, save it and send as media message
    if (result.imageData) {
      try {
        // Save base64 image to disk
        const filename = await imageStorage.saveBase64Image(
          result.imageData,
          result.mimeType,
          'yc-photographer'
        );

        // Generate public URL
        const baseUrl = config.server.baseUrl || `http://localhost:${config.server.port}`;
        const imagePublicUrl = imageStorage.generatePublicUrl(filename, baseUrl);

        console.log(`📸 Image saved and available at: ${imagePublicUrl}`);

        // Cache the bot's response for future reference
        conversationCache.storeResponse(chatId, responseText);

        // Get image dimensions for proper display in WhatsApp
        const dimensions = imageStorage.getImageDimensions(filename);
        if (dimensions) {
          console.log(`📐 Image dimensions: ${dimensions.width}x${dimensions.height}`);
        }

        // Send text + image to A1Zap
        console.log(`Preparing to send image message...`);
        console.log(`  Chat ID: ${chatId}`);
        console.log(`  Test mode: ${webhookHelpers.isTestChat(chatId)}`);
        console.log(`  Image URL: ${imagePublicUrl}`);

        if (!webhookHelpers.isTestChat(chatId)) {
          console.log('🚀 Sending media message to A1Zap API...');

          // Build options with dimensions for proper A1Zap image handling
          const mediaOptions = {
            contentType: result.mimeType || 'image/png'
          };

          if (dimensions) {
            mediaOptions.width = dimensions.width;
            mediaOptions.height = dimensions.height;
          }

          await this.client.sendMediaMessage(
            chatId,
            responseText,
            imagePublicUrl,
            mediaOptions
          );
          console.log('✅ Media message sent successfully');
        } else {
          console.log('⚠️  Test mode: Skipping A1Zap send');
        }

        // Return success with image info
        return {
          response: responseText,
          imageUrl: imagePublicUrl
        };

      } catch (imageError) {
        console.error('❌ Error saving/sending image:', imageError);

        // Fall back to text-only response
        responseText += '\n\n(Note: There was an issue processing the generated image)';

        return {
          response: responseText,
          warning: 'Image generation succeeded but image delivery failed'
        };
      }
    } else {
      // No image generated in result - send text-only response
      console.log('⚠️  No image generated in API response');

      return {
        response: responseText
      };
    }
  }

  /**
   * Process TEXT mode - conversational response without image
   * @param {string} userMessage - User's message
   * @param {Array} conversation - Conversation history
   * @param {string} chatId - Chat ID for fallback to cache
   * @returns {Promise<Object>} Result with response text
   */
  async processTextMode(userMessage, conversation, chatId) {
    console.log('⛏️ Steve: Processing conversation...');

    // Build message history for Gemini chat
    let messages = conversation.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // If conversation is empty (history API failed), use cache as fallback
    if (messages.length === 0) {
      console.log('⚠️  No conversation history from API - using cache fallback');
      const cachedContext = conversationCache.getChatContext(chatId);
      
      // Reconstruct conversation from cache with proper interleaving of requests and responses
      if (cachedContext.requests.length > 0 || cachedContext.responses.length > 0) {
        const messageCount = Math.max(cachedContext.requests.length, cachedContext.responses.length);
        console.log(`📝 Rebuilding conversation from cache: ${cachedContext.requests.length} requests, ${cachedContext.responses.length} responses`);
        
        // Interleave user requests and bot responses
        for (let i = 0; i < messageCount; i++) {
          // Add user request
          if (i < cachedContext.requests.length) {
            messages.push({
              role: 'user',
              content: cachedContext.requests[i].text
            });
          }
          
          // Add bot response (if available)
          if (i < cachedContext.responses.length) {
            messages.push({
              role: 'assistant',
              content: cachedContext.responses[i].text
            });
          }
        }
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Detect if user is asking for gem recommendations (heuristic check)
    const needsGemData = this.shouldFetchGems(userMessage);
    
    let gemContext = '';
    if (needsGemData) {
      console.log('💎 User wants gems - fetching data...');
      const query = this.extractQuery(userMessage);
      
      // 🚨 QUANTITY DETECTION - How many courses does the user want?
      const userMessageLower = userMessage.toLowerCase();
      let maxResults = 10; // Default to 10
      
      // 🚨 QUERY TYPE DETECTION - Are they asking ABOUT a course or asking FOR a course?
      // Check for course code patterns (e.g., "CS 50", "CS50", "COMPSCI 50")
      const courseCodePattern = /\b([A-Z]{2,}\s*\d+[A-Z]?|CS\s*\d+|CS\d+)\b/i;
      const hasCourseCode = courseCodePattern.test(userMessage);
      
      // ONLY treat as "asking about" if they're asking for info on a SPECIFIC named course
      // OR if they mention a course code with questions like "what time", "when does", etc.
      const isAskingAboutSpecificCourse = userMessageLower.match(/\b(tell me (about|more about)|more (info|information) (about|on)|describe|explain)\b/) ||
                                          (userMessageLower.match(/\b(what (is|time|are)|what's|when (does|is))\b/) && !userMessageLower.match(/\b(easiest|best|hardest|most|least|good|bad|chill|easy|hard)\b/)) ||
                                          (hasCourseCode && (userMessageLower.includes('what time') || userMessageLower.includes('when does') || userMessageLower.includes('when is') || userMessageLower.includes('meet')));
      console.log(`📝 Query type: ${isAskingAboutSpecificCourse ? 'ASKING ABOUT a course' : 'ASKING FOR a recommendation'}`);
      if (hasCourseCode) console.log(`📝 Course code detected in query`);
      
      // Check for list requests FIRST (before "a" catches "a list")
      if (userMessageLower.match(/\b(list|several|many|multiple)\b/)) {
        maxResults = 10;
        console.log('🎯 User wants a list (up to 10 courses)');
      }
      // Check for explicit numbers
      else if (userMessageLower.match(/\b(\d+)\s+(classes|courses|gems)\b/)) {
        const match = userMessageLower.match(/\b(\d+)\s+(classes|courses|gems)\b/);
        maxResults = parseInt(match[1], 10);
        console.log(`🎯 User wants ${maxResults} courses`);
      }
      // Check for small quantity requests
      else if (userMessageLower.match(/\b(few|some|couple)\b/) ||
               userMessageLower.match(/\b(2|3|two|three)\s+(classes|courses|gems)\b/)) {
        maxResults = 3;
        console.log('🎯 User wants 3-5 courses');
      }
      // Check for singular requests LAST (so "a list" doesn't match here)
      // BUT: "a [subject] class/course" (e.g., "a chill GenEd") likely wants options, not just 1
      else if (userMessageLower.match(/\b(one|1)\s+(class|course|gem)\b/)) {
        maxResults = 1;
        console.log('🎯 User wants EXACTLY 1 course');
      }
      // "a class" or "a course" without adjectives = 1 course
      else if (userMessageLower.match(/\b(a|an)\s+(class|course|gem)$/)) {
        maxResults = 1;
        console.log('🎯 User wants EXACTLY 1 course');
      }
      // "a [adjective] [subject]" (e.g., "a chill GenEd", "an easy CS class") = give them options (3-5)
      else if (userMessageLower.match(/\b(a|an)\s+\w+\s+(class|course|gem|gened)\b/)) {
        maxResults = 5;
        console.log('🎯 User wants options for their criteria (5 courses)');
      }
      
      // STEP 1: Get ALL available courses from catalog (ground truth) - SPRING 2026 ONLY
      const catalogCourses = await getAllAvailableCourses({
        term: '2026 Spring', // ONLY Spring 2026
        subject: query.filters?.department,
        weekdays: query.preferredTimes?.find(t => ['tue', 'thu', 'mon', 'wed', 'fri'].includes(t)),
        courseCode: query.filters?.courseCode // Include course code if specified
      });
      console.log(`📚 Found ${catalogCourses.length} Spring 2026 courses in catalog matching criteria`);
      
      // STEP 2: Get Q-Report data (ratings/gems)
      const ranked = await findGems(query);
      
      // STEP 3: Filter to only courses with actual Q-Report data AND in Spring 2026 catalog
      const spring2026CourseIds = new Set(catalogCourses.map(c => c.courseId.toUpperCase()));
      
      const gemsWithData = ranked.filter(c => {
        const hasData = c._hasQReportData === true;
        const hasRating = c.rating != null && c.rating > 0;
        const hasWorkload = c.workloadHrs != null && c.workloadHrs > 0;
        const hasGemScore = c.GemScore != null && c.GemScore > 0;
        const inSpring2026 = spring2026CourseIds.has(c.courseId.toUpperCase());
        return hasData && hasRating && hasWorkload && hasGemScore && inSpring2026;
      });
      
      console.log(`💎 Found ${ranked.length} courses total, ${gemsWithData.length} with complete Q-Report data in Spring 2026`);
      
      // If asking about a specific course and we have a course code, look it up in the catalog
      let specificCourseFromCatalog = null;
      if (isAskingAboutSpecificCourse && query.filters?.courseCode) {
        console.log(`🔍 Looking up specific course in catalog: ${query.filters.courseCode}`);
        specificCourseFromCatalog = getCourseDetails(query.filters.courseCode);
        if (specificCourseFromCatalog) {
          console.log(`✅ Found course in catalog: ${specificCourseFromCatalog.courseId}`);
        } else {
          // Try with different variations (e.g., "COMPSCI 50" vs "CS 50")
          const codeVariations = [
            query.filters.courseCode.replace('COMPSCI', 'CS'),
            query.filters.courseCode.replace('CS', 'COMPSCI')
          ];
          for (const variation of codeVariations) {
            specificCourseFromCatalog = getCourseDetails(variation);
            if (specificCourseFromCatalog) {
              console.log(`✅ Found course with variation: ${variation}`);
              break;
            }
          }
        }
      }
      
      if (gemsWithData.length > 0 || specificCourseFromCatalog) {
        // Build gem data as context for Gemini - limit to user's requested quantity
        let top = gemsWithData.slice(0, maxResults); // Use detected quantity
        
        // If we found a specific course in catalog but not in gems, add it to the list
        if (specificCourseFromCatalog && !top.find(c => c.courseId === specificCourseFromCatalog.courseId)) {
          console.log(`➕ Adding specific course from catalog to context`);
          // Get GenEd category if it's a GenEd
          const isGenEd = specificCourseFromCatalog.subject && specificCourseFromCatalog.subject.toUpperCase() === 'GENED';
          const genEdCat = isGenEd ? getGenEdCategory(specificCourseFromCatalog.courseId) : null;
          
          // Convert catalog entry to gem-like format for consistency
          const catalogAsGem = {
            courseId: specificCourseFromCatalog.courseId,
            title: specificCourseFromCatalog.title,
            rating: null, // No Q-Report data
            workloadHrs: null,
            weekdays: specificCourseFromCatalog.weekdays,
            startTime: specificCourseFromCatalog.startTime,
            endTime: specificCourseFromCatalog.endTime,
            meetingTime: specificCourseFromCatalog.meetingTime || (specificCourseFromCatalog.weekdays && specificCourseFromCatalog.startTime && specificCourseFromCatalog.endTime 
              ? `${specificCourseFromCatalog.weekdays} ${specificCourseFromCatalog.startTime}-${specificCourseFromCatalog.endTime}`
              : null),
            instructors: specificCourseFromCatalog.instructors,
            description: specificCourseFromCatalog.description,
            qreportLink: null,
            _hasQReportData: false,
            _fromCatalogOnly: true,
            subject: specificCourseFromCatalog.subject,
            genEdCategory: genEdCat
          };
          // Put it at the front if asking about a specific course
          if (isAskingAboutSpecificCourse) {
            top = [catalogAsGem, ...top];
          } else {
            top.push(catalogAsGem);
          }
        }
        
        console.log(`📊 Providing ${top.length} courses to AI (user requested ${maxResults})`)
        const usingDefaults = top.some(c => c._usingDefaults);
        
        gemContext = `\n\n[AVAILABLE COURSE DATA - Use this to answer the user's question about classes]:\n`;
        if (specificCourseFromCatalog && !gemsWithData.find(c => c.courseId === specificCourseFromCatalog.courseId)) {
          gemContext += `⚠️ Note: Course found in catalog but may not have Q-Report data\n\n`;
        } else if (usingDefaults) {
          gemContext += `⚠️ Note: Using default ratings (Q-Report data not fully available)\n\n`;
        } else {
          gemContext += `✅ Real Q-Report data from Spring 2025\n\n`;
        }
        
        // Validate Q-Report links before including them
        const qreportLinks = top
          .map(c => c.qreportLink)
          .filter(link => link && link.trim());
        
        let validatedLinks = new Map();
        if (qreportLinks.length > 0) {
          console.log(`🔗 Validating ${qreportLinks.length} Q-Report links...`);
          try {
            validatedLinks = await linkValidator.validateQReportLinks(qreportLinks);
            const validCount = Array.from(validatedLinks.values()).filter(v => v).length;
            console.log(`✅ Link validation complete: ${validCount}/${qreportLinks.length} valid`);
          } catch (error) {
            console.error('⚠️  Link validation error (continuing anyway):', error.message);
            // If validation fails, assume all links are valid to avoid blocking the response
            qreportLinks.forEach(link => validatedLinks.set(link, true));
          }
        }
        
        top.forEach((c, i) => {
          // Strip section numbers (001, 002, etc.) from title display
          const cleanTitle = c.title.replace(/\s+00\d+\s*$/i, '').replace(/\s+\d{3}\s*$/i, '').trim();
          
          // Check if it's a GenEd and format title with category
          const isGenEd = c.subject && c.subject.toUpperCase() === 'GENED';
          let titleLine = `${i+1}. ${cleanTitle} (${c.courseId})`;
          
          if (isGenEd) {
            titleLine += ' 🎓';
            if (c.genEdCategory) {
              titleLine += ` - satisfies **${c.genEdCategory}**`;
            }
          }
          
          gemContext += `${titleLine}\n`;
          
          // Show Q-Report data if available, otherwise note it's catalog-only
          if (c._fromCatalogOnly) {
            gemContext += `   ⚠️ This course is in the catalog but doesn't have Q-Report data yet\n`;
          }
          // DO NOT show GemScore in context - it's used for ranking only
          if (c.rating) gemContext += `   Rating: ${c.rating}/5\n`;
          else if (c._fromCatalogOnly) {
            gemContext += `   Rating: N/A (no Q-Report data yet)\n`;
          }
          if (c.workloadHrs) gemContext += `   Workload: ${c.workloadHrs} hrs/week\n`;
          else if (c._fromCatalogOnly) {
            gemContext += `   Workload: N/A (no Q-Report data yet)\n`;
          }
          
          // Format meeting times from weekdays + start/end time
          // Prioritize the separate fields as they're more accurate from catalog
          if (c.weekdays && c.startTime && c.endTime) {
            gemContext += `   Meets: ${c.weekdays} ${c.startTime}-${c.endTime}\n`;
          } else if (c.meetingTime) {
            gemContext += `   Meets: ${c.meetingTime}\n`;
          } else {
            gemContext += `   Meets: N/A\n`;
          }
          
          // Note: GenEd category is already shown in title line above
          if (c.instructors) gemContext += `   Instructor: ${c.instructors}\n`;
          if (c.finalExam === false || c.finalExam === 'no') gemContext += `   No final exam!\n`;
          
          // Add Q-Report link only if validated and not truncated
          if (c.qreportLink) {
            const fullLink = c.qreportLink.trim();
            const isValid = validatedLinks.get(fullLink);
            
            // Check if link is truncated or malformed
            // A valid Q-Report URL should end with something like "&regl=en-US" or "&ReportType=2"
            const isTruncated = fullLink.length < 100 || 
                                fullLink.includes('...') || 
                                fullLink.includes('[') ||
                                (fullLink.includes('SelectedIDforPrint=') && fullLink.endsWith('SelectedIDforPrint=')); // Truly incomplete
            
            if (isTruncated) {
              console.log(`❌ Skipping truncated Q-Report link for ${c.courseId}: ${fullLink.substring(0, 50)}...`);
              gemContext += `   Q-Report Link: N/A (link incomplete)\n`;
            } else if (isValid === false) {
              console.log(`❌ Skipping invalid Q-Report link for ${c.courseId}`);
              gemContext += `   Q-Report Link: N/A (link invalid)\n`;
            } else {
              // Link is valid and complete
              gemContext += `   Q-Report Link: ${fullLink}\n`;
              gemContext += `   ⚠️ IMPORTANT: Copy this ENTIRE link. Do NOT truncate it!\n`;
            }
          }
          
          // Add description ONLY when user specifically asks ABOUT a course (not when asking FOR recommendations)
          if (c.description && isAskingAboutSpecificCourse) {
            // Full description when user asks "tell me about X" or "what is X"
            const desc = c.description.substring(0, 500);
            gemContext += `   Description: ${desc}${c.description.length > 500 ? '...' : ''}\n`;
            gemContext += `   ⚠️ ALWAYS include this description when responding since user asked about this course!\n`;
          } else if (c.description) {
            // For all other queries (recommendations, lists), include description but tell AI NOT to show it
            const desc = c.description.substring(0, 150);
            gemContext += `   Description (DO NOT show in response - only use if user asks for more details): ${desc}...\n`;
          }
          
          gemContext += '\n';
        });
        
        // Add catalog course list for VALIDATION ONLY (prevent hallucination)
        if (catalogCourses.length > 0) {
          gemContext += `\n\n==========================================\n`;
          gemContext += `📚 COURSE CATALOG - FOR VALIDATION ONLY (${catalogCourses.length} total courses)\n`;
          gemContext += `==========================================\n\n`;
          gemContext += `⚠️ THIS LIST IS FOR REFERENCE ONLY - Use it to verify courses exist, but DO NOT recommend courses from here.\n`;
          gemContext += `Most of these courses DON'T have Q-Report data and are NOT gems!\n\n`;
          gemContext += `Sample of available courses:\n`;
          
          // Show a sample of catalog courses (up to 20)
          const sampleCatalog = catalogCourses.slice(0, 20);
          sampleCatalog.forEach((c, i) => {
            gemContext += `${i + 1}. ${c.courseId} - ${c.title}\n`;
            if (c.meetingParsed && c.meetingParsed.weekdays) {
              gemContext += `   Meets: ${c.meetingParsed.weekdays} ${c.meetingParsed.startTime}-${c.meetingParsed.endTime}\n`;
            } else if (c.meeting) {
              gemContext += `   Meeting: ${c.meeting}\n`;
            }
          });
          
          if (catalogCourses.length > 20) {
            gemContext += `\n... and ${catalogCourses.length - 20} more courses (most WITHOUT Q-Report data).\n`;
          }
        }
        
        gemContext += `

==========================================
🚨 YOUR ROLE AND SCOPE 🚨
==========================================

**YOU ARE A GENERAL COURSE ADVISOR:**
- You help with ALL Harvard course questions, not just gems
- If they ask about a specific course (gem or not), provide info from your data
- If they ask for "easy classes" or "gems", focus on the GEM DATA LIST
- If they ask for "a class" in a subject, help them find ONE class
- **For GenEd questions**: You know which GenEd category each course satisfies (Aesthetics and Culture, Ethics and Civics, Histories/Societies/Individuals, Science and Technology in Society)
- **When recommending GenEds**: Always mention which category requirement they fulfill
- **If they ask for a specific GenEd category** (e.g., "show me Aesthetics GenEds"), only show courses from that category
- Always ask clarifying questions when requests are vague

==========================================
🚨 CRITICAL ANTI-HALLUCINATION RULES 🚨
==========================================

⛔ WHEN USER ASKS ABOUT A SPECIFIC COURSE (like "what time does CS50 meet"):
   ✅ USE THE COURSE DATA FROM THE LIST ABOVE (even if it doesn't have Q-Report data)
   ✅ PROVIDE meeting times, instructors, descriptions from the data provided
   ✅ If a course is marked as "catalog-only" (no Q-Report data), you can still answer questions about it!
   ✅ SAY: "I found this course in the catalog but it doesn't have Q-Report ratings yet" if applicable

⛔ WHEN USER ASKS FOR RECOMMENDATIONS (like "show me easy classes"):
   ⛔ YOU CAN **ONLY** RECOMMEND COURSES FROM THE **GEM DATA LIST** (the first ${top.length} courses at the top)
   ⛔ DO **NOT** RECOMMEND COURSES FROM THE CATALOG LIST - those are for reference only!
   ⛔ EVERY course you recommend for gems MUST have: GemScore, Rating, Workload, Q-Report link

⛔ ALWAYS:
⛔ DO NOT MAKE UP COURSE CODES, TITLES, OR MEETING TIMES.
⛔ IF YOU DON'T KNOW SOMETHING, SAY "I don't have that information" or "N/A"
⛔ IF A LINK IS BROKEN/MISSING, SHOW "N/A" INSTEAD

The catalog list is for reference - you can use it to answer questions about specific courses, but don't recommend from it unless they have Q-Report data!

==========================================
🚨 UNDERSTAND QUANTITY 🚨
==========================================

**PAY ATTENTION TO HOW MANY COURSES THEY WANT:**
- "a class" or "one class" = Provide EXACTLY ONE course (DO NOT provide more!)
- "some classes" or "a few" = Provide 3-5 courses
- "list of classes" = Provide 5-10 courses
- Read their exact words carefully!
- **🚨 I've limited the list above to ${top.length} courses based on their request 🚨**
- **DO NOT recommend more courses than what's in the list above!**
- **🚨 DO NOT say "that's the only one I have" unless you're showing ALL available courses!**
  - If you're showing ${top.length} courses but there are more available, DON'T say it's the only one
  - Just show what's in the list above and offer to show more if they want

🚨 WHEN TO SAY "NO PERFECT MATCHES" 🚨

ONLY use this message if the courses you're showing DON'T actually match what the user asked for:
- Example: User wants "Tuesday 10am" but all courses meet Wednesday
- Example: User wants "Chemistry" but all courses are Biology

DO NOT say "no perfect matches" if:
- ✅ The courses DO match their request (right department, right time, etc.)
- ✅ You're showing courses with ratings and workload data
- ✅ The only thing missing is a Q-Report LINK (the DATA is still valid!)

If truly no match exists, say:
"I don't have any gems that perfectly match [their specific criteria], but here are the highest-rated easiest classes I found that are close."

==========================================
📋 FORMATTING INSTRUCTIONS (CRITICAL!)
==========================================

YOU MUST format each class EXACTLY like this example (with proper indentation and line breaks):

**1. Astrosociology (ASTRON 5)** 🎓 - satisfies **Aesthetics and Culture**
   ⭐ **Rating:** 4.93/5.0
   💪 **Workload:** 2.79 hrs/week
   🕐 **Meets:** Tue/Thu 09:00 AM - 10:15 AM
   👤 **Instructor:** John Smith
   📊 **[Q-Report](https://harvard.bluera.com/harvard/rpv-eng.aspx?...)**

**2. Introduction to Psychology (PSYCH 1)**
   ⭐ **Rating:** 4.5/5.0
   💪 **Workload:** 4.2 hrs/week
   🕐 **Meets:** Mon/Wed/Fri 10:00 AM - 11:00 AM
   👤 **Instructor:** Jane Doe
   📊 **[Q-Report](https://harvard.bluera.com/...)**
   
   (Note: This example is NOT a GenEd, so no 🎓 or category)

**3. Advanced Calculus (MATH 25A)**
   ⭐ **Rating:** 4.2/5.0
   💪 **Workload:** 10.5 hrs/week
   🕐 **Meets:** Mon/Wed/Fri 10:00 AM - 11:00 AM
   👤 **Instructor:** Bob Johnson
   📊 **[Q-Report](https://harvard.bluera.com/...)**
   
   (Example of a non-GenEd course)

CRITICAL FORMATTING RULES:
✅ Each field MUST be on its OWN LINE
✅ Each field MUST have 3-space indentation
✅ Use **bold** for ALL labels (Rating:, Workload:, etc.)
✅ Q-Report MUST use markdown link: **[Q-Report](URL)** NOT plain text
✅ Add 🎓 emoji after course title ONLY if it's a GenEd
✅ **For GenEd courses, ALWAYS include the category in the title line**: "Course Title (GENED 1034) 🎓 - satisfies **Aesthetics and Culture**"
✅ Add BLANK LINE after each course
❌ DO NOT show GemScore in the output
❌ DO NOT add "💎 Excellent gem!" or quality notes after courses
❌ DO NOT show section numbers (001, 002, 003) in course titles
❌ DO NOT put everything on one line!
❌ DO NOT use plain text URLs!
❌ DO NOT show "About this course:" or descriptions when listing multiple courses
❌ ONLY show course descriptions when user asks about a SPECIFIC course

==========================================
🚨🚨🚨 ABSOLUTELY FORBIDDEN GREETING 🚨🚨🚨
==========================================

**NEVER EVER START WITH:**
"Hey there! 👋 Steve here, ready to help you find some gems! 💎"
"Hey there! 👋 Steve here..."

This is **COMPLETELY BANNED**. Start IMMEDIATELY with helping, NO introduction!

==========================================
⛔ ABSOLUTE PROHIBITIONS ⛔
==========================================

1. ❌ DO NOT show courses with "Not Available" for Rating or Workload
2. ❌ DO NOT show courses without complete data (all fields must have real values)
3. ❌ DO NOT recommend any course not in the Spring 2026 catalog
4. ❌ DO NOT recommend courses not in the GEM DATA LIST above
5. ❌ DO NOT show GemScore in your output (it's for ranking only)
6. ❌ DO NOT add quality notes like "💎 Excellent gem!" after courses
7. ❌ DO NOT show section numbers (001, 002, 003) in course titles
8. ❌ ONLY mark courses as GenEd 🎓 if subject = "GENED" (NOT ASTRON, OEB, HIST, etc.)
9. ❌ DO NOT invent or modify course names
10. ❌ DO NOT make up meeting times — use EXACTLY what's provided
11. ❌ DO NOT truncate Q-Report links — they are 150-300 characters and must be copied in full
12. ❌ EVERY course you recommend MUST have: Rating, Workload, Q-Report link, and be in Spring 2026

==========================================
💬 ASKING CLARIFYING QUESTIONS
==========================================

If the user's request is vague (e.g., "Give me a list of 5 gems"), ASK QUESTIONS FIRST:
- "What days/times work best for you?"
- "Looking for any specific GenEds to knock out?"
- "What department or subject interests you?"
- "Morning classes or afternoon classes?"

Don't just dump a generic list - get their preferences to find better matches!

==========================================
🚨 CRITICAL: "NO PERFECT MATCHES" RULE 🚨
==========================================

**ONLY say "I don't have any perfect matches" if:**
- User asked for specific days/times (e.g., "Tuesday 10am") AND none of the courses meet at that time
- User asked for a specific department AND you're showing courses from other departments

**DO NOT say "no perfect matches" if:**
- User asked for "GenEd" and you're showing GENED courses (they ARE perfect matches!)
- User asked for "easy classes" and you're showing gems (they ARE perfect matches!)
- The courses you're showing match what the user asked for

**Example:**
- User: "give me a gened"
- You're showing: GENED 1192, GENED 1197, GENED 1189 (all have 🎓)
- These ARE perfect matches! Don't say they're not!
- Correct response: "Here are some great GenEd gems for you! 💎"

==========================================
✅ IF NO PERFECT MATCH (RARELY APPLIES)
==========================================

**ONLY use this message if user specified criteria that NONE of the courses meet:**
- Example: User wants "Tuesday 10am classes" but all your courses are Wednesday
- Example: User wants "Chemistry" but all your courses are from other departments

**DO NOT use this message if:**
- User wants "GenEd" and you're showing GENED courses (they match!)
- User wants "easy classes" and you're showing gems (they match!)

If truly no match, you MUST:
1. Acknowledge: "I don't have any gems that meet exactly [their specific criteria]"
2. Explain why: "because [reason - e.g., 'they all meet at different times']"
3. Offer alternatives: "But here are the highest-rated easiest classes I found:"

**🚨 FLEXIBLE GEM RECOMMENDATIONS:**
- GemScore is a ranking tool, NOT a filter
- If there aren't any "perfect gems" (90+ GemScore), still suggest the best available courses
- Use phrases like:
  - "There aren't any perfect gems that match exactly, but here are some great easy courses:"
  - "I don't have any super easy gems, but here are some solid options:"
  - "These courses are pretty manageable even if they're not perfect gems:"
- NEVER refuse to show courses just because they don't meet a numerical cutoff
- Always be helpful and provide options, even if they're not "perfect" gems

REMEMBER: ONLY USE COURSES FROM THE LIST ABOVE. HALLUCINATION = FAILURE.`;
      } else {
        // No courses with Q-Report data found
        gemContext = `\n\n==========================================
🚨 NO GEMS FOUND 🚨
==========================================

There are ${catalogCourses.length} courses in the catalog matching the search criteria, but NONE of them have Q-Report data (ratings, workload, student feedback).

**WHY NO Q-REPORT DATA?**
Q-Report data is from Spring 2025. Courses without data are likely:
1. NEW courses being offered for the first time in 2025-2026
2. Courses that weren't offered in Spring 2025
3. Small seminars, independent studies, or thesis courses
4. Courses with too few student responses

A "gem" is a class that is:
✅ Highly rated by students (from Q-Reports)
✅ Has manageable workload
✅ Has actual student feedback and data

Since there are NO courses with Q-Report data matching the user's criteria, you MUST respond:

"I don't have any gems with Q-Report data for ${query.preferredTimes?.join('/') || 'those criteria'} right now. 😔

To be a 'gem,' I need real student ratings and workload data from Q-Reports (Spring 2026). The courses matching your search likely don't have data because they're:
• New courses being offered for the first time 🆕
• Courses that weren't offered last semester
• Small seminars or independent studies

Would you like to:
• Try different days/times?
• Search a different department?
• Or I can tell you about courses that exist (even without gem ratings)?"

⛔ DO NOT list courses without ratings/workload data as "gems"
⛔ DO NOT show "Not Available" for GemScore, Rating, or Workload
⛔ A course without Q-Report data is NOT a gem, BUT you can still mention it exists and explain why it doesn't have data yet`;
      }
    }

    // Add gem context to the last message if we fetched data
    if (gemContext) {
      messages[messages.length - 1].content += gemContext;
    }

    // Use Claude or Gemini based on agent configuration
    const useClaude = this.agent.usesClaude();
    const systemPrompt = this.agent.getSystemPrompt();
    const genOptions = this.agent.getGenerationOptions();
    
    console.log(`🤖 Generating Steve response with ${useClaude ? 'Claude' : 'Gemini'}...`);
    
    const responseText = useClaude
      ? await claudeService.chat(messages, {
          systemPrompt: systemPrompt,
          temperature: genOptions.temperature || 0.3,
          maxTokens: genOptions.maxTokens || 8192,
          model: genOptions.model || config.claude.defaultModel
        })
      : await geminiService.chat(messages, {
          systemInstruction: systemPrompt,
          temperature: genOptions.temperature || 0.3,
          maxOutputTokens: genOptions.maxOutputTokens || 800,
          model: genOptions.model || 'gemini-2.0-flash-exp'
        });

    console.log('✅ Steve responded:', responseText.substring(0, 100) + '...');

    // Cache the bot's response for future reference
    conversationCache.storeResponse(chatId, responseText);

    return {
      response: responseText,
      mode: 'text-conversation'
    };
  }
  
  /**
   * Determine if user is asking for gem/class recommendations or course information
   */
  shouldFetchGems(userMessage) {
    const text = (userMessage || '').toLowerCase();
    
    // Keywords that indicate user wants class recommendations
    const gemKeywords = [
      'show', 'find', 'recommend', 'suggest', 'gems', 'classes', 'courses',
      'easy', 'chill', 'light', 'low workload', 'good rating', 'top',
      'best', 'list', 'options', 'what are', 'give me', 'looking for'
    ];
    
    // Keywords that indicate user is asking about a specific course
    const courseInfoKeywords = [
      'what time', 'when does', 'when is', 'tell me about', 'what is',
      'describe', 'explain', 'course', 'class', 'meet', 'meeting time',
      'meets', 'schedule', 'instructor', 'professor', 'rating', 'workload'
    ];
    
    // Check for course code patterns (e.g., "CS 50", "CS50", "COMPSCI 50")
    const courseCodePattern = /\b([A-Z]{2,}\s*\d+[A-Z]?|CS\s*\d+|CS\d+)\b/i;
    const hasCourseCode = courseCodePattern.test(userMessage);
    
    // Fetch data if asking for recommendations OR asking about a specific course
    return gemKeywords.some(keyword => text.includes(keyword)) ||
           (courseInfoKeywords.some(keyword => text.includes(keyword)) && hasCourseCode) ||
           hasCourseCode; // Always fetch if a course code is mentioned
  }

  extractQuery(userMessage = '') {
    const text = (userMessage || '').toLowerCase();
    const query = { filters: {} };
    
    // GenEd detection - CRITICAL: GenEds have subject = "GENED"
    // Also detect specific GenEd category requests with SMART MATCHING
    if (text.includes('gened') || text.includes('gen ed') || text.includes('general education')) {
      query.filters.department = 'GENED';
      query.filters.isGenEd = true;
      console.log('🎓 GenEd request detected - filtering for subject = GENED');
      
      // Smart category matching - check for partial matches
      const lowerText = text.toLowerCase();
      
      // Aesthetics and Culture - match: aesthetics, culture, arts, artistic
      if (lowerText.includes('aesthetics') || lowerText.includes('culture') || 
          (lowerText.includes('art') && !lowerText.includes('mart'))) {
        query.filters.genEdCategory = 'Aesthetics and Culture';
        console.log('🎨 Aesthetics and Culture category detected');
      } 
      // Ethics and Civics - match: ethics, civics, moral, political, justice
      else if (lowerText.includes('ethics') || lowerText.includes('civics') || 
               lowerText.includes('moral') || (lowerText.includes('political') && !lowerText.includes('apolitical')) ||
               lowerText.includes('justice')) {
        query.filters.genEdCategory = 'Ethics and Civics';
        console.log('⚖️ Ethics and Civics category detected');
      } 
      // Histories, Societies, Individuals - match: histories, history, societies, society, individuals, social (but not "social science" which is different)
      else if (lowerText.includes('histories') || lowerText.includes('history') || 
               lowerText.includes('societies') || (lowerText.includes('society') && !lowerText.includes('science and technology')) ||
               lowerText.includes('individuals') || (lowerText.includes('social') && !lowerText.includes('science'))) {
        query.filters.genEdCategory = 'Histories, Societies, Individuals';
        console.log('📚 Histories, Societies, Individuals category detected');
      } 
      // Science and Technology in Society - match: science (with tech/society context), technology, tech, sci, stis
      else if ((lowerText.includes('science') && (lowerText.includes('technology') || lowerText.includes('society') || lowerText.includes('tech'))) ||
               (lowerText.includes('technology') && lowerText.includes('society')) ||
               lowerText.includes('stis') || (lowerText.includes('tech') && lowerText.includes('gened'))) {
        query.filters.genEdCategory = 'Science and Technology in Society';
        console.log('🔬 Science and Technology in Society category detected');
      }
    }
    
    // Smart department matching using the mapper (skip if GenEd already set)
    if (!query.filters.department) {
      const deptMatch = text.match(/\b(cs|computer science|comp sci|compsci|econ|economics|gov|government|political science|poli sci|hist|history|math|mathematics|stat|stats|statistics|eng|english|bio|biology|chem|chemistry|phys|physics|psy|psych|psychology|anthro|anthropology|soc|sociology|phil|philosophy|neuro|neuroscience|data science|ling|linguistics)\b/i);
      if (deptMatch) {
        const mapped = mapDepartment(deptMatch[1]);
        if (mapped.department) {
          query.filters.department = mapped.department;
        } else if (mapped.titleSearch) {
          query.filters.titleSearch = mapped.titleSearch;
        }
      }
    }
    
    // Extract course code from query (e.g., "CS50", "CS 50", "COMPSCI 50")
    // This helps filter to the specific course when asking about it
    const courseCodeMatch = text.match(/\b(?:([A-Z]{2,})\s*)?(\d+[A-Z]?)\b/i);
    if (courseCodeMatch) {
      const [, deptCode, courseNum] = courseCodeMatch;
      // If it's "CS50" or "CS 50", map to COMPSCI
      if ((deptCode === 'CS' || deptCode === undefined) && courseNum) {
        query.filters.courseCode = `COMPSCI ${courseNum}`;
        if (!query.filters.department) {
          query.filters.department = 'COMPSCI';
        }
      } else if (deptCode && courseNum) {
        query.filters.courseCode = `${deptCode} ${courseNum}`;
      }
      console.log(`📝 Extracted course code: ${query.filters.courseCode}`);
    }
    
    // hrs/week heuristic
    const hrs = text.match(/<=\s*(\d+)\s*hrs?\/wk|<=\s*(\d+)\s*hours?|under\s+(\d+)\s+hours?/);
    if (hrs) query.filters.maxHrsPerWeek = Number(hrs[1] || hrs[2] || hrs[3]);
    
    // no final heuristic
    if (text.includes('no final')) query.filters.noFinal = true;
    
    // preferred times heuristic
    const times = [];
    if (text.includes('morning')) times.push('am');
    if (text.includes('afternoon')) times.push('pm');
    if (text.includes('evening') || text.includes('night')) times.push('pm');
    if (text.includes('tu/th') || text.includes('tuth') || text.includes('tue') || text.includes('thu')) {
      times.push('tue');
      times.push('thu');
    }
    if (text.includes('mon') || text.includes('monday')) times.push('mon');
    if (text.includes('wed') || text.includes('wednesday')) times.push('wed');
    if (text.includes('fri') || text.includes('friday')) times.push('fri');
    if (times.length) query.preferredTimes = Array.from(new Set(times));
    
    return query;
  }

  /**
   * Override sendResponse to handle image messages specially
   * @override
   */
  async sendResponse(chatId, result) {
    // If result has an imageUrl, the image was already sent in processImageMode
    if (result.imageUrl) {
      console.log('✅ Media message already sent in processImageMode');
      return;
    }

    // Otherwise, use base class implementation for text response
    await super.sendResponse(chatId, result);
  }
}

// Create and export singleton webhook handler
const gemMinerWebhook = new GemMinerWebhook();
module.exports = gemMinerWebhook.createHandler();

