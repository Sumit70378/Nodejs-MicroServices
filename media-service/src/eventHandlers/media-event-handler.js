const Media = require("../models/Media");
const logger = require("../utils/logger");
const { deleteMediaFromCloudinary } = require("../utils/cloudinary"); // Make sure this exists

const handlePostDeleted = async (event) => {
    console.log(event, "event event");
    const { postId, mediaId } = event;

    try {
        const mediaToDelete = await Media.find({ _id: { $in: mediaId } });

        for (const media of mediaToDelete) {
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);
            logger.info(`Deleted Media ${media._id} associated with deleted post ${postId}`);
        }

        logger.info(`Processed deletion of media for post id ${postId}`);
    } catch (e) {
        logger.error(`Error occurred while deleting media for post ${postId}: ${e.message}`, e);
    }
};

module.exports = { handlePostDeleted };
