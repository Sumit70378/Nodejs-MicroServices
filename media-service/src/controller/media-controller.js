const logger = require("../utils/logger");
const { uploadMediaToCloudinary } = require("../utils/cloudinary");
const Media = require("../models/Media"); // ✅ import your mongoose model

const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");
  try {
    logger.info(JSON.stringify(req.file, null, 2)); // ✅ better logging

    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again",
      });
    }

    // ✅ use correct multer field names
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`file details : name=${originalname}, type=${mimetype}`);
    logger.info("Uploading to cloudinary starting..");

    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `Cloudinary upload successful. Public Id: ${cloudinaryUploadResult.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult.secure_url,
      userId,
    });

    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media uploaded successfully",
    });
  } catch (e) {
    logger.error("Error uploading file", e);
    res.status(500).json({
      success: false,
      message: "Error uploading file",
    });
  }
};
const getAllmedias = async(req,res)=>{
  try {
     const result= await Media.find({});
     res.json({result})
  } catch (e) {
     logger.error("Error Fetching files", e);
    res.status(500).json({
      success: false,
      message: "Error Fetching files",
    });
  }
}
module.exports = { uploadMedia,getAllmedias };
