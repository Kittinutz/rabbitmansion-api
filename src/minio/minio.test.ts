// Test file for MinioService.moveFile method

interface TestResult {
  success: boolean;
  extractedKey: string | null;
  newKey: string;
  newUrl: string;
  error?: string;
}

class MinioServiceTest {
  private bucketName = 'hotel-assets';

  /**
   * Extract key from MinIO URL (copied from MinioService)
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash and bucket name from pathname
      const pathParts = urlObj.pathname.split('/');
      // Remove empty string and bucket name
      const keyParts = pathParts.slice(2);
      return keyParts.join('/') || null;
    } catch {
      return null;
    }
  }

  /**
   * Generate file URL (copied from MinioService)
   */
  getFileUrl(key: string): string {
    const endpoint = 'localhost';
    const port = '9000';
    const protocol = 'http';
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${key}`;
  }

  /**
   * Test moveFile logic without actual MinIO operations
   */
  testMoveFile(currentUrl: string, newDirectory: string): TestResult {
    try {
      console.log('🧪 Testing moveFile with:');
      console.log(`   Current URL: ${currentUrl}`);
      console.log(`   New Directory: ${newDirectory}`);
      console.log('');

      // Extract current key from URL
      const currentKey = this.extractKeyFromUrl(currentUrl);
      console.log(`📝 Extracted key: ${currentKey}`);

      if (!currentKey) {
        return {
          success: false,
          extractedKey: null,
          newKey: '',
          newUrl: '',
          error: 'Invalid URL format',
        };
      }

      // Get original filename from current key
      const fileName = currentKey.split('/').pop();
      console.log(`📄 Extracted filename: ${fileName}`);

      if (!fileName) {
        return {
          success: false,
          extractedKey: currentKey,
          newKey: '',
          newUrl: '',
          error: 'Unable to extract filename from current key',
        };
      }

      // Create new key with new directory
      const newKey = `${newDirectory}/${fileName}`;
      console.log(`🗂️  New key: ${newKey}`);

      // Generate new URL
      const newUrl = this.getFileUrl(newKey);
      console.log(`🔗 New URL: ${newUrl}`);

      return {
        success: true,
        extractedKey: currentKey,
        newKey: newKey,
        newUrl: newUrl,
      };
    } catch (error) {
      return {
        success: false,
        extractedKey: null,
        newKey: '',
        newUrl: '',
        error: error.message,
      };
    }
  }
}

// Test with your provided URL
const tester = new MinioServiceTest();

console.log('='.repeat(60));
console.log('🧪 TESTING MinioService.moveFile Method');
console.log('='.repeat(60));
console.log('');

// Test Case 1: Your provided URL
const testUrl =
  'http://localhost:9000/hotel-assets/thumbnail/1764219550581-Deluxe Pool 6.jpg';
const newDirectory = 'images';

const result1 = tester.testMoveFile(testUrl, newDirectory);

console.log('📊 TEST RESULTS:');
console.log('');
console.log(`✅ Success: ${result1.success}`);
console.log(`🔑 Extracted Key: "${result1.extractedKey}"`);
console.log(`🗂️  New Key: "${result1.newKey}"`);
console.log(`🔗 New URL: "${result1.newUrl}"`);
if (result1.error) {
  console.log(`❌ Error: ${result1.error}`);
}

console.log('');
console.log('-'.repeat(60));
console.log('');

// Additional test cases
console.log('🧪 Additional Test Cases:');
console.log('');

// Test Case 2: Move to different directory
const result2 = tester.testMoveFile(testUrl, 'gallery');
console.log(`Test 2 - Move to 'gallery':`);
console.log(`   New URL: "${result2.newUrl}"`);
console.log('');

// Test Case 3: Move to nested directory
const result3 = tester.testMoveFile(testUrl, 'rooms/deluxe');
console.log(`Test 3 - Move to 'rooms/deluxe':`);
console.log(`   New URL: "${result3.newUrl}"`);
console.log('');

// Test Case 4: Invalid URL
const result4 = tester.testMoveFile('invalid-url', 'test');
console.log(`Test 4 - Invalid URL:`);
console.log(`   Success: ${result4.success}`);
console.log(`   Error: ${result4.error}`);

console.log('');
console.log('='.repeat(60));
console.log('🎉 Testing Complete!');
console.log('='.repeat(60));

// Expected operations that would happen in real MinIO:
console.log('');
console.log('📋 What would happen in real MinIO operations:');
console.log('');
console.log('1. minioClient.copyObject(');
console.log('     "hotel-assets",');
console.log('     "images/1764219550581-Deluxe Pool 6.jpg",');
console.log('     "/hotel-assets/thumbnail/1764219550581-Deluxe Pool 6.jpg"');
console.log('   )');
console.log('');
console.log('2. minioClient.removeObject(');
console.log('     "hotel-assets",');
console.log('     "thumbnail/1764219550581-Deluxe Pool 6.jpg"');
console.log('   )');
