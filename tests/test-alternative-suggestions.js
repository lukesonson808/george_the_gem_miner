/**
 * Test Script: Alternative Suggestions
 * 
 * Tests the new feature where the bot suggests relevant alternatives
 * when the user asks for something Brandon doesn't cover.
 * 
 * Example: User asks for "$100+ restaurants" but Brandon only covers street food.
 * The bot should now suggest relevant alternatives with context explaining why.
 */

const socialLinkExtractor = require('../services/social-link-extractor');

// Test cases that should trigger alternative suggestions
const testCases = [
  {
    name: "High-end restaurant request",
    response: "Brandy Eats Test: Ah, I see what you're looking for! 💸\n\nHere's the thing - looking through all of Brandon's reviews, he doesn't actually cover high-end fine dining spots in that price range. His whole vibe is about discovering authentic local spots, street food gems, and casual eateries where you get amazing food without breaking the bank.\n\nMost places in his content are in the $2-15 range per dish. His focus is on:",
    shouldSuggestAlternatives: true
  },
  {
    name: "Specific cuisine not covered",
    response: "Brandy Eats Test: I don't see Brandon covering Italian fine dining restaurants in his reviews. He mainly focuses on Vietnamese street food and local spots. But let me know if you'd like recommendations from what he does cover!",
    shouldSuggestAlternatives: true
  },
  {
    name: "Direct recommendation (should NOT trigger alternatives)",
    response: "Brandy Eats Test: You should definitely try Phở Gia Truyền Bát Đàn! Brandon loved their traditional pho and the atmosphere is great.",
    shouldSuggestAlternatives: false
  },
  {
    name: "Generic greeting (should NOT trigger alternatives)",
    response: "Brandy Eats Test: Hey! What would you like to know about Brandon's food reviews?",
    shouldSuggestAlternatives: false
  }
];

async function runTests() {
  console.log('\n=== Testing Alternative Suggestions Feature ===\n');

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    console.log(`Expected to suggest alternatives: ${testCase.shouldSuggestAlternatives ? 'YES' : 'NO'}`);
    console.log(`\nResponse text: "${testCase.response.substring(0, 150)}..."`);
    
    try {
      const relevantLinks = await socialLinkExtractor.extractRelevantSocialLinks(testCase.response);
      
      if (testCase.shouldSuggestAlternatives) {
        if (relevantLinks.length > 0) {
          console.log(`\n✅ PASS: Found ${relevantLinks.length} alternative suggestions`);
          
          // Check if contextMessage is present
          if (relevantLinks[0].contextMessage) {
            console.log(`   Context: "${relevantLinks[0].contextMessage}"`);
            console.log(`\n   Suggested restaurants:`);
            relevantLinks.forEach((link, i) => {
              console.log(`   ${i + 1}. ${link.name} (${link.type}, ${link.city})`);
              console.log(`      Video: ${link.url}`);
            });
          } else {
            console.log(`   ⚠️  Warning: No context message provided for alternatives`);
          }
        } else {
          console.log(`\n❌ FAIL: Expected alternative suggestions but got none`);
        }
      } else {
        if (relevantLinks.length === 0) {
          console.log(`\n✅ PASS: Correctly did not suggest alternatives`);
        } else if (relevantLinks[0].contextMessage) {
          console.log(`\n❌ FAIL: Should not suggest alternatives but got ${relevantLinks.length} with context message`);
        } else {
          console.log(`\n✅ PASS: Found ${relevantLinks.length} direct matches (not alternatives)`);
          relevantLinks.forEach((link, i) => {
            console.log(`   ${i + 1}. ${link.name}`);
          });
        }
      }
      
    } catch (error) {
      console.log(`\n❌ ERROR: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  console.log('\n\n=== All Tests Complete ===\n');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});

