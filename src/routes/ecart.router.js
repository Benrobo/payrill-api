const express = require("express");
const EcartControler = require("../controller/ecart.controller");

const Router = express.Router();

const Ecart = new EcartControler();

// Get Ecart
Router.get("/get/:cartId", (req, res) => {
    const payload = req.params.cartId;
    Ecart.getEcart(res, payload);
});

Router.get("/create", (req, res) => {
    Ecart.createEcart(res);
});

Router.post("/add", (req, res) => {
    const payload = req.body;
    Ecart.addToEcart(res, payload);
});

Router.post("/remove", (req, res) => {
    const payload = req.body;
    Ecart.removeFromEcart(res, payload);
});

Router.post("/transfer", (req, res) => {
    const payload = req.body;
    Ecart.transferCart(res, payload);
});

module.exports = Router;