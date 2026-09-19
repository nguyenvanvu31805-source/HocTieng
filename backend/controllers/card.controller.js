const cardService = require("../services/card.service");
const {success} = require("../utils/response");

const getCards = async (req, res) => {
  const cards = await cardService.getCards(req.params.setId, req.user);
  return success(res, cards, "Cards retrieved successfully");
};

const createCard = async (req, res) => {
  const card = await cardService.createCard(
    req.params.setId,
    req.user,
    req.body,
  );
  return success(res, card, "Card created successfully", 201);
};

const updateCard = async (req, res) => {
  const card = await cardService.updateCard(req.params.id, req.user, req.body);
  return success(res, card, "Card updated successfully");
};

const deleteCard = async (req, res) => {
  await cardService.deleteCard(req.params.id, req.user);
  return success(res, null, "Card deleted successfully");
};

module.exports = {getCards, createCard, updateCard, deleteCard};
