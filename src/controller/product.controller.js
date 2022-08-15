const { User, Wallets, Accounts, Transactions, Products } = require("../model");
const { genHash, compareHash, genId, genUnique } = require("../helpers");
const sendResponse = require("../helpers/response");

class ProductController {
    async add(res, payload) {
        const { id } = res.user;
        payload.id = genId();
        payload.userId = id;
        payload.createdAt = Date.now();

        try {
            const addProduct = await Products.create(payload);
            sendResponse(
                res,
                200,
                true,
                "Product Added Successfully",
                addProduct
            );
        } catch (e) {
            sendResponse(res, 500, true, "Failed To Add Product", e);
        }
    }

    async update(res, payload, productId) {
        const { id } = res.user;

        payload.id = productId;
        payload.userId = id;

        try {
            const updateProduct = await Products.updateOne(
                { userId: id, id: productId },
                payload
            );
            sendResponse(
                res,
                200,
                true,
                "Product Updated Successfully",
                updateProduct
            );
        } catch (e) {
            sendResponse(res, 500, true, "Failed To Update Product", e);
        }
    }

    async remove(res, payload, productId) {
        const { id } = res.user;

        payload.id = productId;
        payload.userId = id;

        try {
            const deleteProduct = await Products.deleteOne({
                userId: id,
                id: productId,
            });
            sendResponse(
                res,
                200,
                true,
                "Product removed Successfully",
                deleteProduct
            );
        } catch (e) {
            sendResponse(res, 500, false, "Failed To Delete Product", e);
        }
    }

    async getAll(res) {
        const { id } = res.user;
        try {
            const allProducts = await Products.find({ userId: id });
            sendResponse(
                res,
                200,
                true,
                "Products Retrieved Successfully",
                allProducts
            );
        } catch (e) {
            sendResponse(res, 500, false, "Failed To Get Products", e);
        }
    }
}

module.exports = ProductController;
