const express = require("express");
const ProductController = require("../controller/product.controller");
const isLoggedIn = require("../middlewares/auth");

const Router = express.Router();

const Product = new ProductController();

// Add New Product

Router.post("/add", isLoggedIn, (req, res) => {
    const payload = req.body;
    Product.add(res, payload);
});

// Update Product

Router.post("/update/:product_id", isLoggedIn, (req, res) => {
    const payload = req.body;
    const productId = req.params.product_id;
    Product.update(res, payload, productId);
});

// Remove Product

Router.delete("/delete/:product_id", isLoggedIn, (req, res) => {
    const payload = req.body;
    const productId = req.params.product_id;
    Product.remove(res, payload, productId);
});

// Get All Products

Router.post("/all", isLoggedIn, (req, res) => {
    Product.getAll(res);
});


module.exports = Router;
