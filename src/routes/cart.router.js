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

<<<<<<< HEAD
=======
// Get ecart items 
Router.get("/get/org/:cartId", isLoggedIn, (req, res) => {
    const payload = req.params.cartId;
    Cart.getEcartForOrg(res, payload);
});

>>>>>>> 40436b1bab4829cdd42fb2fe46fc2a7363f9573c
Router.post("/create", isLoggedIn, (req, res) => {
    const payload = req.body;
    Cart.createEcart(res, payload);
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

Router.post("/pay", isLoggedIn, async (req, res) => {
    const payload = req.body;
    Cart.payForCart(res, payload);
});

module.exports = Router;