const express = require("express");
const TransactionController = require("../controller/transaction.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Transaction = new TransactionController();

Router.post("/all", isLoggedIn, (req, res) => {
    Transaction.getAllTransactions(res);
});

Router.get("/:id", (req, res) => {
    const tranId = req.params.id;
    Transaction.getTransactionById(res, tranId);
});

module.exports = Router;
