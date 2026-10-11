import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

import fs from "fs";
const envPath = fs.existsSync("./server/.env") ? "./server/.env" : "./.env";
dotenv.config({ path: envPath });


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "lumina-commerce/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    // No server-side transformations — client compresses before upload
    // so we serve the raw file to avoid burning Cloudinary credits
  },
});

// Create multer upload instance
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
  fileFilter: (req, file, cb) => {
    console.log("Multer receiving file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });
    
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      console.warn("Multer rejected file (invalid mimetype):", file.mimetype);
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Utility function to delete image from Cloudinary
export const deleteImage = async (imageUrl) => {
  try {
    // Extract public_id from Cloudinary URL
    const urlParts = imageUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const publicIdWithoutExt = fileName.split(".")[0];
    const folderPath = urlParts.slice(-2, -1)[0];
    const publicId = `${folderPath}/${publicIdWithoutExt}`;

    await cloudinary.uploader.destroy(publicId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return { success: false, error: error.message };
  }
};

export default cloudinary;
