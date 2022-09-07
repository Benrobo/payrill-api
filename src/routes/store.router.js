const express = require("express");
const StoreControler = require("../controller/store.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Store = new StoreControler();

// Create Store
Router.post("/create", isLoggedIn, (req, res) => {
    const payload = req.body;
    Store.createStore(res, payload);
});

// Get All Stores
Router.get("/all", isLoggedIn, (req, res) => {
    Store.getAllStores(res);
});

module.exports = Router;
