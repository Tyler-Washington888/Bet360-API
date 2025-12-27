/**
 * Cloudinary Configuration for Backend Operations
 * 
 * This is only needed if you want to:
 * - Delete images from Cloudinary
 * - Perform signed uploads
 * - Use Cloudinary Admin API
 * 
 * For unsigned frontend uploads, this is NOT needed.
 */

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary (only needed for backend operations)
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'durdc6nkq',
    api_key: process.env.CLOUDINARY_API_KEY || '574692384485946',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'Rm29plPOf_qPrLSKF9lSszrOiZk',
  });
}

/**
 * Delete an image from Cloudinary using its public_id
 * @param publicId - The public_id of the image to delete
 * @returns Promise with deletion result
 */
export const deleteImageFromCloudinary = async (
  publicId: string
): Promise<any> => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Extract public_id from Cloudinary URL
 * @param url - The Cloudinary secure_url
 * @returns The public_id or null if invalid URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

export default cloudinary;

