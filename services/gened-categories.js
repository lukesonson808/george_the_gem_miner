/**
 * GenEd Category Mapping
 * Maps specific GenEd courses to their category requirements
 * 
 * Harvard GenEd Categories:
 * 1. Aesthetics and Culture
 * 2. Ethics and Civics
 * 3. Histories, Societies, Individuals
 * 4. Science and Technology in Society
 */

const GENED_CATEGORIES = {
  // Aesthetics and Culture
  'GENED 1034': 'Aesthetics and Culture', // Texts in Transition
  'GENED 1049': 'Aesthetics and Culture', // East Asian Cinema
  'GENED 1067': 'Aesthetics and Culture', // Creativity
  'GENED 1074': 'Aesthetics and Culture', // The Ancient Greek Hero
  'GENED 1083': 'Aesthetics and Culture', // Permanent Impermanence: Why Buddhists Build Monuments
  'GENED 1090': 'Aesthetics and Culture', // What Is a Book? From the Clay Tablet to the Kindle
  'GENED 1114': 'Aesthetics and Culture', // Painting's Doubt: A Studio Course
  'GENED 1145': 'Aesthetics and Culture', // Global Japanese Cinema
  'GENED 1160': 'Aesthetics and Culture', // Harvard Gets Medieval
  'GENED 1168': 'Aesthetics and Culture', // Tragedy Today
  'GENED 1169': 'Aesthetics and Culture', // What Is the Good China Story?
  'GENED 1176': 'Aesthetics and Culture', // Sexuality in Literature: From Giovanni's Room to Fun Home
  'GENED 1177': 'Aesthetics and Culture', // Language in Culture and Society
  'GENED 1185': 'Aesthetics and Culture', // The Power and Beauty of Being In Between: The Story of Armenia
  'GENED 1186': 'Aesthetics and Culture', // The Age of Anxiety: Histories, Theories, Remedies
  'GENED 1196': 'Aesthetics and Culture', // Tradition in Everyday Life
  'GENED 1197': 'Aesthetics and Culture', // Grimm's Fairy Tales: Echoes of the Past, Reflections of the Present
  'GENED 1205': 'Aesthetics and Culture', // The Power, Art, and Technology of Writing in East Asia
  
  // Ethics and Civics
  'GENED 1059': 'Ethics and Civics', // Moral Inquiry in the Novels of Tolstoy and Dostoevsky
  'GENED 1194': 'Ethics and Civics', // Philosophy of Technology: From Marx and Heidegger to Artificial Intelligence
  'GENED 1174': 'Ethics and Civics', // Life and Death in the Anthropocene (also in Histories)
  'GENED 1091': 'Ethics and Civics', // Classical Chinese Ethical and Political Theory
  'GENED 1115': 'Ethics and Civics', // Human Trafficking, Slavery and Abolition in the Modern World
  'GENED 1051': 'Ethics and Civics', // Reclaiming Argument: Logic as a Force for Good
  'GENED 1025': 'Ethics and Civics', // Happiness
  'GENED 1102': 'Ethics and Civics', // Making Change When Change is Hard: the Law, Politics, and Policy of Social Change
  'GENED 1161': 'Ethics and Civics', // If There Is No God, All Is Permitted: Theism and Moral Reasoning
  'GENED 1032': 'Ethics and Civics', // What is a Republic?
  'GENED 1189': 'Ethics and Civics', // U.S. K-12 Schools: Assumptions, Binaries, and Controversies
  'GENED 1046': 'Ethics and Civics', // Evolving Morality: From Primordial Soup to Superintelligent Machines (also in Science)
  'GENED 1192': 'Ethics and Civics', // Philanthropy, Nonprofits, and the Social Good
  'GENED 1120': 'Ethics and Civics', // The Political Economy of Globalization (also in Histories)
  'GENED 1202': 'Ethics and Civics', // Unity and Division
  'EDU HT123': 'Ethics and Civics', // Informal Learning for Children
  
  // Histories, Societies, Individuals
  'GENED 1147': 'Histories, Societies, Individuals', // American Food: A Global History
  'GENED 1105': 'Histories, Societies, Individuals', // Can We Know Our Past? (also in Science)
  'GENED 1089': 'Histories, Societies, Individuals', // The Border: Race, Politics, and Health in Modern Mexico
  'GENED 1099': 'Histories, Societies, Individuals', // Pyramid Schemes: What Can Ancient Egyptian Civilization Teach Us? (also in Science)
  'GENED 1178': 'Histories, Societies, Individuals', // Mexico's Culinary Roots: 10,000 Years of Food History
  'GENED 1062': 'Histories, Societies, Individuals', // Ballots and Bibles: Why and How Americans Bring Scriptures into Their Politics
  'GENED 1203': 'Histories, Societies, Individuals', // How the Germans Embraced Hitler: Politics, Culture & the Death of Democracy in Germany, 1918-1945
  'GENED 1052': 'Histories, Societies, Individuals', // Race in a Polarized America
  'GENED 1092': 'Histories, Societies, Individuals', // American Society and Public Policy
  'GENED 1118': 'Histories, Societies, Individuals', // The Holocaust
  'GENED 1136': 'Histories, Societies, Individuals', // Power and Civilization: China
  'GENED 1206': 'Histories, Societies, Individuals', // Asian Americans as an American Paradox
  'GENED 1019': 'Histories, Societies, Individuals', // The Caribbean Crucible: Colonialism, Capitalism and Post-Colonial Misdevelopment In The Region
  'GENED 1088': 'Histories, Societies, Individuals', // The Crusades and the Making of East and West
  'GENED 1017': 'Histories, Societies, Individuals', // Forced to Be Free: Americans as Occupiers and Nation-Builders
  'GENED 1112': 'Histories, Societies, Individuals', // Prediction: The Past and Present of the Future (also in Science)
  'GENED 1068': 'Histories, Societies, Individuals', // The United States and China
  'GENED 1159': 'Histories, Societies, Individuals', // American Capitalism
  'GENED 1204': 'Histories, Societies, Individuals', // Why Democracy?
  'GENED 1148': 'Histories, Societies, Individuals', // Moctezuma's Mexico Then and Now: Ancient Empires, Race Mixture, and Finding LatinX
  'GENED 1198': 'Histories, Societies, Individuals', // Ancient Global Economies (also in Science)
  'GENED 1071': 'Histories, Societies, Individuals', // African Spirituality and the Challenges of Modern Times
  'EDU T268C': 'Histories, Societies, Individuals', // Methods 2 (Science)
  'EDU S515': 'Histories, Societies, Individuals', // Emancipatory Inquiry: Listening, Learning, and Acting for Social Change
  
  // Science and Technology in Society
  'GENED 1038': 'Science and Technology in Society', // Sleep
  'ANTHRO 1956': 'Science and Technology in Society', // Robots in Human Ecology: An Anthropology of Robotics
  'GENED 1053': 'Science and Technology in Society', // The Global Heart Disease Epidemic: Stopping What We Started
  'GENED 1056': 'Science and Technology in Society', // Human Nature
  'GENED 1098': 'Science and Technology in Society', // Natural Disasters
  'GENED 1205': 'Science and Technology in Society', // The Power, Art, and Technology of Writing in East Asia (also in Aesthetics)
  'GENED 1037': 'Science and Technology in Society', // Great Experiments that Changed Our World
  'GENED 1199': 'Science and Technology in Society', // Learning and Unlearning
  'GENED 1031': 'Science and Technology in Society', // Finding Our Way
  'GENED 1079': 'Science and Technology in Society', // Why Is There No Cure for Health?
  'GENED 1187': 'Science and Technology in Society', // AI, Computing and Thinking
  'GENED 1158': 'Science and Technology in Society', // Water and the Environment
  'GENED 1104': 'Science and Technology in Society', // Science and Cooking: From Haute Cuisine to Soft Matter Science
  'GENED 1027': 'Science and Technology in Society', // Human Evolution, Human Health, and Climate Change
  'GENED 1070': 'Science and Technology in Society', // Life as a Planetary Phenomenon
  'GENED 1029': 'Science and Technology in Society', // What is Life? From Quarks to Consciousness
  'GENED 1080': 'Science and Technology in Society', // How Music Works: Engineering the Acoustical World
  'GENED 1093': 'Science and Technology in Society', // Who Lives, Who Dies: Reimagining Global Health
};

