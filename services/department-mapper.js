// Comprehensive Harvard Department Mapping
// Maps common search terms to actual Harvard department codes

const DEPARTMENT_ALIASES = {
  // Computer Science
  'cs': 'COMPSCI',
  'comp sci': 'COMPSCI',
  'computer science': 'COMPSCI',
  'compsci': 'COMPSCI',
  
  // Economics
  'econ': 'ECON',
  'economics': 'ECON',
  
  // Government
  'gov': 'GOV',
  'government': 'GOV',
  'political science': 'GOV',
  'poli sci': 'GOV',
  
  // Mathematics
  'math': 'MATH',
  'mathematics': 'MATH',
  
  // Statistics
  'stat': 'STAT',
  'stats': 'STAT',
  'statistics': 'STAT',
  
  // History
  'hist': 'HIST',
  'history': 'HIST',
  
  // English
  'eng': 'ENGLISH',
  'english': 'ENGLISH',
  
  // Biology
  'bio': 'MCB', // Molecular & Cellular Biology
  'biology': 'MCB',
  
  // Chemistry
  'chem': 'CHEM',
  'chemistry': 'CHEM',
  
  // Physics
  'phys': 'PHYSICS',
  'physics': 'PHYSICS',
  
  // Anthropology
  'anthro': 'ANTHRO',
  'anthropology': 'ANTHRO',
  
  // Sociology
  'soc': 'SOCIOL',
  'sociology': 'SOCIOL',
  
  // Philosophy
  'phil': 'PHIL',
  'philosophy': 'PHIL',
  
  // Psychology - NOTE: No PSY department, search in titles
  'psy': null, // Will trigger title search
  'psych': null, // Will trigger title search
  'psychology': null, // Will trigger title search
  
  // Art & Visual Studies
  'art': 'AFVS',
  'visual studies': 'AFVS',
  
  // Music
  'music': 'MUSIC',
  
  // Linguistics
  'ling': 'LING',
  'linguistics': 'LING',
  
  // African & African American Studies
  'african american studies': 'AFRAMER',
  'afam': 'AFRAMER',
  'aaas': 'AFRAMER',
  
  // East Asian
  'east asian': 'EALC',
  'chinese': 'CHNSE',
  'japanese': 'JAPN',
  
  // Applied Math & Computation
  'applied math': 'APMTH',
  'applied computation': 'APCOMP',
  'am': 'APMTH',
  'ac': 'APCOMP',
  
  // Engineering
  'engineering': 'ES',
  'engsci': 'ES',
  'es': 'ES',
  
  // Data Science (combination)
  'data science': null, // Will search for STAT + COMPSCI
  
  // Neuroscience
  'neuro': 'NEURO',
  'neuroscience': 'NEURO',
  
  // Environmental Science
  'env sci': 'ESPP',
  'environmental science': 'ESPP',
  'espp': 'ESPP'
};

// Full department names (from department_list.json)
const FULL_DEPARTMENT_NAMES = [
  "African & African Amer Studies",
  "Anthropology",
  "Applied Computation",
  "Applied Mathematics",
  "Applied Physics",
  "Art, Film, and Visual Studies",
  "Astronomy",
  "Bio Sciences in Public Health",
  "Biomedical Engineering",
  "Biophysics",
  "Biostatistics",
  "Chemical & Physical Biology",
  "Chemistry & Chemical Biology",
  "Classics, The",
  "Comparative Literature",
  "Computer Science",
  "Earth & Planetary Sciences",
  "East Asian Langs & Civ",
  "Economics",
  "Education Studies",
  "Engineering Sciences",
  "English",
  "Envi Science & Public Policy",
  "Environmental Sci & Engineer",
  "Ethnicity, Migration, Rights",
  "First Year Seminar Program",
  "Folklore & Mythology",
  "General Education",
  "Global Health & Health Policy",
  "Government",
  "Health Policy",
  "History",
  "History & Literature",
  "History of Art & Architecture",
  "History of Science",
  "Human Biology, Behavior,& Evol",
  "Humanities",
  "Linguistics",
  "Mathematics",
  "Medical Sciences",
  "Medieval Studies",
  "Mind, Brain & Behavior",
  "Molecular & Cellular Biology",
  "Music",
  "Near Eastern Languages & Civ",
  "Organismic & Evolutionary Biol",
  "Philosophy",
  "Physics",
  "Psychology",
  "Quantum Science & Engineering",
  "Religion, The Study of",
  "Romance Languages & Lit",
  "Russia, E Europe, Central Asia",
  "Slavic Languages & Literatures",
  "Social Studies",
  "Sociology",
  "South Asian Studies",
  "Statistics",
  "Stem Cell & Regenerative Biol",
  "The Lemann Prog on Creativity",
  "Theater, Dance & Media",
  "Women, Gender & Sexuality"
];

/**
 * Map a user search term to Harvard department code(s)
 * @param {string} searchTerm - User's search term
 * @returns {Object} { department: string|null, titleSearch: string|null, isMultiDept: boolean }
 */
function mapDepartment(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  
  // Check aliases
  if (DEPARTMENT_ALIASES.hasOwnProperty(term)) {
    const mapped = DEPARTMENT_ALIASES[term];
    
    // If mapped is null, we need to search titles instead (e.g., psychology)
    if (mapped === null) {
      return {
        department: null,
        titleSearch: term,
        isMultiDept: false
      };
    }
    
    return {
      department: mapped,
      titleSearch: null,
      isMultiDept: false
    };
  }
  
  // Special case: "data science" searches both STAT and COMPSCI
  if (term.includes('data') && term.includes('science')) {
    return {
      department: null,
      titleSearch: 'data',
      isMultiDept: true
    };
  }
  
  // Try partial matching with full department names
  for (const fullName of FULL_DEPARTMENT_NAMES) {
    if (fullName.toLowerCase().includes(term) || term.includes(fullName.toLowerCase())) {
      // Return the search term as title search (since we don't have exact dept code mapping)
      return {
        department: null,
        titleSearch: term,
        isMultiDept: false
      };
    }
  }
  
  // Default: treat as department code (uppercase)
  return {
    department: term.toUpperCase(),
    titleSearch: null,
    isMultiDept: false
  };
}

module.exports = {
  mapDepartment,
  DEPARTMENT_ALIASES,
  FULL_DEPARTMENT_NAMES
};

