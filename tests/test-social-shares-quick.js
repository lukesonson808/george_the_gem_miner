/**
 * Quick Test: Send Social Share Rich Content
 * 
 * This is a simplified test script that sends the exact social share blocks
 * you specified - Instagram, TikTok, and YouTube.
 */

const brandonEatsClient = require('./services/brandoneats-client');

// ⚠️ IMPORTANT: Replace this with your actual test chat ID
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || 'YOUR_TEST_CHAT_ID_HERE';

async function sendSocialShares() {
  console.log('🚀 Testing BrandyEats Social Share Rich Content\n');
  
  // Validate chat ID is set
  if (TEST_CHAT_ID === 'YOUR_TEST_CHAT_ID_HERE') {
    console.error('❌ ERROR: Please set TEST_CHAT_ID');
    console.error('   Option 1: Set environment variable: TEST_CHAT_ID=j123abc456def node test-social-shares-quick.js');
    console.error('   Option 2: Edit this file and change TEST_CHAT_ID at the top\n');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Chat ID: ${TEST_CHAT_ID}`);
  console.log(`   Agent ID: ${brandonEatsClient.agentId}`);
  console.log(`   API URL: ${brandonEatsClient.apiUrl}\n`);

  // The exact rich content blocks you specified
  const richContentBlocks = [
    {
      type: 'social_share',
      data: {
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/DQI4QE8jHiL/'
      },
      order: 0
    },
    {
      type: 'social_share',
      data: {
        platform: 'tiktok',
        url: 'https://www.tiktok.com/@brandneweats/video/7546112444503035144'
      },
      order: 1
    },
    {
      type: 'social_share',
      data: {
        platform: 'youtube',
        url: 'https://www.youtube.com/shorts/ToobPQS6_ZI'
      },
      order: 2
    }
  ];

  const messageContent = '🔥 Check out our latest viral content across all platforms!';

  console.log('📤 Sending message with rich content blocks...');
  console.log(`   Message: "${messageContent}"`);
  console.log(`   Blocks: ${richContentBlocks.length} social share blocks\n`);

  console.log('📦 Rich Content Blocks:');
  richContentBlocks.forEach((block, i) => {
    console.log(`   ${i + 1}. ${block.data.platform}: ${block.data.url}`);
  });
  console.log('');

  try {
    const result = await brandonEatsClient.sendMessage(
      TEST_CHAT_ID,
      messageContent,
      richContentBlocks
    );

    console.log('✅ SUCCESS! Message sent with rich content\n');
    console.log('📊 Response:');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Timestamp: ${result.timestamp}`);
    console.log(`   Success: ${result.success}`);
    
    if (result.data) {
      console.log('\n📝 Full Response Data:');
      console.log(JSON.stringify(result, null, 2));
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('   Check your WhatsApp chat to see the rich content blocks\n');

  } catch (error) {
    console.error('❌ FAILED to send message\n');
    console.error('Error:', error.message);
    
    if (error.response?.data) {
      console.error('\n📋 API Error Response:');
      console.error(JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.validationErrors) {
        console.error('\n⚠️  Validation Errors:');
        error.response.data.validationErrors.forEach((err, i) => {
          console.error(`   ${i + 1}. Block ${err.index} (${err.type}): ${err.error}`);
        });
      }
    }
    
    console.error('');
    process.exit(1);
  }
}

// Run the test
sendSocialShares();

/**
 * Usage:
 * 
 * Option 1 - Set chat ID via environment variable:
 *   TEST_CHAT_ID=j123abc456def node test-social-shares-quick.js
 * 
 * Option 2 - Edit this file and change TEST_CHAT_ID at the top, then:
 *   node test-social-shares-quick.js
 */

