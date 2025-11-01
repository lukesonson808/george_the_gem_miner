/**
 * Test script for chat.started event handler
 * 
 * This script simulates the chat.started event webhook to test welcome messages
 * for all agents without actually sending to A1Zap.
 */

const brandonEatsWebhook = require('../webhooks/brandoneats-webhook');
const claudeWebhook = require('../webhooks/claude-webhook');
const makeupArtistWebhook = require('../webhooks/makeup-artist-webhook');
const ycPhotographerWebhook = require('../webhooks/yc-photographer-webhook');

/**
 * Create a mock request/response for testing
 */
function createMockReqRes(webhookPayload) {
  const req = {
    body: webhookPayload
  };

  const res = {
    json: function(data) {
      console.log('📤 Response:', JSON.stringify(data, null, 2));
      return this;
    },
    status: function(code) {
      console.log(`📊 Status: ${code}`);
      return this;
    }
  };

  return { req, res };
}

/**
 * Test chat.started event for a specific webhook
 */
async function testChatStarted(webhookName, webhookHandler, userName = null, isAnonymous = false) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 Testing ${webhookName} - chat.started event`);
  console.log('='.repeat(80));

  // Create webhook payload (using newer structure with root-level fields)
  const payload = {
    event: 'chat.started',
    chatId: 'test-chat-' + Date.now(),
    user: {
      userName: userName,
      isAnonymous: isAnonymous
    }
  };

  console.log('\n📥 Webhook Payload:');
  console.log(JSON.stringify(payload, null, 2));

  const { req, res } = createMockReqRes(payload);

  try {
    await webhookHandler(req, res);
    console.log(`\n✅ ${webhookName} test completed successfully!\n`);
  } catch (error) {
    console.error(`\n❌ ${webhookName} test failed:`, error.message);
    console.error('Stack:', error.stack);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting chat.started event tests for all agents...\n');

  // Test 1: Brandon Eats with named user
  await testChatStarted('Brandon Eats', brandonEatsWebhook, 'John Smith', false);

  // Test 2: Claude DocuBot with anonymous user
  await testChatStarted('Claude DocuBot', claudeWebhook, null, true);

  // Test 3: Makeup Artist with named user
  await testChatStarted('Makeup Artist', makeupArtistWebhook, 'Sarah Johnson', false);

  // Test 4: YC Photographer with anonymous user
  await testChatStarted('YC Photographer', ycPhotographerWebhook, null, true);

  // Test 5: Brandon Eats with legacy payload structure (chatMetadata)
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Testing Brandon Eats - chat.started event (Legacy Payload)');
  console.log('='.repeat(80));

  const legacyPayload = {
    event: 'chat.started',
    chatMetadata: {
      chatId: 'test-chat-legacy-' + Date.now(),
      user: {
        userName: 'Legacy User',
        isAnonymous: false
      }
    }
  };

  console.log('\n📥 Webhook Payload (Legacy):');
  console.log(JSON.stringify(legacyPayload, null, 2));

  const { req: legacyReq, res: legacyRes } = createMockReqRes(legacyPayload);

  try {
    await brandonEatsWebhook(legacyReq, legacyRes);
    console.log('\n✅ Legacy payload test completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Legacy payload test failed:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 All tests completed!');
  console.log('='.repeat(80));
  console.log('\n📝 Note: These tests run in TEST MODE (chatId starts with "test-")');
  console.log('   so no actual messages are sent to A1Zap.');
  console.log('\n💡 To test with real A1Zap delivery:');
  console.log('   1. Use ngrok to expose your local server');
  console.log('   2. Configure webhook URL in A1Zap dashboard');
  console.log('   3. Start a new chat in A1Zap to trigger the event\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

