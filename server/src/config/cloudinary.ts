import { v2 as cloudinary } from 'cloudinary';

// Validate environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('🔧 Cloudinary Configuration Check:');
console.log(`Cloud Name: ${cloudName ? '✅ Set' : '❌ Missing'}`);
console.log(`API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);
console.log(`API Secret: ${apiSecret ? '✅ Set' : '❌ Missing'}`);

if (!cloudName || !apiKey || !apiSecret) {
  console.error('❌ Missing Cloudinary environment variables!');
  throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log('✅ Cloudinary configured successfully');

export default cloudinary;