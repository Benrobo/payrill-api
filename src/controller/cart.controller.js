const sendResponse = require("../helpers/response");
const { genId } = require("../helpers");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class CartControler {
    async getEcart(res, payload) {
        const { id } = res.user;
        const cartId = payload;
        if (cartId === "all") {
            // Get All Ecart for this user
            db.query(
                {
                    sql: "SELECT * FROM ecart WHERE (user_id = ?)",
                    timeout: 40000,
                    values: [id],
                },
                function (error, results, fields) {
                    return sendResponse(
                        res,
                        200,
                        true,
                        "Fetched All Ecart",
                        results
                    );
                }
            );
        } else {
            db.query(
                {
                    sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
                    timeout: 40000,
                    values: [cartId, id],
                },
                function (error, results, fields) {
                    if (results.length == 0) {
                        return sendResponse(
                            res,
                            400,
                            false,
                            "Ecart Not Found or Access to Ecart denied",
                            results[0]
                        );
                    }
                    let ecart = results[0];
                    db.query(
                        {
                            sql: "SELECT * FROM checkout WHERE (ecart_id = ?)",
                            timeout: 40000,
                            values: [cartId],
                        },
                        function (error, results, fields) {
                            ecart.items = results;
                            return sendResponse(
                                res,
                                200,
                                true,
                                "Ecart Fetched",
                                ecart
                            );
                        }
                    );
                }
            );
        }
    }

    async createEcart(res) {
        const { id } = res.user;
        const cartId = genId();
        db.query(
            {
                sql: "INSERT INTO ecart(id,user_id) VALUES(?,?)",
                timeout: 40000,
                values: [cartId, id],
            },
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                    return sendResponse(
                        res,
                        200,
                        true,
                        "Error Creating Ecart",
                        {}
                    );
                }
                return sendResponse(res, 200, true, "Ecart Created", {
                    ecart: cartId,
                    userId: id,
                });
            }
        );
    }

    async removeFromEcart(res, payload) {
        const { id } = res.user;
        const { cartId, itemId } = payload;

        db.query(
            {
                sql: "SELECT * FROM ecart WHERE (id = ?)",
                timeout: 40000,
                values: [cartId],
            },
            function (error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 400, false, "Cart Not Found", {});
                }
                const ecart = results[0];
                if (ecart.user_id !== id) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Access To Cart Denied",
                        {}
                    );
                }
                if (ecart.paid === "true") {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "You can not remove items from this Cart!",
                        {}
                    );
                }

                db.query(
                    {
                        sql: "SELECT * FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                        timeout: 40000,
                        values: [cartId, itemId],
                    },
                    function (error, results, fields) {
                        if (results.length == 0) {
                            return sendResponse(
                                res,
                                200,
                                true,
                                "Item Removed From Cart!",
                                {}
                            );
                        }
                        const checkoutItem = results[0];
                        const quantity = checkoutItem.item_quantity;

                        db.query(
                            {
                                sql: "SELECT * FROM store_items WHERE (id = ?)",
                                timeout: 40000,
                                values: [itemId],
                            },
                            function (error, results, fields) {
                                const item = results[0];
                                const newQuantity =
                                    quantity + item.item_quantity;

                                db.query({
                                    sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                                    timeout: 40000,
                                    values: [newQuantity,itemId],
                                });
                            }
                        );

                        db.query(
                            {
                                sql: "DELETE FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                                timeout: 40000,
                                values: [cartId, itemId],
                            },
                            function (error, results, fields) {
                                return sendResponse(
                                    res,
                                    200,
                                    true,
                                    "Item Removed From Cart!",
                                    {}
                                );
                            }
                        );
                    }
                );
            }
        );
    }

    async addToEcart(res, payload) {
        const { id } = res.user;
        let { cartId, itemId, quantity } = payload;

        if(quantity === undefined){
            quantity = 1;
        }

        if(quantity == 0){
            return this.removeFromEcart(res, payload);
        }

        db.query(
            {
                sql: "SELECT * FROM ecart WHERE (id = ?)",
                timeout: 40000,
                values: [cartId],
            },
            function (error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 400, false, "Cart Not Found", {});
                }
                const ecart = results[0];
                let storeId = ecart.store_id;
                if (ecart.user_id !== id) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Access To Cart Denied",
                        {}
                    );
                }
                if (ecart.paid === "true") {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "You can not add items to this Cart!",
                        {}
                    );
                }

                db.query(
                    {
                        sql: "SELECT * FROM store_items WHERE (id = ?) LIMIT 1",
                        timeout: 40000,
                        values: [itemId],
                    },
                    function (error, results, fields) {
                        if (results.length != 0) {
                            const item = results[0];
                            if (!storeId) {
                                storeId = item.store_id;
                                db.query({
                                    sql: "UPDATE ecart SET store_id = ? WHERE (id = ?)",
                                    values: [storeId, cartId],
                                });
                            }
                            if (storeId !== item.store_id) {
                                return sendResponse(
                                    res,
                                    400,
                                    false,
                                    "You can not add this item to this cart!",
                                    {}
                                );
                            }
                            if (item.item_quantity == 0) {
                                return sendResponse(
                                    res,
                                    400,
                                    false,
                                    "Item is out of stock!",
                                    {}
                                );
                            }
                            // Check if item is already in cart and just update the quantity
                            db.query(
                                {
                                    sql: "SELECT * FROM checkout WHERE (ecart_id = ? AND item_id = ?)",
                                    timeout: 40000,
                                    values: [cartId, itemId],
                                },
                                function (error, results) {
                                    if (results.length == 0) {
                                        if (item.item_quantity < Number(quantity)) {
                                            return sendResponse(
                                                res,
                                                400,
                                                false,
                                                `There is only ${item.item_quantity} left`,
                                                {}
                                            );
                                        }
                                        db.query(
                                            {
                                                sql: "INSERT INTO checkout(ecart_id,item_id,item_name,item_price,item_quantity,item_currency,item_image) VALUES(?,?,?,?,?,?,?)",
                                                timeout: 40000,
                                                values: [
                                                    cartId,
                                                    itemId,
                                                    item.item_name,
                                                    item.item_price,
                                                    quantity,
                                                    item.item_currency,
                                                    item.item_image,
                                                ],
                                            },
                                            function (error, results) {
                                                // Update Item Quantity in store
                                                const newQuantity =
                                                    item.item_quantity -
                                                    Number(quantity);
                                                db.query({
                                                    sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                                                    timeout: 40000,
                                                    values: [
                                                        newQuantity,
                                                        itemId,
                                                    ],
                                                });
                                                return sendResponse(
                                                    res,
                                                    200,
                                                    true,
                                                    "Item Added to Cart",
                                                    {}
                                                );
                                            }
                                        );
                                    } else {
                                        let checkoutItem = results[0];
                                        let oldQuantity = item.item_quantity;
                                        let newQuantity =
                                            checkoutItem.item_quantity +
                                            oldQuantity -
                                            Number(quantity);
                                        if (newQuantity < 0) {
                                            return sendResponse(
                                                res,
                                                400,
                                                false,
                                                `There is only ${item.item_quantity} left`,
                                                {}
                                            );
                                        }
                                        db.query(
                                            {
                                                sql: "UPDATE checkout SET item_quantity = ? WHERE (ecart_id = ? AND item_id = ?)",
                                                timeout: 40000,
                                                values: [
                                                    quantity,
                                                    cartId,
                                                    itemId,
                                                ],
                                            },
                                            function (error, results) {
                                                // Update Item Quantity in store
                                                db.query({
                                                    sql: "UPDATE store_items SET item_quantity = ? WHERE (id = ?)",
                                                    timeout: 40000,
                                                    values: [
                                                        newQuantity,
                                                        itemId,
                                                    ],
                                                });
                                                return sendResponse(
                                                    res,
                                                    200,
                                                    true,
                                                    "Item Added to Cart",
                                                    {}
                                                );
                                            }
                                        );
                                    }
                                }
                            );
                        } else {
                            return sendResponse(
                                res,
                                400,
                                false,
                                "Item Not Found!",
                                {}
                            );
                        }
                    }
                );
            }
        );
    }
}

module.exports = CartControler;
