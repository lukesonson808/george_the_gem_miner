#!/usr/bin/env node
/**
 * Test Q-Report Loader to verify data is being parsed correctly
 */

const QReportLoader = require('./services/qreport-loader');

const loader = new QReportLoader();
const courses = loader.loadData();

console.log(`\n📊 Q-Report Loaded: ${courses.length} courses\n`);

// Find the specific courses mentioned in the issue
const testCourses = ['ANTHRO 97Z', 'APMTH 109', 'APMTH 115'];

testCourses.forEach(courseId => {
  const course = courses.find(c => c.courseId === courseId);
  if (course) {
    console.log(`✅ Found: ${course.courseId} - ${course.title}`);
    console.log(`   Rating: ${course.rating}`);
    console.log(`   Workload: ${course.workloadHrs} hrs/week`);
    console.log(`   Sentiment: ${course.sentiment}`);
    console.log(`   Gem Probability: ${course.gemProbability}`);
    console.log(`   Q-Report Link: ${course.qreportLink ? course.qreportLink.substring(0, 50) + '...' : 'N/A'}`);
    console.log('');
  } else {
    console.log(`❌ NOT FOUND: ${courseId}\n`);
  }
});

console.log('✅ Test complete!\n');

