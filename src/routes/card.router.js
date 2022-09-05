const express = require("express");
const CardControler = require("../controller/card.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Card = new CardControler();

// Get Default Virtual Card
Router.get("/default", isLoggedIn, (req, res) => {
    Card.getCard(res);
});

// Get All Virtual Card
Router.get("/cards", isLoggedIn, (req, res) => {
    Card.getAllCards(res);
});

// Create Virtual Card
Router.post("/create", isLoggedIn, (req, res) => {
    const payload = req.body;
    Card.createCard(res, payload);
});

Router.get("/status/:card/:status", isLoggedIn, (req, res) => {
    const card = req.params.card;
    const status = req.params.status;
    const payload = { card, status };
    Card.changeCardStatus(res, payload);
});

module.exports = Router;
