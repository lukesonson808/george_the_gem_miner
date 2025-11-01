/**
 * Test Script for BrandyEats Rich Content API
 * Tests sending messages with social share rich content blocks
 */

const brandonEatsClient = require('./services/brandoneats-client');

// Test chat ID - REPLACE THIS with your actual test chat ID
const TEST_CHAT_ID = 'YOUR_TEST_CHAT_ID_HERE';

/**
 * Test 1: Send a message with social share blocks (Instagram, TikTok, YouTube)
 */
async function testSocialShareBlocks() {
  console.log('\n🧪 Test 1: Social Share Blocks');
  console.log('=' .repeat(60));
  
  const content = '🔥 Check out our latest viral content across all platforms!';
  
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

  try {
    console.log('📝 Message content:', content);
    console.log('📦 Rich content blocks:', JSON.stringify(richContentBlocks, null, 2));
    
    const result = await brandonEatsClient.sendMessage(
      TEST_CHAT_ID,
      content,
      richContentBlocks
    );
    
    console.log('✅ Success!');
    console.log('   Message ID:', result.messageId);
    console.log('   Timestamp:', result.timestamp);
    console.log('   Full response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Test 2: Send just Instagram
 */
async function testSingleSocialShare() {
  console.log('\n🧪 Test 2: Single Social Share (Instagram only)');
  console.log('=' .repeat(60));
  
  const content = '📸 Our most popular Instagram reel this week!';
  
  const richContentBlocks = [
    {
      type: 'social_share',
      data: {
        platform: 'instagram',
        url: 'https://www.instagram.com/reel/DQI4QE8jHiL/'
      },
      order: 0
    }
  ];

  try {
    const result = await brandonEatsClient.sendMessage(
      TEST_CHAT_ID,
      content,
      richContentBlocks
    );
    
    console.log('✅ Success! Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test 3: Social shares with a call-to-action button
 */
async function testSocialShareWithButton() {
  console.log('\n🧪 Test 3: Social Shares + CTA Button');
  console.log('=' .repeat(60));
  
  const content = '🍕 Love what you see? Follow us for more delicious content!';
  
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
      type: 'button_card',
      data: {
        title: 'Want more food content?',
        description: 'Follow us on your favorite platform!',
        buttons: [
          {
            id: 'btn_follow_ig',
            label: '📸 Follow on Instagram',
            action: 'url',
            value: 'https://www.instagram.com/brandneweats',
            variant: 'primary'
          },
          {
            id: 'btn_follow_tiktok',
            label: '🎵 Follow on TikTok',
            action: 'url',
            value: 'https://www.tiktok.com/@brandneweats',
            variant: 'secondary'
          }
        ]
      },
      order: 2
    }
  ];

  try {
    const result = await brandonEatsClient.sendMessage(
      TEST_CHAT_ID,
      content,
      richContentBlocks
    );
    
    console.log('✅ Success! Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Test 4: Text-only message (backward compatibility test)
 */
async function testTextOnlyMessage() {
  console.log('\n🧪 Test 4: Text-Only Message (Backward Compatibility)');
  console.log('=' .repeat(60));
  
  const content = '👋 Hey! This is a simple text message with no rich content.';

  try {
    const result = await brandonEatsClient.sendMessage(
      TEST_CHAT_ID,
      content
    );
    
    console.log('✅ Success! Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 BrandyEats Rich Content API Testing');
  console.log('=' .repeat(60));
  console.log(`Chat ID: ${TEST_CHAT_ID}`);
  console.log(`Agent ID: ${brandonEatsClient.agentId}`);
  console.log('=' .repeat(60));

  // Check if test chat ID is set
  if (TEST_CHAT_ID === 'YOUR_TEST_CHAT_ID_HERE') {
    console.error('\n❌ ERROR: Please set TEST_CHAT_ID at the top of this file');
    console.error('   You need a valid chat ID to send test messages to.');
    console.error('\n   Example: const TEST_CHAT_ID = "j123abc456def";');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  // Run tests sequentially with delays
  const tests = [
    { name: 'Social Share Blocks', fn: testSocialShareBlocks },
    { name: 'Single Social Share', fn: testSingleSocialShare },
    { name: 'Social Share with Button', fn: testSocialShareWithButton },
    { name: 'Text Only', fn: testTextOnlyMessage }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      successCount++;
      
      // Wait 2 seconds between tests to avoid rate limiting
      if (test !== tests[tests.length - 1]) {
        console.log('\n⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      failCount++;
      console.error(`\n❌ ${test.name} failed`);
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${successCount}/${tests.length}`);
  console.log(`❌ Failed: ${failCount}/${tests.length}`);
  console.log('=' .repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
}

// Allow running specific tests via command line arguments
const args = process.argv.slice(2);
if (args.length > 0) {
  const testMap = {
    '1': testSocialShareBlocks,
    'social': testSocialShareBlocks,
    '2': testSingleSocialShare,
    'single': testSingleSocialShare,
    '3': testSocialShareWithButton,
    'button': testSocialShareWithButton,
    '4': testTextOnlyMessage,
    'text': testTextOnlyMessage
  };

  const testFn = testMap[args[0]];
  if (testFn) {
    console.log('\n🚀 Running single test...\n');
    if (TEST_CHAT_ID === 'YOUR_TEST_CHAT_ID_HERE') {
      console.error('❌ ERROR: Please set TEST_CHAT_ID at the top of this file');
      process.exit(1);
    }
    testFn().then(() => {
      console.log('\n✅ Test completed successfully!');
    }).catch((error) => {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    });
  } else {
    console.error('❌ Unknown test. Available: 1/social, 2/single, 3/button, 4/text');
    process.exit(1);
  }
} else {
  // Run all tests
  runTests();
}

/**
 * Usage:
 * 
 * Run all tests:
 *   node test-rich-content.js
 * 
 * Run specific test:
 *   node test-rich-content.js 1        # Test 1: Social share blocks
 *   node test-rich-content.js social   # Same as above
 *   node test-rich-content.js 2        # Test 2: Single social share
 *   node test-rich-content.js button   # Test 3: Social share with button
 *   node test-rich-content.js text     # Test 4: Text only
 */

