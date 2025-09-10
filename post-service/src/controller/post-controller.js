const Post = require("../models/post");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitmq");
const { validateCreatePost } = require("../utils/validation");

// Utility: Clear Redis cache
async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  const keys = await req.redisClient.keys("posts:*");
  await req.redisClient.del(cachedKey);
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

// ✅ Create a new post
const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn(`Validation error: ${error.details[0].message}`);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaId } = req.body;

    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaId,
    });

    await newlyCreatedPost.save();

    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });
    
    await invalidatePostCache(req, newlyCreatedPost._id.toString());

    logger.info("Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newlyCreatedPost,
    });
  } catch (e) {
    logger.error("Error creating post", e);
    res.status(500).json({
      success: false,
      message: "Error creating Post",
    });
  }
};

// ✅ Get all posts
const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const total = await Post.countDocuments();

    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total,
    };

    // ✅ ioredis syntax
    await req.redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

    res.json(result);
  } catch (e) {
    logger.error("Error Fetching posts", e);
    res.status(500).json({
      success: false,
      message: "Error Fetching Posts",
    });
  }
};

// ✅ Get single post
const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    const singlePostDetailsById = await Post.findById(postId);

    if (!singlePostDetailsById) {
      return res.status(404).json({
        message: "Post Not Found",
        success: false,
      });
    }

    // ✅ ioredis syntax
    await req.redisClient.set(
      cacheKey,
      JSON.stringify(singlePostDetailsById),
      "EX",
      3600
    );

    res.json(singlePostDetailsById);
  } catch (e) {
    logger.error("Error Fetching post", e);
    res.status(500).json({
      success: false,
      message: "Error Fetching Post by Id",
    });
  }
};

// ✅ Delete post
const deletePost = async (req, res) => {
  try {
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        message: "Post Not found",
        success: false,
      });
    }

    // publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaId: post.mediaId,
    });

    await invalidatePostCache(req, req.params.id);

    res.json({
      message: "Post Deleted successfully",
      success: true,
    });
  } catch (e) {
    logger.error("Error Deleting post", e);
    res.status(500).json({
      success: false,
      message: "Error Deleting Post",
    });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
};
