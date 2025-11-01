// Catalog Parser - extracts meeting times/GenEd from a PDF or cached JSON.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const DEFAULT_PDF_PATH = process.env.CATALOG_PDF_PATH || path.join(process.cwd(), 'AY 2025-2026.pdf');
const DEFAULT_CACHE_PATH = process.env.CATALOG_CACHE_PATH || path.join(__dirname, '..', 'data', 'catalog-cache.json');
const DEFAULT_CSV_PATH = process.env.CATALOG_CSV_PATH || process.env.COURSE_CSV_PATH || config.qreport?.catalogCsvPath || path.join(process.cwd(), 'AY_2025_2026_courses.csv');

function parseCsv(text) {
  // Minimal CSV parser assuming commas, quoted fields optional, header present
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < raw.length; j++) {
      const ch = raw[j];
      if (ch === '"') {
        if (inQuotes && raw[j+1] === '"') { cur += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    const obj = {};
    header.forEach((key, idx) => {
      obj[key] = (cells[idx] || '').trim().replace(/^"|"$/g, '');
    });
    rows.push(obj);
  }
  return rows;
}

class CatalogParser {
  async loadCatalog() {
    // CSV takes precedence if present
    if (fs.existsSync(DEFAULT_CSV_PATH)) {
      try {
        const csv = fs.readFileSync(DEFAULT_CSV_PATH, 'utf8');
        const rows = parseCsv(csv);
        // Normalize to expected fields - match actual CSV column names
        return rows.map(r => ({
          courseId: r.course_id || r.courseId || r.CourseID || r['Course ID'] || null,
          title: r.title || r.Title || null,
          department: r.subject || r.department || r.Department || null, // CSV uses 'subject' not 'department'
          meetingTime: r.meeting || r.meetingTime || r['Meeting Time'] || null, // CSV uses 'meeting'
          genEd: r.distribution || r.genEd || r.GenEd || r['Gen Ed'] || r['General Education'] || null, // CSV uses 'distribution'
          term: r.term || r.Term || null,
          finalExam: null // Not in CSV; will need Canvas or heuristic
        })).filter(e => e.courseId && e.courseId !== '');
      } catch (e) {
        console.warn('CatalogParser: failed to parse CSV, falling back');
      }
    }
    // Prefer JSON cache if exists; otherwise return empty and expect upstream to handle.
    if (fs.existsSync(DEFAULT_CACHE_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(DEFAULT_CACHE_PATH, 'utf8'));
      } catch (e) {
        console.warn('CatalogParser: failed to read cache json, returning empty');
        return [];
      }
    }
    // PDF parsing not implemented here; leave stub so pipeline can proceed.
    if (fs.existsSync(DEFAULT_PDF_PATH)) {
      console.warn('CatalogParser: PDF found but parser not implemented in this environment; returning empty');
    }
    return [];
  }
}

module.exports = new CatalogParser();


