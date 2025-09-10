const Search = require("../models/Search");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `Search post created : ${event.postId} ,${newSearchPost._id.toString()}`
    );
  } catch (e) {
    logger.error(e, `Error Handling Post creation event`);
  }
}

async function handlePostDeleted(event) {
  try {
    const deletedPost = await Search.findOneAndDelete({
      postId: event.postId,
      userId: event.userId,
    });

    if (deletedPost) {
      logger.info(`Search post deleted: ${event.postId}, ${deletedPost._id.toString()}`);
    } else {
      logger.warn(`No search post found to delete for postId: ${event.postId}, userId: ${event.userId}`);
    }
  } catch (e) {
    logger.error(e, `Error handling post deletion event`);
  }
}



module.exports = {handlePostCreated,handlePostDeleted}