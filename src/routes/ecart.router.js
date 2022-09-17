const express = require("express");
const EcartControler = require("../controller/ecart.controller");

const Router = express.Router();

const Ecart = new EcartControler();

// Get Ecart
Router.get("/get/:cartId", (req, res) => {
    const payload = req.params.cartId;
    Ecart.getEcart(res, payload);
});

Router.post("/create", (req, res) => {
    const payload = req.body;
    Ecart.createEcart(res, payload);
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
    Ecart.transferEcart(res, payload);
});

Router.post("/pay/:cartId", (req, res) => {
    const payload = req.body;
    const cartId = req.params.cartId;
    Ecart.payForEcart(res, payload, cartId);
});

module.exports = Router;