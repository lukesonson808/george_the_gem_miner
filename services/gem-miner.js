// Gem Miner orchestrates Q-Report + Catalog + Canvas to produce ranked results
const QReportLoader = require('./qreport-loader'); // Load from pre-scraped CSV
const CatalogAYLoader = require('./catalog-ay-loader'); // Load full AY 2025-2026 catalog
const catalog = require('./catalog-parser');
const canvas = require('./canvas-signals');
const { rankCourses } = require('./gem-ranking');

// Initialize loaders
const qreportLoader = new QReportLoader();
const catalogAYLoader = new CatalogAYLoader();

function mergeCourseData(qCourse, catalogEntry, canvasSignal) {
  const rating = qCourse?.rating ?? null;
  const workloadHrs = qCourse?.workloadHrs ?? null;
  const sentiment = qCourse?.sentiment ?? null;
  const assessmentLightness = canvasSignal?.assessmentLightness ?? null;
  const genEd = qCourse?.genEd || catalogEntry?.distribution || null;
  const finalExam = canvasSignal?.finalExam ?? catalogEntry?.finalExam ?? null;
  const title = qCourse?.title || catalogEntry?.title || 'Unknown Title';
  const courseId = qCourse?.courseId || catalogEntry?.courseId || 'UNKNOWN';
  
  // Get meeting time info from catalog (it has separate weekdays, startTime, endTime fields)
  const weekdays = qCourse?.weekdays || catalogEntry?.weekdays || null;
  const startTime = qCourse?.startTime || catalogEntry?.startTime || null;
  const endTime = qCourse?.endTime || catalogEntry?.endTime || null;
  const meetingTime = weekdays && startTime && endTime 
    ? `${weekdays} ${startTime}-${endTime}`
    : catalogEntry?.meeting || null;
  
  return {
    courseId,
    title,
    department: qCourse?.department || catalogEntry?.department || catalogEntry?.subject || null,
    rating,
    workloadHrs,
    sentiment,
    assessmentLightness,
    meetingTime,
    genEd,
    finalExam,
    // Include Q-Report link and other metadata from qCourse
    qreportLink: qCourse?.qreportLink || null,
    description: qCourse?.description || catalogEntry?.description || null,
    weekdays: weekdays,
    startTime: startTime,
    endTime: endTime,
    requirements: catalogEntry?.requirements || null,
    instructors: catalogEntry?.instructors || qCourse?.instructor || null,
    term: catalogEntry?.term || null
  };
}

/**
 * Strip section numbers from course IDs for matching
 * e.g., "ANTHRO 97Z 001" => "ANTHRO 97Z"
 * BUT keep course numbers like "APMTH 120" unchanged
 */
function stripSectionNumber(courseId) {
  // Only strip section numbers that are 001-099 (actual sections)
  // Do NOT strip course numbers like 100-999
  // Pattern: space + 0 + two digits at end (001-099)
  return courseId.replace(/\s+0\d{2}$/,'').trim();
}

