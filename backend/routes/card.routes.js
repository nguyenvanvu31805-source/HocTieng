const express = require("express");
const cardController = require("../controllers/card.controller");
const asyncHandler = require("../utils/asyncHandler");
const {authenticate} = require("../middleware/auth.middleware");
const {
  optionalAuthenticate,
} = require("../middleware/optional-auth.middleware");

const router = express.Router();

router.get(
  "/study-sets/:setId/cards",
  optionalAuthenticate,
  asyncHandler(cardController.getCards),
);
router.post(
  "/study-sets/:setId/cards",
  authenticate,
  asyncHandler(cardController.createCard),
);
router.put("/cards/:id", authenticate, asyncHandler(cardController.updateCard));
router.patch(
  "/cards/:id",
  authenticate,
  asyncHandler(cardController.updateCard),
);
router.delete(
  "/cards/:id",
  authenticate,
  asyncHandler(cardController.deleteCard),
);

module.exports = router;
