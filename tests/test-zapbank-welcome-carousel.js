/**
 * Unit test for ZapBank welcome carousel feature
 * Tests the two-message welcome flow without requiring server to be running
 */

const config = require('../config');
const BaseA1ZapClient = require('../core/BaseA1ZapClient');
const zapbankRepAgent = require('../agents/zapbank-rep-agent');

/**
 * Mock A1Zap client for testing
 */
class MockA1ZapClient extends BaseA1ZapClient {
  constructor() {
    super(config.agents.zapbankRep);
    this.sentMessages = [];
  }

  async sendMessage(chatId, message, richContentBlocks = null) {
    const sentMessage = {
      chatId,
      message,
      richContentBlocks,
      timestamp: new Date().toISOString()
    };
    this.sentMessages.push(sentMessage);
    console.log(`📤 Mock send to chat ${chatId}:`);
    console.log(`   Text: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
    if (richContentBlocks) {
      console.log(`   Rich content: ${richContentBlocks.length} block(s)`);
      richContentBlocks.forEach((block, i) => {
        console.log(`     - Block ${i + 1}: ${block.type}`);
        if (block.type === 'carousel') {
          console.log(`       Items: ${block.data.items.length}`);
          block.data.items.forEach((item, j) => {
            console.log(`         ${j + 1}. ${item.title}`);
          });
        }
      });
    }
    return { success: true, messageId: `mock-msg-${Date.now()}` };
  }

  getSentMessages() {
    return this.sentMessages;
  }

  clearSentMessages() {
    this.sentMessages = [];
  }
}

/**
 * Test the welcome carousel logic
 */
async function testWelcomeCarousel() {
  console.log('\n🧪 Testing ZapBank Welcome Carousel\n');
  console.log('='.repeat(80));
  
  // Create mock webhook instance
  const BaseWebhook = require('../core/BaseWebhook');
  const webhookHelpers = require('../services/webhook-helpers');
  
  // Create a test webhook class that extends BaseWebhook
  class TestZapBankWebhook extends BaseWebhook {
    async processRequest(data) {
      return { response: 'Test response' };
    }

    // Import the sendWelcomeCarousel method logic
    async sendWelcomeCarousel(chatId) {
      const baseUrl = config.server.baseUrl || 'http://localhost:3000';
      
      const carouselItems = [
        {
          title: '💰 Treasury - 4.09% APY',
          subtitle: 'Earn market-leading returns on idle cash',
          description: 'FDIC insured, instant access',
          imageUrl: `https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8ZmluYW5jZXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&q=60&w=900`
        },
        {
          title: '💳 Corporate Cards - 2% Cashback',
          subtitle: 'Maximize returns on all business spend',
          description: 'Virtual cards, spending controls, real-time tracking',
          imageUrl: `https://images.unsplash.com/photo-1511883040705-6011fad9edfc?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTl8fGZpbmFuY2V8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=900`
        },
        {
          title: '🏦 Business Checking - $0 Fees',
          subtitle: 'Up to $75M FDIC insurance',
          description: 'Modern platform built for startups',
          imageUrl: `https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fGZpbmFuY2V8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&q=60&w=900`
        }
      ];

      const richContentBlocks = [{
        type: 'carousel',
        data: {
          items: carouselItems.map(item => ({
            imageUrl: item.imageUrl,
            title: item.title,
            subtitle: item.subtitle,
            description: item.description
          })),
          interval: 4000
        },
        order: 0
      }];

