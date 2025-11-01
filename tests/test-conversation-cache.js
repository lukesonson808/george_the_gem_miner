/**
 * Test Conversation Cache
 * 
 * Verifies that the conversation cache properly stores and retrieves
 * images and makeup requests when API history is unavailable
 */

const conversationCache = require('../services/conversation-cache');

console.log('\n=== Test: Conversation Cache ===\n');

const TEST_CHAT_ID = 'test-chat-123';

// Test 1: Store and retrieve image
console.log('Test 1: Store and Retrieve Image');
console.log('---');
conversationCache.storeImage(TEST_CHAT_ID, 'https://example.com/image1.jpg', 'First image');
const recentImage = conversationCache.getRecentImage(TEST_CHAT_ID);
console.log('Stored: https://example.com/image1.jpg');
console.log('Retrieved:', recentImage);
console.log('Result:', recentImage === 'https://example.com/image1.jpg' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 2: Store multiple images and get most recent
console.log('Test 2: Multiple Images - Get Most Recent');
console.log('---');
conversationCache.storeImage(TEST_CHAT_ID, 'https://example.com/image2.jpg', 'Second image');
conversationCache.storeImage(TEST_CHAT_ID, 'https://example.com/image3.jpg', 'Third image');
const mostRecentImage = conversationCache.getRecentImage(TEST_CHAT_ID);
console.log('Stored 3 images total');
console.log('Most recent:', mostRecentImage);
console.log('Result:', mostRecentImage === 'https://example.com/image3.jpg' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 3: Store and retrieve makeup request
console.log('Test 3: Store and Retrieve Makeup Request');
console.log('---');
conversationCache.storeRequest(TEST_CHAT_ID, 'Make my skin lighter and my brows sharper');
const recentRequest = conversationCache.getRecentRequest(TEST_CHAT_ID);
console.log('Stored: "Make my skin lighter and my brows sharper"');
console.log('Retrieved:', recentRequest);
console.log('Result:', recentRequest === 'Make my skin lighter and my brows sharper' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 4: Filter out trivial requests
console.log('Test 4: Filter Trivial Requests');
console.log('---');
conversationCache.storeRequest(TEST_CHAT_ID, 'yes');  // Should be filtered
conversationCache.storeRequest(TEST_CHAT_ID, 'ok');   // Should be filtered
conversationCache.storeRequest(TEST_CHAT_ID, '[Image]'); // Should be filtered
const requestAfterTrivial = conversationCache.getRecentRequest(TEST_CHAT_ID);
console.log('Stored trivial requests: "yes", "ok", "[Image]"');
console.log('Most recent (should still be previous):', requestAfterTrivial);
console.log('Result:', requestAfterTrivial === 'Make my skin lighter and my brows sharper' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 5: Store new substantive request
console.log('Test 5: Store New Substantive Request');
console.log('---');
conversationCache.storeRequest(TEST_CHAT_ID, 'Blue lips and smokey eyes');
const newRequest = conversationCache.getRecentRequest(TEST_CHAT_ID);
console.log('Stored: "Blue lips and smokey eyes"');
console.log('Retrieved:', newRequest);
console.log('Result:', newRequest === 'Blue lips and smokey eyes' ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 6: Get full chat context
console.log('Test 6: Get Full Chat Context');
console.log('---');
const context = conversationCache.getChatContext(TEST_CHAT_ID);
console.log(`Images in cache: ${context.images.length}`);
console.log(`Requests in cache: ${context.requests.length}`);
console.log('Result:', (context.images.length === 3 && context.requests.length === 2) ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 7: Cache stats
console.log('Test 7: Cache Statistics');
console.log('---');
const stats = conversationCache.getCacheStats();
console.log('Total chats:', stats.totalChats);
console.log('Total images:', stats.totalImages);
console.log('Total requests:', stats.totalRequests);
console.log('Result:', (stats.totalChats >= 1 && stats.totalImages >= 3) ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 8: Clear cache
console.log('Test 8: Clear Cache');
console.log('---');
conversationCache.clearChatCache(TEST_CHAT_ID);
const afterClear = conversationCache.getRecentImage(TEST_CHAT_ID);
console.log('Cleared cache for', TEST_CHAT_ID);
console.log('Recent image after clear:', afterClear);
console.log('Result:', afterClear === null ? '✅ PASS' : '❌ FAIL');
console.log('');

// Test 9: Test with second chat (isolation)
console.log('Test 9: Chat Isolation');
console.log('---');
const CHAT_2 = 'test-chat-456';
conversationCache.storeImage(CHAT_2, 'https://example.com/chat2-image.jpg');
conversationCache.storeRequest(CHAT_2, 'Different makeup request');

const chat1Image = conversationCache.getRecentImage(TEST_CHAT_ID);
const chat2Image = conversationCache.getRecentImage(CHAT_2);
const chat2Request = conversationCache.getRecentRequest(CHAT_2);

console.log('Chat 1 image:', chat1Image);
console.log('Chat 2 image:', chat2Image);
console.log('Chat 2 request:', chat2Request);
console.log('Result:', (chat1Image === null && chat2Image === 'https://example.com/chat2-image.jpg') ? '✅ PASS' : '❌ FAIL');
console.log('');

console.log('=== All Tests Complete ===\n');

// Final stats
const finalStats = conversationCache.getCacheStats();
console.log('Final Cache Statistics:');
console.log(`  Chats tracked: ${finalStats.totalChats}`);
console.log(`  Total images: ${finalStats.totalImages}`);
console.log(`  Total requests: ${finalStats.totalRequests}`);
console.log(`  Expiry time: ${finalStats.expiryMs / 1000 / 60} minutes\n`);

