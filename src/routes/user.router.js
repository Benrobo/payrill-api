const express = require("express");
const UserControler = require("../controller/user.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const User = new UserControler();

// Get Transactions
Router.get("/transactions", isLoggedIn, (req, res) => {
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

// Get All Users
Router.get("/all", isLoggedIn, (req, res) => {
    User.getAllUsers(res);
});

module.exports = Router;
