const express = require("express");
const CartControler = require("../controller/cart.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Cart = new CartControler();

// Get Ecart
Router.get("/get/:cartId", isLoggedIn, (req, res) => {
    const payload = req.params.cartId;
    Cart.getEcart(res, payload);
});

Router.get("/create", isLoggedIn, (req, res) => {
    Cart.createEcart(res);
});

Router.post("/add", isLoggedIn, (req, res) => {
    const payload = req.body;
    Cart.addToEcart(res, payload);
});

Router.post("/remove", isLoggedIn, (req, res) => {
    const payload = req.body;
    Cart.removeFromEcart(res, payload);
});

Router.post("/transfer", isLoggedIn, (req, res) => {
    const payload = req.body;
    Cart.transferCart(res, payload);
});

Router.post("/refund", isLoggedIn, (req, res) => {
    const payload = req.body;
    Cart.refundCart(res, payload);
});

module.exports = Router;