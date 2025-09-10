require("dotenv").config(); 
const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

const uploadMediaToCloudinary = (file)=> {
    return new Promise((resolve,reject)=> {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
            resource_type : "auto"
            },
            (error,result)=>{
                if(error){
                    logger.errror('Error while uploading media to cloudinary',error);
                    reject(error)
                }
                else{
                    resolve(result)
                }
            }
        )
        uploadStream.end(file.buffer)
    });
}

const deleteMediaFromCloudinary = async(publicId)=>{
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        logger.info('Media Deleted successfully from cloud storage',publicId)
        return result
    } catch (e) {
        logger.error("Error deleting the media from cloudinary",e)
        throw e
    }
}

module.exports = {uploadMediaToCloudinary,deleteMediaFromCloudinary}