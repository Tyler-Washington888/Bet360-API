# Cloudinary Image Upload Setup for Bet360 Groups

## Overview
This project uses Cloudinary for storing group images. Images are uploaded directly from the frontend to Cloudinary, and the returned URL is stored in the Group model's `imageUrl` field.

## Setup Instructions

### 1. Create a Cloudinary Account
1. Go to **https://cloudinary.com/users/register/free**
2. Sign up for a free account (includes 25GB storage and 25GB bandwidth)
3. After signing up, you'll be taken to your dashboard

### 2. Your Cloudinary Credentials (Already Provided)
- **Cloud Name**: `durdc6nkq` ✅
- **API Key**: `574692384485946`
- **API Secret**: `Rm29plPOf_qPrLSKF9lSszrOiZk`

### 3. Create an Upload Preset
1. In the Cloudinary dashboard, go to **Settings** → **Upload** (left sidebar)
2. Scroll down to **Upload presets**
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `bet360_groups` (or any name you prefer)
   - **Signing mode**: **Unsigned** (allows direct uploads from frontend)
   - **Folder**: `bet360/groups` (optional, for organization)
   - **Format**: Leave as default or set to `auto` for automatic format conversion
   - **Quality**: `auto` (for automatic optimization)
5. Click **Save**

### 4. Environment Variables

**Frontend (Bet360-UI/.env):**
```env
REACT_APP_CLOUDINARY_CLOUD_NAME=durdc6nkq
REACT_APP_CLOUDINARY_UPLOAD_PRESET=bet360_groups
```

**Backend (Bet360-API/.env) - Optional (only needed for image deletion):**
```env
CLOUDINARY_CLOUD_NAME=durdc6nkq
CLOUDINARY_API_KEY=574692384485946
CLOUDINARY_API_SECRET=Rm29plPOf_qPrLSKF9lSszrOiZk
# OR use the full URL format:
CLOUDINARY_URL=cloudinary://574692384485946:Rm29plPOf_qPrLSKF9lSszrOiZk@durdc6nkq
```

**Important Notes:**
- For **unsigned uploads from frontend** (what we're doing), you only need the cloud name and upload preset in the frontend `.env`
- API key and secret are only needed for backend operations (deleting images, signed uploads, admin API)
- The frontend uploads directly to Cloudinary, so no backend environment variables are needed for basic upload functionality

## How It Works

1. **Frontend Upload**: User selects an image → Frontend uploads directly to Cloudinary using the upload preset
2. **Cloudinary Response**: Cloudinary returns a `secure_url` (HTTPS URL)
3. **Backend Storage**: The `secure_url` is sent to the backend and stored in the Group model's `imageUrl` field
4. **Display**: The stored URL is used to display the image throughout the app

## Security Notes

- The upload preset is set to **unsigned** mode, which means anyone with the preset name can upload
- For production, consider:
  - Using **signed** uploads with backend validation
  - Adding file type and size restrictions
  - Implementing rate limiting
  - Using Cloudinary's transformation features to limit image dimensions

## File Structure

- Frontend upload utility: `Bet360-UI/src/utils/cloudinaryUpload.ts`
- Group model already has `imageUrl?: string` field
- No backend changes needed for basic upload functionality

