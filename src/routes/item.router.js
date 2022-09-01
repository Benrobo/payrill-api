const express = require("express");
const ItemControler = require("../controller/item.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Item = new ItemControler();

// Get Item
Router.get("/get/:itemId", isLoggedIn, (req, res) => {
    const payload = req.params.itemId;
    Item.getItem(res, payload);
});

// Add Item
Router.post("/add", isLoggedIn, (req, res) => {
    const payload = req.body;
    Item.addItem(res, payload);
});

module.exports = Router;