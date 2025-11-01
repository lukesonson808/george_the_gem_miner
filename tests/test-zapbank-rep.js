/**
 * Test script for Zap Bank Rep Agent
 * Tests basic conversation, product recommendations, and rich content
 */

const axios = require('axios');

// Configuration
const WEBHOOK_URL = process.env.ZAPBANK_REP_WEBHOOK_URL || 'http://localhost:3000/webhook/zapbank-rep';
const TEST_CHAT_ID = `test-zapbank-${Date.now()}`;

// Test messages to send
const testMessages = [
  {
    description: 'Basic greeting',
    message: 'Hi! Tell me about Zap Bank'
  },
  {
    description: 'Product inquiry - should trigger carousel',
    message: 'What products do you offer?'
  },
  {
    description: 'Treasury inquiry - should trigger product card',
    message: 'Tell me more about your Treasury account'
  },
  {
    description: 'High fees pain point',
    message: 'We are spending way too much on banking fees'
  },
  {
    description: 'Cash management question',
    message: 'We have about $500K sitting in our account earning nothing'
  },
  {
    description: 'Getting started - should trigger CTA buttons',
    message: 'How do I get started?'
  }
];

/**
 * Create a test webhook payload
 */
function createWebhookPayload(message) {
  return {
    event: 'message.received',
    timestamp: new Date().toISOString(),
    chat: {
      id: TEST_CHAT_ID,
      type: 'individual',
      participants: [{
        id: 'test-user-123',
        name: 'Test User',
        role: 'user'
      }]
    },
    message: {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: message,
      sender: {
        id: 'test-user-123',
        name: 'Test User'
      },
      timestamp: Date.now()
    }
  };
}

/**
 * Send a test message to the webhook
 */
async function sendTestMessage(message, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${description}`);
  console.log(`MESSAGE: "${message}"`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const payload = createWebhookPayload(message);
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log('✅ Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.response) {
      console.log('\n📝 Agent Response:');
      console.log('-'.repeat(80));
      console.log(response.data.response);
      console.log('-'.repeat(80));
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Test chat.started event (welcome message)
 */
async function testWelcomeMessage() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: Welcome Message (chat.started event)`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const payload = {
      event: 'chat.started',
      timestamp: new Date().toISOString(),
      chat: {
        id: `welcome-test-${Date.now()}`,
        type: 'individual',
        participants: [{
          id: 'test-user-456',
          name: 'John Startup',
          role: 'user'
        }]
      }
    };

    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Welcome message sent:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.response) {
      console.log('\n📝 Welcome Message:');
      console.log('-'.repeat(80));
      console.log(response.data.response);
      console.log('-'.repeat(80));
    }

    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🚀 Starting Zap Bank Rep Agent Tests');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test Chat ID: ${TEST_CHAT_ID}`);

  try {
    // Test 1: Welcome message
    console.log('\n📋 Test 1: Welcome Message');
    await testWelcomeMessage();
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2-7: Conversation tests
    for (let i = 0; i < testMessages.length; i++) {
      const test = testMessages[i];
      console.log(`\n📋 Test ${i + 2}: ${test.description}`);
      
      await sendTestMessage(test.message, test.description);
      
      // Wait between messages to avoid rate limiting
      if (i < testMessages.length - 1) {
        console.log('\n⏳ Waiting 3 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\nExpected Rich Content:');
    console.log('  - Test 3: Should receive product carousel');
    console.log('  - Test 4: Should receive Treasury product card');
    console.log('  - Test 7: Should receive CTA buttons\n');

  } catch (error) {
    console.error('\n\n' + '='.repeat(80));
    console.error('❌ TESTS FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTests().then(() => {
    console.log('\n👋 Test script completed');
    process.exit(0);
  }).catch(err => {
    console.error('\n💥 Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  sendTestMessage,
  testWelcomeMessage,
  runTests
};