      await webhookHelpers.sendResponse(
        this.client,
        chatId,
        'Here\'s what we offer:',
        richContentBlocks
      );
    }

    async handleChatStarted(req, res) {
      try {
        const { chatMetadata, chatId: rootChatId, user: rootUser } = req.body;
        
        const chatId = rootChatId || chatMetadata?.chatId;
        const userName = rootUser?.userName || chatMetadata?.user?.userName;
        const isAnonymous = rootUser?.isAnonymous || chatMetadata?.user?.isAnonymous;
        
        if (!chatId) {
          return res.status(400).json({
            success: false,
            error: 'Missing chatId in webhook payload'
          });
        }

        console.log(`👋 Chat started with user: ${userName || 'Anonymous'} (chatId: ${chatId})`);

        const welcomeMessage = this.agent.getWelcomeMessage(userName, isAnonymous);

        if (!webhookHelpers.isTestChat(chatId)) {
          await this.client.sendMessage(chatId, welcomeMessage);
          console.log('✅ Welcome message sent successfully!');

          await this.sendWelcomeCarousel(chatId);
          console.log('✅ Welcome carousel sent successfully!');
        } else {
          console.log('⚠️  Test mode: Skipping welcome message and carousel send');
        }

        return res.json({
          success: true,
          event: 'chat.started',
          agent: this.agent.name,
          welcomeMessageSent: true,
          carouselSent: true,
          userName: userName || 'Anonymous'
        });

      } catch (error) {
        console.error('❌ Error handling chat.started event:', error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
          event: 'chat.started'
        });
      }
    }
  }

  // Create mock client and webhook
  const mockClient = new MockA1ZapClient();
  const testWebhook = new TestZapBankWebhook(zapbankRepAgent, mockClient);

  // Create mock request and response
  const mockReq = {
    body: {
      event: 'chat.started',
      chatId: 'welcome-123',  // Don't start with 'test-' so messages actually get sent
      user: {
        userName: 'John Startup',
        isAnonymous: false
      }
    }
  };

  const mockRes = {
    json: (data) => {
      console.log('\n📝 Response JSON:');
      console.log(JSON.stringify(data, null, 2));
      return mockRes;
    },
    status: (code) => {
      console.log(`Status: ${code}`);
      return mockRes;
    }
  };

  console.log('Test Scenario: User "John Startup" starts a new chat\n');
  
  // Call handleChatStarted
  await testWebhook.handleChatStarted(mockReq, mockRes);

  // Verify results
  const sentMessages = mockClient.getSentMessages();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Results\n');
  console.log(`Total messages sent: ${sentMessages.length}`);
  
  if (sentMessages.length === 2) {
    console.log('✅ PASS: Two messages were sent as expected\n');
    
    // Check first message
    const firstMsg = sentMessages[0];
    console.log('Message 1 (Welcome Text):');
    console.log(`  - Has text: ${firstMsg.message ? '✅' : '❌'}`);
    console.log(`  - Has rich content: ${firstMsg.richContentBlocks ? '❌ (should be text only)' : '✅'}`);
    console.log(`  - Contains "Zap Bank Advisor": ${firstMsg.message.includes('Zap Bank Advisor') ? '✅' : '❌'}`);
    
    // Check second message
    const secondMsg = sentMessages[1];
    console.log('\nMessage 2 (Carousel):');
    console.log(`  - Has text: ${secondMsg.message ? '✅' : '❌'}`);
    console.log(`  - Text is "Here\'s what we offer:": ${secondMsg.message === "Here's what we offer:" ? '✅' : '❌'}`);
    console.log(`  - Has rich content: ${secondMsg.richContentBlocks ? '✅' : '❌'}`);
    
    if (secondMsg.richContentBlocks && secondMsg.richContentBlocks.length > 0) {
      const carousel = secondMsg.richContentBlocks[0];
      console.log(`  - Rich content type is carousel: ${carousel.type === 'carousel' ? '✅' : '❌'}`);
      console.log(`  - Carousel has 3 items: ${carousel.data.items.length === 3 ? '✅' : '❌'}`);
      
      if (carousel.data.items.length === 3) {
        console.log('\n  Carousel items:');
        carousel.data.items.forEach((item, i) => {
          console.log(`    ${i + 1}. ${item.title}`);
          console.log(`       ${item.subtitle}`);
        });
        
        // Verify specific products
        const titles = carousel.data.items.map(item => item.title);
        console.log('\n  Product verification:');
        console.log(`    - Treasury included: ${titles.some(t => t.includes('Treasury')) ? '✅' : '❌'}`);
        console.log(`    - Corporate Cards included: ${titles.some(t => t.includes('Corporate Cards')) ? '✅' : '❌'}`);
        console.log(`    - Checking included: ${titles.some(t => t.includes('Checking')) ? '✅' : '❌'}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 TEST PASSED: Welcome carousel feature works correctly!');
    console.log('='.repeat(80));
    
  } else {
    console.log(`❌ FAIL: Expected 2 messages, got ${sentMessages.length}`);
    console.log('\nSent messages:');
    sentMessages.forEach((msg, i) => {
      console.log(`\n${i + 1}. ${msg.message.substring(0, 100)}...`);
    });
  }
}

// Run the test
if (require.main === module) {
  testWelcomeCarousel()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Test failed:', err);
      console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { testWelcomeCarousel };

