const express = require("express");
const PaymentController = require("../controller/payment.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Payment = new PaymentController();

// create link
Router.post("/create", isLoggedIn, (req, res) => {
    const payload = req.body;
    Payment.createLinks(res, payload)
})

// get all link
Router.post("/allLinks", isLoggedIn, (req, res) => {
    Payment.getAllLinks(res)
})

// get link by ID
Router.get("/:linkId", (req, res) => {
    const accountId = req.query?.accountId;
    const linkId = req.params.linkId
    Payment.getLinkById(res, linkId, accountId)
})

// disable link
Router.put("/disable", isLoggedIn, (req, res) => {
    const payload = req.body;
    Payment.disableLink(res, payload)
})

// delete link
Router.delete("/delete", isLoggedIn, (req, res) => {
    const payload = req.body;
    Payment.deleteLink(res, payload)
})


module.exports = Router;