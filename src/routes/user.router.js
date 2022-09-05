const express = require("express");
const UserControler = require("../controller/user.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const User = new UserControler();

// Get Transactions
Router.post("/transactions", isLoggedIn, (req, res) => {
    User.transactions(res);
});

// Get Virtual Card
Router.get("/card", isLoggedIn, (req, res) => {
    User.getCard(res);
});

// Transfer Funds
Router.post("/transfer/:receiverId", isLoggedIn, (req, res) => {
    const receiverId = req.params.receiverId;
    const payload = req.body;
    User.transferFund(res, payload, receiverId);
});

// Pay
Router.post("/pay", isLoggedIn, (req, res) => {
    const payload = req.body;
    User.pay(res, payload);
});

module.exports = Router;
