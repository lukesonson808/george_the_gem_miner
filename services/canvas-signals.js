// Canvas Signals - infer assessment load from Canvas (syllabus/modules) or cache.
const fs = require('fs');
const path = require('path');

const DEFAULT_CACHE_PATH = process.env.CANVAS_CACHE_PATH || path.join(__dirname, '..', 'data', 'canvas-cache.json');

class CanvasSignals {
  async loadSignals(courseIds = []) {
    if (!fs.existsSync(DEFAULT_CACHE_PATH)) return {};
    try {
      const data = JSON.parse(fs.readFileSync(DEFAULT_CACHE_PATH, 'utf8'));
      const map = {};
      for (const id of courseIds) {
        if (data[id]) map[id] = data[id];
      }
      return map;
    } catch (e) {
      console.warn('CanvasSignals: failed to read cache', e.message);
      return {};
    }
  }
}

module.exports = new CanvasSignals();