async function findGems(query = {}) {
  // 1) Source datasets
  // Use the NEW AY Catalog (with clean meeting times, requirements, etc.)
  const qCourses = await qreportLoader.fetchCourses(query.filters || {});
  const catalogEntries = catalogAYLoader.loadData(); // Use AY catalog, not old catalog!
  
  console.log(`🔍 Gem Miner: Found ${qCourses.length} Q-Report courses, ${catalogEntries.length} AY catalog entries`);
  
  // Deduplicate catalog entries by courseId (keep most recent term or first entry)
  const catalogDeduped = new Map();
  catalogEntries.forEach(entry => {
    const existing = catalogDeduped.get(entry.courseId);
    if (!existing) {
      catalogDeduped.set(entry.courseId, entry);
    } else {
      // Keep the one with a term that looks more recent, or has more data
      const thisTerm = entry.term || '';
      const existingTerm = existing.term || '';
      if (thisTerm.includes('2026') && !existingTerm.includes('2026')) {
        catalogDeduped.set(entry.courseId, entry);
      } else if (thisTerm && !existingTerm) {
        catalogDeduped.set(entry.courseId, entry);
      }
    }
  });
  const catalogUnique = Array.from(catalogDeduped.values());
  console.log(`📚 Deduplicated catalog: ${catalogEntries.length} → ${catalogUnique.length} unique courses`);
  
  const courseIds = qCourses.map(c => c.courseId).filter(Boolean);
  const canvasSignals = await canvas.loadSignals(courseIds);

  //  stale Q-Report data, use catalog entries with default ratings
  const qById = new Map(qCourses.map(q => [q.courseId, q]));
  let merged = [];
  
  if (qCourses.length === 0 && catalogUnique.length > 0) {
    // Fallback: use catalog entries with default values
    console.warn('⚠️  WARNING: No Q-Report data found! Using catalog entries with DEFAULT ratings');
    console.warn('⚠️  To get real ratings, ensure data/qreport-spring-2025.csv exists');
    merged = catalogUnique.map(cat => mergeCourseData(null, cat, null)).map(c => {
      // Add a flag so we can warn users
      c._usingDefaults = true;
      return {
        ...c,
        rating: 4.0, // Default rating (NOT from HUGems)
        workloadHrs: 6, // Default workload (NOT from HUGems)
        sentiment: 0.5 // Default sentiment
      };
    });
  } else {
    // Normal merge: Q-Report courses + catalog enrichment
    // ONLY use courses that have Q-Report data (don't add catalog-only courses)
    // Create catalog map with BOTH original ID and stripped ID for matching
    const catalogById = new Map();
    catalogUnique.forEach(entry => {
      catalogById.set(entry.courseId, entry);
      // Also add with stripped version for matching Q-Report sections
      const stripped = stripSectionNumber(entry.courseId);
      if (stripped !== entry.courseId) {
        catalogById.set(stripped, entry);
      }
    });
    
    // Merge Q-Report data with catalog, trying both exact match and stripped match
    merged = qCourses.map(q => {
      const strippedId = stripSectionNumber(q.courseId);
      const catalogEntry = catalogById.get(q.courseId) || catalogById.get(strippedId);
      const mergedCourse = mergeCourseData(q, catalogEntry, canvasSignals[q.courseId]);
      // Use stripped ID as the canonical courseId for consistency
      mergedCourse.courseId = strippedId;
      
      return mergedCourse;
    });
    
    // Mark all as having real Q-Report data
    merged.forEach(c => c._hasQReportData = true);
  }

  // Final deduplication pass (in case Q-Report has duplicates too)
  const mergedDeduped = new Map();
  merged.forEach(c => {
    const key = c.courseId;
    if (!mergedDeduped.has(key)) {
      mergedDeduped.set(key, c);
    }
  });
  merged = Array.from(mergedDeduped.values());
  
  console.log(`📊 Gem Miner: ${merged.length} courses after merge and deduplication`);

  // 3) Optional constraints
  let filtered = merged;
  if (query.maxHrsPerWeek != null) {
    filtered = filtered.filter(c => c.workloadHrs == null || c.workloadHrs <= query.maxHrsPerWeek);
  }
  if (query.noFinal === true) {
    filtered = filtered.filter(c => c.finalExam === false || c.finalExam === 'no' || c.finalExam === null);
  }
  if (query.department) {
    const d = String(query.department).toLowerCase();
    filtered = filtered.filter(c => String(c.department || '').toLowerCase().includes(d));
  }
  
  console.log(`✅ Gem Miner: ${filtered.length} courses after filtering`);

  // 4) Rank
  const ranked = rankCourses(filtered, { preferredTimes: query.preferredTimes || [] });
  console.log(`🎯 Gem Miner: ${ranked.length} courses ranked`);
  return ranked;
}

/**
 * Get all available courses from the AY catalog
 * This provides the COMPLETE list of courses that exist
 * Use this to validate course existence and prevent hallucinations
 */
async function getAllAvailableCourses(filters = {}) {
  let courses = catalogAYLoader.loadData();
  
  // Apply basic filters
  if (filters.term) {
    courses = courses.filter(c => 
      c.term.toLowerCase().includes(filters.term.toLowerCase())
    );
  }
  
  if (filters.subject) {
    courses = courses.filter(c =>
      c.subject.toUpperCase().includes(filters.subject.toUpperCase())
    );
  }
  
  if (filters.weekdays) {
    const weekdaysLower = filters.weekdays.toLowerCase();
    courses = courses.filter(c => {
      if (!c.meetingParsed || !c.meetingParsed.weekdays) return false;
      return c.meetingParsed.weekdays.toLowerCase().includes(weekdaysLower);
    });
  }
  
  console.log(`📚 Catalog: ${courses.length} courses available matching filters`);
  return courses;
}

/**
 * Verify if a course exists in the catalog
 */
function courseExists(courseId) {
  const course = catalogAYLoader.getCourseById(courseId);
  return course !== undefined;
}

/**
 * Get course details by ID
 */
function getCourseDetails(courseId) {
  return catalogAYLoader.getCourseById(courseId);
}

module.exports = { 
  findGems, 
  getAllAvailableCourses, 
  courseExists,
  getCourseDetails
};


