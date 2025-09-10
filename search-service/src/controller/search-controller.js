const logger = require("../utils/logger");
const Search = require("../models/Search");


//oimplemnet redis cache
const searchPostController = async (req, res) => {
  logger.info("Search EndPoint hit");
  try {
    const { query } = req.query;
    const results = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);
     
      res.json(results)

  } catch (e) {
    logger.warn(`Error while Searching Post: ${e.details[0].message}`);
    return res.status(400).json({
      success: false,
      message: e.details[0].message,
    });
  }
};

module.exports = {searchPostController}