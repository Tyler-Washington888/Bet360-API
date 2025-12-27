# Image Upload Implementation Summary

## ✅ What's Been Done

### 1. Backend (Already Complete)
- ✅ Group model already has `imageUrl?: string` field in `server/models/groupModel.ts`
- ✅ Group controller already accepts `imageUrl` in create/update requests
- ✅ **No backend changes needed!**

### 2. Frontend Implementation
- ✅ Created `Bet360-UI/src/utils/cloudinaryUpload.ts` - Upload utility
- ✅ Updated `CreateGroupPage.tsx` - Added image upload functionality
- ✅ Updated `CreateGroupPage.css` - Added styling for upload UI

## 🔧 Setup Required

### Step 1: Create Cloudinary Account
1. Go to **https://cloudinary.com/users/register/free**
2. Sign up for a free account
3. Note your **Cloud Name** from the dashboard

### Step 2: Create Upload Preset
1. In Cloudinary dashboard: **Settings** → **Upload**
2. Scroll to **Upload presets** → Click **Add upload preset**
3. Configure:
   - **Preset name**: `bet360_groups`
   - **Signing mode**: **Unsigned**
   - **Folder**: `bet360/groups` (optional)
   - **Format**: `auto`
   - **Quality**: `auto`
4. Click **Save**

### Step 3: Add Environment Variables

**Frontend (Bet360-UI/.env):**
```env
REACT_APP_CLOUDINARY_CLOUD_NAME=durdc6nkq
REACT_APP_CLOUDINARY_UPLOAD_PRESET=bet360_groups
```

**Backend (Bet360-API/.env) - Optional (only for image deletion):**
```env
CLOUDINARY_CLOUD_NAME=durdc6nkq
CLOUDINARY_API_KEY=574692384485946
CLOUDINARY_API_SECRET=Rm29plPOf_qPrLSKF9lSszrOiZk
```

**Note:** The cloud name is already hardcoded as a fallback in the code, but it's best practice to use environment variables.

### Step 4: Restart Development Server
After adding environment variables:
```bash
cd Bet360-UI
npm start
```

## 📝 How It Works

1. **User clicks on group image** → File picker opens
2. **User selects image** → Image uploads to Cloudinary
3. **Cloudinary returns URL** → Stored in component state and localStorage
4. **User creates group** → URL sent to backend and stored in Group model
5. **Image displays** → Using the stored URL throughout the app

## 🎯 Features

- ✅ Direct upload from frontend (no backend upload endpoint needed)
- ✅ Image validation (type and size)
- ✅ Loading state during upload
- ✅ Error handling
- ✅ Automatic draft saving with image URL
- ✅ Works with existing group creation flow

## 🔒 Security Notes

- Upload preset is **unsigned** (anyone with preset name can upload)
- For production, consider:
  - File type restrictions (already implemented)
  - File size limits (10MB max, already implemented)
  - Rate limiting
  - Signed uploads with backend validation

## 📁 Files Modified/Created

### Created:
- `Bet360-API/CLOUDINARY_SETUP.md` - Detailed setup guide
- `Bet360-UI/src/utils/cloudinaryUpload.ts` - Upload utility

### Modified:
- `Bet360-UI/src/screens/main/GroupsPage/CreateGroupPage.tsx` - Added upload functionality
- `Bet360-UI/src/screens/main/GroupsPage/CreateGroupPage.css` - Added upload styles

### No Changes Needed:
- Backend Group model (already has `imageUrl` field)
- Backend Group controller (already accepts `imageUrl`)

## 🚀 Next Steps

1. Set up Cloudinary account (see Step 1 above)
2. Create upload preset (see Step 2 above)
3. Add environment variables (see Step 3 above)
4. Test the upload functionality
5. (Optional) Add image upload to group edit/update functionality

## 📚 Resources

- Cloudinary Dashboard: https://cloudinary.com/console
- Cloudinary Docs: https://cloudinary.com/documentation
- Upload API: https://cloudinary.com/documentation/image_upload_api_reference

