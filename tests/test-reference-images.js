/**
 * Test Reference Images Feature
 * 
 * Tests the YC Photographer agent's ability to send reference images
 * before generating edited photos.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(text) {
  console.log('\n' + '='.repeat(80));
  log(text, 'cyan');
  console.log('='.repeat(80) + '\n');
}

async function main() {
  header('🧪 Testing Reference Images Feature');

  const referenceDir = path.join(__dirname, '..', 'reference-images');
  const envPath = path.join(__dirname, '..', '.env');
  
  // Test 1: Check if reference directory exists
  header('Test 1: Reference Directory');
  if (fs.existsSync(referenceDir)) {
    log('✅ reference-images/ directory exists', 'green');
  } else {
    log('❌ reference-images/ directory not found', 'red');
    log('   Creating directory...', 'yellow');
    fs.mkdirSync(referenceDir, { recursive: true });
    log('✅ Directory created', 'green');
  }

  // Test 2: Check for reference image files
  header('Test 2: Reference Image Files');
  
  const requiredFiles = [
    'yc-sign-reference.jpg',
    'yc-orange-reference.jpg'
  ];
  
  const missingFiles = [];
  
  for (const filename of requiredFiles) {
    const filePath = path.join(referenceDir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      log(`✅ ${filename} exists (${sizeKB} KB)`, 'green');
    } else {
      log(`❌ ${filename} not found`, 'red');
      missingFiles.push(filename);
    }
  }

  // Test 3: Check environment variable
  header('Test 3: Environment Configuration');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('YC_SEND_REFERENCE_IMAGES=true')) {
      log('✅ YC_SEND_REFERENCE_IMAGES=true is set in .env', 'green');
    } else if (envContent.includes('YC_SEND_REFERENCE_IMAGES')) {
      log('⚠️  YC_SEND_REFERENCE_IMAGES is set but not to "true"', 'yellow');
      log('   Current value might disable the feature', 'yellow');
    } else {
      log('❌ YC_SEND_REFERENCE_IMAGES not found in .env', 'red');
      log('   Feature will be disabled by default', 'yellow');
    }
  } else {
    log('❌ .env file not found', 'red');
    log('   Create .env file and add: YC_SEND_REFERENCE_IMAGES=true', 'yellow');
  }

  // Test 4: Check webhook code
  header('Test 4: Webhook Implementation');
  
  const webhookPath = path.join(__dirname, '..', 'webhooks', 'yc-photographer-webhook.js');
  if (fs.existsSync(webhookPath)) {
    const webhookContent = fs.readFileSync(webhookPath, 'utf-8');
    
    const checks = [
      { name: 'getReferenceImageUrl method', pattern: 'getReferenceImageUrl' },
      { name: 'sendReferenceImage method', pattern: 'sendReferenceImage' },
      { name: 'referenceImagesEnabled config', pattern: 'referenceImagesEnabled' },
      { name: 'fs and path imports', pattern: 'require(\'fs\')' }
    ];
    
    for (const check of checks) {
      if (webhookContent.includes(check.pattern)) {
        log(`✅ ${check.name} implemented`, 'green');
      } else {
        log(`❌ ${check.name} missing`, 'red');
      }
    }
  } else {
    log('❌ Webhook file not found', 'red');
  }

  // Test 5: Check server configuration
  header('Test 5: Server Configuration');
  
  const serverPath = path.join(__dirname, '..', 'server.js');
  if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf-8');
    
    if (serverContent.includes('/reference-images')) {
      log('✅ Server configured to serve /reference-images', 'green');
    } else {
      log('❌ Server not configured for /reference-images endpoint', 'red');
    }
  }

  // Summary
  header('📊 Summary & Next Steps');
  
  if (missingFiles.length > 0) {
    log('\n⚠️  Missing Files:', 'yellow');
    log('   You need to add the following reference images:', 'yellow');
    missingFiles.forEach(file => {
      log(`   - ${file}`, 'yellow');
    });
    log('\n   Place them in: ' + referenceDir, 'cyan');
    log('\n   Image Guidelines:', 'blue');
    log('   - Resolution: At least 1024x1024 pixels', 'blue');
    log('   - Format: JPEG or PNG', 'blue');
    log('   - Clear photos of YC settings', 'blue');
    log('\n   See reference-images/README.md for details', 'cyan');
  } else {
    log('✅ All reference images are present!', 'green');
  }

  if (!fs.existsSync(envPath) || !fs.readFileSync(envPath, 'utf-8').includes('YC_SEND_REFERENCE_IMAGES=true')) {
    log('\n⚠️  Feature Configuration:', 'yellow');
    log('   Add to your .env file:', 'yellow');
    log('   YC_SEND_REFERENCE_IMAGES=true', 'cyan');
    log('\n   Then restart the server:', 'yellow');
    log('   npm start', 'cyan');
  } else {
    log('\n✅ Feature is properly configured!', 'green');
  }

  log('\n📚 Documentation:', 'blue');
  log('   - Feature guide: REFERENCE_IMAGES_FEATURE.md', 'blue');
  log('   - Setup instructions: reference-images/README.md', 'blue');
  log('   - Agent docs: docs/YC_PHOTOGRAPHER_AGENT.md', 'blue');

  log('\n🎯 Ready to Test:', 'green');
  log('   1. Ensure .env has YC_SEND_REFERENCE_IMAGES=true', 'reset');
  log('   2. Add reference images to reference-images/', 'reset');
  log('   3. Restart server: npm start', 'reset');
  log('   4. Send a test webhook with an image', 'reset');
  log('   5. Check that reference image is sent before edited photo', 'reset');
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the test
main().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});

