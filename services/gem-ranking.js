// Gem ranking functions (GemScore) and normalization utilities

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function normalize(value, min, max, invert = false) {
  if (min === max) return 0;
  let v = (Number(value) - min) / (max - min);
  v = clamp01(v);
  return invert ? 1 - v : v;
}

// Simplified, intuitive GemScore: Higher = Better Gem
// Based on clear criteria students care about
function computeGemScore(course, bounds) {
  let score = 0;

  // 1. RATING (0-50 points) - Most important factor
  const rating = course.rating ?? 0;
  if (rating >= 4.5) score += 50;      // Perfect/Excellent
  else if (rating >= 4.0) score += 40; // Very good
  else if (rating >= 3.5) score += 30; // Good
  else if (rating >= 3.0) score += 20; // Okay
  else score += 10;                     // Below average

  // 2. WORKLOAD (0-40 points) - Lower hours = more points
  const workloadHrs = course.workloadHrs ?? 10;
  if (workloadHrs <= 3) score += 40;      // Very light
  else if (workloadHrs <= 5) score += 30; // Light
  else if (workloadHrs <= 8) score += 20; // Moderate
  else if (workloadHrs <= 10) score += 10; // Medium
  else score += 0;                         // Heavy (no points)

  // 3. COMMENTS MENTIONING "GEM" or "EASY" (0-10 points bonus)
  const comment = course.bestComment || '';
  const lowerComment = comment.toLowerCase();
  if (lowerComment.includes('gem') || lowerComment.includes('easy class') || lowerComment.includes('easy course')) {
    score += 10; // Bonus for explicit "gem" or "easy" mentions
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function rankCourses(courses, userPrefs = {}) {
  if (!Array.isArray(courses) || courses.length === 0) return [];
  const bounds = {
    ratingMin: Math.min(...courses.map(c => c.rating ?? 0), 0),
    ratingMax: Math.max(...courses.map(c => c.rating ?? 0), 5),
    workloadMin: Math.min(...courses.map(c => c.workloadHrs ?? 0), 0),
    workloadMax: Math.max(...courses.map(c => c.workloadHrs ?? 0), 20)
  };

  const preferredTimes = (userPrefs.preferredTimes || []).map(s => String(s).toLowerCase());

  const scored = courses.map(c => {
    const fitsTime = preferredTimes.length === 0 || preferredTimes.some(t => String(c.meetingTime || '').toLowerCase().includes(t));
    const logisticsFit = fitsTime ? 1 : 0;
    const courseWithDerived = { ...c, logisticsFit };
    const GemScore = computeGemScore(courseWithDerived, bounds);
    return { ...courseWithDerived, GemScore };
  });

  scored.sort((a, b) => b.GemScore - a.GemScore);
  return scored;
}

module.exports = { rankCourses };


