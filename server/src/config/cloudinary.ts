import { v2 as cloudinary } from 'cloudinary';

// Validate environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('🔧 Cloudinary Configuration Check:');
console.log(`Cloud Name: ${cloudName ? '✅ Set' : '⚠️  Not configured (optional)'}`);
console.log(`API Key: ${apiKey ? '✅ Set' : '⚠️  Not configured (optional)'}`);
console.log(`API Secret: ${apiSecret ? '✅ Set' : '⚠️  Not configured (optional)'}`);

// Solo configurar si todas las credenciales están presentes
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.warn('⚠️  Cloudinary not configured - image uploads will be disabled');
}

export default cloudinary;
