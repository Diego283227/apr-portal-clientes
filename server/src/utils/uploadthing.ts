import { UTApi } from "uploadthing/server";

const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

export async function uploadFile(file: Buffer, filename: string): Promise<string> {
  try {
    console.log('🔄 Uploading file to UploadThing...');

    // Detect MIME type from filename extension
    const mimeType = filename.toLowerCase().endsWith('.png') ? 'image/png' :
                    filename.toLowerCase().endsWith('.gif') ? 'image/gif' :
                    'image/jpeg';

    // Create a File object from the buffer
    const uploadFile = new File([file], filename, {
      type: mimeType,
    });

    const response = await utapi.uploadFiles(uploadFile);

    if (response && response.data) {
      const fileUrl = response.data.url;
      console.log('✅ UploadThing upload successful:', fileUrl);
      return fileUrl;
    } else {
      throw new Error('Failed to get upload response');
    }
  } catch (error) {
    console.error('❌ UploadThing upload failed:', error);
    throw error;
  }
}

export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract file key from URL
    const urlParts = fileUrl.split('/');
    const fileKey = urlParts[urlParts.length - 1];

    console.log('🗑️ Deleting file from UploadThing:', fileKey);

    await utapi.deleteFiles([fileKey]);
    console.log('✅ File deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete file:', error);
    return false;
  }
}

export { utapi };