/**
 * Get the GenEd category for a course
 * @param {string} courseId - Course ID (e.g., "GENED 1034")
 * @returns {string|null} - Category name or null if not found
 */
function getGenEdCategory(courseId) {
  if (!courseId) return null;
  
  const normalizedId = courseId.toUpperCase().trim();
  
  // Try exact match first
  if (GENED_CATEGORIES[normalizedId]) {
    return GENED_CATEGORIES[normalizedId];
  }
  
  // Try matching without section numbers (e.g., "GENED 1034 001" -> "GENED 1034")
  const courseBase = normalizedId.replace(/\s+\d{3}\s*$/, '').trim();
  if (GENED_CATEGORIES[courseBase]) {
    return GENED_CATEGORIES[courseBase];
  }
  
  return null;
}

/**
 * Get all courses in a specific GenEd category
 * @param {string} category - Category name
 * @returns {Array<string>} - Array of course IDs
 */
function getCoursesInCategory(category) {
  return Object.keys(GENED_CATEGORIES)
    .filter(courseId => GENED_CATEGORIES[courseId] === category);
}

/**
 * Check if a course satisfies a GenEd requirement
 * @param {string} courseId - Course ID
 * @param {string} category - Category to check
 * @returns {boolean}
 */
function satisfiesGenEdCategory(courseId, category) {
  const courseCategory = getGenEdCategory(courseId);
  return courseCategory === category;
}

module.exports = {
  getGenEdCategory,
  getCoursesInCategory,
  satisfiesGenEdCategory,
  GENED_CATEGORIES
};

