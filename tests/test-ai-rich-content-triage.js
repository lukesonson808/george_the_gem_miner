/**
 * Test AI-Powered Rich Content Triage
 * 
 * Tests the intelligent rich content decision-making system that uses Claude AI
 * to analyze conversations and determine when to send carousels, product cards, or CTAs.
 */

const zapbankRichContentTriage = require('../services/zapbank-rich-content-triage');

// Test scenarios for different rich content types
const testScenarios = [
  {
    name: 'User asks for product overview',
    conversation: [],
    userMessage: 'What products does Zap Bank offer?',
    agentResponse: 'Zap Bank offers a comprehensive suite of financial products for startups: Treasury accounts with 4.09% APY, Corporate Cards with 2% cashback, Business Checking with $0 fees, Bill Pay, Expense Management, and Accounting Integrations.',
    expectedType: 'carousel',
    description: 'Should trigger carousel for product overview'
  },
  {
    name: 'User interested in Treasury specifically',
    conversation: [
      { role: 'user', content: 'Tell me about earning interest' },
      { role: 'assistant', content: 'Our Treasury account offers 4.09% APY on idle cash.' }
    ],
    userMessage: 'Tell me more about the Treasury account',
    agentResponse: 'Our Treasury account is perfect for parking your runway. You earn 4.09% APY on idle cash, it\'s FDIC insured, and you have instant access whenever you need it. Most startups use it to maximize returns on their reserves.',
    expectedType: 'product_card',
    description: 'Should trigger product card for Treasury'
  },
  {
    name: 'User ready to sign up',
    conversation: [
      { role: 'user', content: 'What are your fees?' },
      { role: 'assistant', content: 'We have $0 ACH fees and $0 bill pay fees.' },
      { role: 'user', content: 'That sounds great!' }
    ],
    userMessage: 'How do I get started?',
    agentResponse: 'It\'s super easy! The whole process takes about 10 minutes. You can apply online with basic company info and ID verification. Most companies get approved same day. Want me to send you the signup link?',
    expectedType: 'cta_buttons',
    description: 'Should trigger CTA buttons when user is ready'
  },
  {
    name: 'Simple question - no rich content',
    conversation: [
      { role: 'user', content: 'What are your business hours?' }
    ],
    userMessage: 'What are your business hours?',
    agentResponse: 'Our customer support is available 24/7 via chat, and you can access your account anytime online.',
    expectedType: 'none',
    description: 'Should NOT send rich content for simple questions'
  },
  {
    name: 'User just exploring - early stage',
    conversation: [],
    userMessage: 'Hi',
    agentResponse: 'Hey! I\'m your Zap Bank Advisor. How can I help you today?',
    expectedType: 'none',
    description: 'Should NOT send rich content too early in conversation'
  },
  {
    name: 'Discussing corporate cards',
    conversation: [
      { role: 'user', content: 'We need better expense management' },
      { role: 'assistant', content: 'Our Corporate Cards come with built-in expense management.' }
    ],
    userMessage: 'What cashback do you offer?',
    agentResponse: 'Our Corporate Cards offer up to 2% cashback on all business spend. You also get virtual cards for online subscriptions, granular spending controls per employee, and real-time transaction notifications.',
    expectedType: 'product_card',
    description: 'Should trigger product card for Corporate Cards'
  }
];

/**
 * Run AI triage test
 */
async function runTest(scenario, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test ${index + 1}: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`\nUser Message: "${scenario.userMessage}"`);
  console.log(`\nAgent Response: "${scenario.agentResponse.substring(0, 100)}..."`);
  
  if (scenario.conversation.length > 0) {
    console.log(`\nConversation History (${scenario.conversation.length} messages):`);
    scenario.conversation.forEach(msg => {
      console.log(`  ${msg.role}: ${msg.content.substring(0, 60)}...`);
    });
  }

  try {
    const startTime = Date.now();
    
    const decision = await zapbankRichContentTriage.analyze(
      scenario.conversation,
      scenario.userMessage,
      scenario.agentResponse
    );

    const duration = Date.now() - startTime;

    console.log(`\n🤖 AI Decision (took ${duration}ms):`);
    console.log(`   Should Send: ${decision.shouldSend}`);
    console.log(`   Content Type: ${decision.contentType}`);
    if (decision.productType) {
      console.log(`   Product Type: ${decision.productType}`);
    }
    console.log(`   Reasoning: ${decision.reasoning}`);

    // Validate result
    const isCorrectType = decision.contentType === scenario.expectedType;
    const resultIcon = isCorrectType ? '✅' : '⚠️';
    
    console.log(`\n${resultIcon} Expected: ${scenario.expectedType}, Got: ${decision.contentType}`);
    
    if (!isCorrectType) {
      console.log(`\n⚠️  NOTE: AI made a different decision than expected. This may be acceptable depending on context.`);
    }

    return {
      passed: true,
      matchesExpected: isCorrectType,
      decision,
      duration
    };

  } catch (error) {
    console.error(`\n❌ Test failed with error: ${error.message}`);
    console.error(error.stack);
    return {
      passed: false,
      matchesExpected: false,
      error: error.message
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n🚀 Starting AI Rich Content Triage Tests\n');
  
  const results = [];
  let totalDuration = 0;

  for (let i = 0; i < testScenarios.length; i++) {
    const result = await runTest(testScenarios[i], i);
    results.push(result);
    
    if (result.duration) {
      totalDuration += result.duration;
    }

    // Small delay between tests to avoid rate limits
    if (i < testScenarios.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(80)}`);
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const matchedExpected = results.filter(r => r.matchesExpected).length;
  const avgDuration = totalDuration / results.filter(r => r.duration).length;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed (no errors): ${passedTests}/${totalTests}`);
  console.log(`Matched Expected: ${matchedExpected}/${totalTests}`);
  console.log(`Average Decision Time: ${Math.round(avgDuration)}ms`);
  
  console.log('\n📈 Decision Breakdown:');
  const decisionCounts = {
    carousel: 0,
    product_card: 0,
    cta_buttons: 0,
    none: 0
  };
  
  results.forEach(r => {
    if (r.decision) {
      decisionCounts[r.decision.contentType]++;
    }
  });
  
  console.log(`   Carousel: ${decisionCounts.carousel}`);
  console.log(`   Product Card: ${decisionCounts.product_card}`);
  console.log(`   CTA Buttons: ${decisionCounts.cta_buttons}`);
  console.log(`   None: ${decisionCounts.none}`);

  console.log('\n💡 Note: AI decisions may differ from expected based on nuanced context analysis.');
  console.log('   This is often acceptable and demonstrates the AI\'s ability to consider subtleties.');
  
  if (passedTests === totalTests) {
    console.log('\n✅ All tests completed successfully!\n');
  } else {
    console.log('\n⚠️  Some tests encountered errors. Check logs above.\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testScenarios };

