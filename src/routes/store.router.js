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

// Get store by subdomain (auth require)
Router.get("/byDomain/:subdomain", isLoggedIn, (req, res) => {
    const { subdomain } = req.params
    Store.getStoreByDomain(res, true, subdomain);
});

// Get store by subdomain (auth not required)
Router.get("/:subdomain", (req, res) => {
    const { subdomain } = req.params
    Store.getStoreByDomain(res, false, subdomain);
});

module.exports = Router;
