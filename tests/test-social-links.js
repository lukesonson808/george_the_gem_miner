/**
 * Test Script for Social Link Extraction
 * Tests the intelligent detection and sending of TikTok links based on restaurant mentions
 */

const socialLinkExtractor = require('./services/social-link-extractor');

/**
 * Test 1: Load CSV and display available social links
 */
async function test1_loadCSV() {
  console.log('\n🧪 Test 1: Load Social Links from CSV');
  console.log('=' .repeat(60));
  
  try {
    const links = await socialLinkExtractor.loadSocialLinks();
    
    console.log(`✅ Loaded ${links.length} social links`);
    console.log('\nFirst 5 entries:');
    links.slice(0, 5).forEach((link, i) => {
      console.log(`\n${i + 1}. ${link.name}`);
      console.log(`   Type: ${link.type}`);
      console.log(`   City: ${link.city}`);
      console.log(`   TikTok: ${link.tiktokLink}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Extract relevant links from a response that mentions restaurants
 */
async function test2_extractWithMentions() {
  console.log('\n🧪 Test 2: Extract Links from Response with Restaurant Mentions');
  console.log('=' .repeat(60));
  
  const sampleResponse = `Based on the data, I'd recommend checking out Rau Má Mix in Saigon - it's a unique spot with a matcha-like Vietnamese drink that's really good. You should also visit Ocean Palace in Quan 1 for authentic Chinese food and yum cha. Both places are definitely worth trying!`;
  
  try {
    console.log('Sample Response:');
    console.log(`"${sampleResponse}"\n`);
    
    const relevantLinks = await socialLinkExtractor.extractRelevantSocialLinks(sampleResponse);
    
    if (relevantLinks.length > 0) {
      console.log(`✅ Found ${relevantLinks.length} relevant links:`);
      relevantLinks.forEach((link, i) => {
        console.log(`\n${i + 1}. ${link.name}`);
        console.log(`   URL: ${link.url}`);
        console.log(`   Type: ${link.type}, City: ${link.city}`);
      });
      return true;
    } else {
      console.log('⚠️  No relevant links found (this might indicate an issue)');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Extract from response with no restaurant mentions
 */
async function test3_extractWithoutMentions() {
  console.log('\n🧪 Test 3: Extract Links from Response WITHOUT Restaurant Mentions');
  console.log('=' .repeat(60));
  
  const sampleResponse = `The restaurant scene in Saigon is amazing! There are so many great places to explore. I'd recommend trying some local street food and visiting the markets.`;
  
  try {
    console.log('Sample Response:');
    console.log(`"${sampleResponse}"\n`);
    
    const relevantLinks = await socialLinkExtractor.extractRelevantSocialLinks(sampleResponse);
    
    if (relevantLinks.length === 0) {
      console.log('✅ Correctly found no relevant links (expected behavior)');
      return true;
    } else {
      console.log(`⚠️  Found ${relevantLinks.length} links (unexpected - should be 0)`);
      relevantLinks.forEach(link => console.log(`   - ${link.name}`));
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Test with partial/misspelled restaurant name
 */
async function test4_partialMatch() {
  console.log('\n🧪 Test 4: Extract Links with Partial/Variant Names');
  console.log('=' .repeat(60));
  
  const sampleResponse = `You should definitely check out the Pink Church - it's beautiful! Also, Ho Thi Ky Night Market has amazing street food.`;
  
  try {
    console.log('Sample Response:');
    console.log(`"${sampleResponse}"\n`);
    
    const relevantLinks = await socialLinkExtractor.extractRelevantSocialLinks(sampleResponse);
    
    if (relevantLinks.length > 0) {
      console.log(`✅ Found ${relevantLinks.length} relevant links:`);
      relevantLinks.forEach((link, i) => {
        console.log(`${i + 1}. ${link.name} - ${link.url}`);
      });
      return true;
    } else {
      console.log('⚠️  No links found (Claude may need better matching)');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Test with multiple restaurant mentions
 */
async function test5_multipleRestaurants() {
  console.log('\n🧪 Test 5: Extract Links with Multiple Restaurant Mentions');
  console.log('=' .repeat(60));
  
  const sampleResponse = `For your Saigon food tour, I recommend: Rau Má Mix for a unique Vietnamese drink, Ocean Palace for dim sum, and Ho Thi Ky Night Market for amazing street food. Don't miss Tan Dinh Church either!`;
  
  try {
    console.log('Sample Response:');
    console.log(`"${sampleResponse}"\n`);
    
    const relevantLinks = await socialLinkExtractor.extractRelevantSocialLinks(sampleResponse);
    
    console.log(`✅ Found ${relevantLinks.length} relevant links:`);
    relevantLinks.forEach((link, i) => {
      console.log(`${i + 1}. ${link.name} - ${link.url}`);
    });
    
    return relevantLinks.length >= 2; // Should find at least 2
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n🚀 Social Link Extraction Test Suite');
  console.log('=' .repeat(60));
  console.log('Testing intelligent TikTok link detection and extraction\n');

  const tests = [
    { name: 'Load CSV', fn: test1_loadCSV },
    { name: 'Extract with Mentions', fn: test2_extractWithMentions },
    { name: 'Extract without Mentions', fn: test3_extractWithoutMentions },
    { name: 'Partial Match', fn: test4_partialMatch },
    { name: 'Multiple Restaurants', fn: test5_multipleRestaurants }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
      
      // Wait between tests
      if (test !== tests[tests.length - 1]) {
        console.log('\n⏳ Waiting 3 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error(`\n❌ ${test.name} crashed:`, error.message);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Test Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log('=' .repeat(60) + '\n');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the output above for details.\n');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed!\n');
  }
}

// Run specific test or all tests
const args = process.argv.slice(2);
if (args.length > 0) {
  const testMap = {
    '1': test1_loadCSV,
    'load': test1_loadCSV,
    '2': test2_extractWithMentions,
    'extract': test2_extractWithMentions,
    '3': test3_extractWithoutMentions,
    'none': test3_extractWithoutMentions,
    '4': test4_partialMatch,
    'partial': test4_partialMatch,
    '5': test5_multipleRestaurants,
    'multiple': test5_multipleRestaurants
  };

  const testFn = testMap[args[0]];
  if (testFn) {
    console.log('\n🚀 Running single test...\n');
    testFn().then((result) => {
      if (result) {
        console.log('\n✅ Test completed successfully!');
      } else {
        console.log('\n⚠️  Test completed with issues');
        process.exit(1);
      }
    }).catch((error) => {
      console.error('\n❌ Test crashed:', error.message);
      process.exit(1);
    });
  } else {
    console.error('❌ Unknown test. Available: 1/load, 2/extract, 3/none, 4/partial, 5/multiple');
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
 *   node test-social-links.js
 * 
 * Run specific test:
 *   node test-social-links.js 1        # Load CSV
 *   node test-social-links.js extract  # Test extraction with mentions
 *   node test-social-links.js partial  # Test partial matching
 */

