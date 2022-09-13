const sendResponse = require("../helpers/response");
const { genId, toHash } = require("../helpers");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class CartControler {
    #calculateItems(cartId) {
        return new Promise((resolve) => {
            db.query(
                {
                    sql: "SELECT * FROM checkout WHERE (ecart_id = ?)",
                    timeout: 40000,
                    values: [cartId],
                },
                function (error, results) {
                    const items = results;
                    let total = 0;
                    items.forEach(item => {
                        total += item.item_price * item.item_quantity;
                    });
                    resolve(total);
                }
            );
        });
    }

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
                    let ecarts = results;
                    const storeId = ecarts[0]?.store_id;

                    // Get Store Info
                    db.query(
                        {
                            sql: "SELECT * FROM stores WHERE (id = ?)",
                            timeout: 40000,
                            values: [storeId],
                        },
                        function (error, results, fields) {
                            const store = results[0];
                            const data = { ecarts, store };

                            return sendResponse(
                                res,
                                200,
                                true,
                                "Fetched All Ecart",
                                data
                            );
                        }
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
                    const storeId = ecart.store_id;
                    db.query(
                        {
                            sql: "SELECT * FROM checkout WHERE (ecart_id = ?)",
                            timeout: 40000,
                            values: [cartId],
                        },
                        function (error, results, fields) {
                            ecart.items = results;

                            // Get Store Info
                            db.query(
                                {
                                    sql: "SELECT * FROM stores WHERE (id = ?)",
                                    timeout: 40000,
                                    values: [storeId],
                                },
                                function (error, results, fields) {
                                    const store = results[0];
                                    ecart.store = store;

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
            );
        }
    }

    async payForCart(res, payload) {
        const { id } = res.user;
        const { ecartId, pin } = payload;
        const self = this;

        db.query(
            {
                sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
                timeout: 40000,
                values: [ecartId, id],
            },
            async function (error, results) {
                if (results.length == 0) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Access to Cart Denied or Cart Not Found",
                        {}
                    );
                }

                const ecart = results[0];
                if (ecart.paid === "false" && ecart.confirmed === "false") {
                    // Init Payment
                    const storeId = ecart.store_id;
                    const amount = await self.#calculateItems(ecartId);

                    db.query(
                        {
                            sql: "SELECT pin, ewallet, currency FROM users WHERE id = ?",
                            timeout: 40000,
                            values: [id],
                        },
                        async function (error, results, fields) {
                            if (toHash(String(pin)) === results[0].pin) {
                                db.query(
                                    {
                                        sql: "SELECT id,ewallet,currency FROM users WHERE id in (?,?)",
                                        timeout: 40000,
                                        values: [id, storeId],
                                    },
                                    async function (error, results, fields) {
                                        if (results.length == 0) {
                                            return sendResponse(
                                                res,
                                                400,
                                                false,
                                                "An Error Occured",
                                                {}
                                            );
                                        }

                                        let sender, reciever, currency;

                                        if (results[1]?.id == id) {
                                            sender = results[1].ewallet;
                                            currency = results[1].currency;
                                            reciever = results[0].ewallet;
                                            // sender = results[0].ewallet;
                                            // currency =
                                            //     currency || results[0].currency;
                                            // reciever = results[1].ewallet;
                                        } else {
                                            // sender = results[1].ewallet;
                                            sender = results[0].ewallet;
                                            currency = results[0].currency;
                                            reciever = results[1].ewallet;
                                            // currency =
                                            //     currency || results[1].currency;
                                            // reciever = results[0].ewallet;
                                        }
                                        payload["source_ewallet"] = sender;
                                        payload["destination_ewallet"] =
                                            reciever;
                                        payload["currency"] = currency;
                                        payload["amount"] = amount;
                                        delete payload["ecartId"];

                                        // console.log(payload);
                                        try {
                                            let result = await Fetch(
                                                "POST",
                                                "/v1/account/transfer",
                                                payload
                                            );
                                            let status =
                                                result.statusCode == 200
                                                    ? true
                                                    : false;
                                            if (status) {
                                                db.query(
                                                    {
                                                        sql: "UPDATE ecart SET paid = ?, amount = ? WHERE (user_id = ? AND store_id = ? AND id = ?)",
                                                        timeout: 40000,
                                                        values: [
                                                            true,
                                                            amount,
                                                            id,
                                                            storeId,
                                                            ecartId,
                                                        ],
                                                    },
                                                    async function (
                                                        error,
                                                        results
                                                    ) {
                                                        console.log(result.body.data)

                                                        // initiate transaction response to credit reciever ewallet account
                                                        const transactionResponseBody = {
                                                            id: result.body.data?.id,
                                                            metadata: {
                                                                merchant_defined: "accepted"
                                                            },
                                                            status: 'accept'
                                                        };

                                                        const transactionResult = await Fetch("POST", "/v1/account/transfer/response", transactionResponseBody);

                                                        const tranStatus = transactionResult.statusCode === 200 ? true : false;

                                                        if (tranStatus) {
                                                            return sendResponse(
                                                                res,
                                                                200,
                                                                true,
                                                                "Payment Successful",
                                                                { ...result.body.data, ecartId }
                                                            );
                                                        }
                                                    }
                                                );
                                            }
                                        } catch (e) {
                                            console.log(e);
                                            return sendResponse(
                                                res,
                                                400,
                                                false,
                                                "An Error Occured",
                                                e.body
                                            );
                                        }
                                    }
                                );
                            } else {
                                sendResponse(
                                    res,
                                    400,
                                    false,
                                    "Incorrect Pin",
                                    {}
                                );
                            }
                        }
                    );
                } else {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Ecart Already Paid For!",
                        {}
                    );
                }
            }
        );
    }

    async refundCart(res, payload) {
        const { id } = res.user;
        const { ecartId } = payload;

        db.query(
            {
                sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
                timeout: 40000,
                values: [ecartId, id],
            },
            async function (error, results) {
                if (results.length == 0) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Access to Cart Denied or Cart Not Found",
                        {}
                    );
                }

                const ecart = results[0];
                if (ecart.paid === "true" && ecart.confirmed == "false") {
                    // Init Refund
                    const storeId = ecart.store_id;
                    const amount = ecart.amount;

                    db.query(
                        {
                            sql: "SELECT id,ewallet,currency FROM users WHERE id in (?,?) GROUP BY ewallet",
                            timeout: 40000,
                            values: [id, storeId],
                        },
                        async function (error, results, fields) {
                            if (results.length == 0) {
                                return sendResponse(
                                    res,
                                    400,
                                    false,
                                    "An Error Occured",
                                    {}
                                );
                            }
                            let sender, reciever, currency;
                            if (results[0].id == id) {
                                sender = results[1].ewallet;
                                currency = currency || results[1].currency;
                                reciever = results[0].ewallet;
                            } else {
                                sender = results[0].ewallet;
                                currency = currency || results[0].currency;
                                reciever = results[1].ewallet;
                            }
                            payload["source_ewallet"] = sender;
                            payload["destination_ewallet"] = reciever;
                            payload["currency"] = currency;
                            payload["amount"] = amount;
                            delete payload["ecartId"];

                            console.log(payload);
                            try {
                                let result = await Fetch(
                                    "POST",
                                    "/v1/account/transfer",
                                    payload
                                );
                                let status =
                                    result.statusCode == 200 ? true : false;
                                if (status) {
                                    db.query(
                                        {
                                            sql: "UPDATE ecart SET paid = ?, amount = ? WHERE (user_id = ? AND store_id = ? AND id = ?)",
                                            timeout: 40000,
                                            values: [
                                                "false",
                                                0,
                                                id,
                                                storeId,
                                                ecartId,
                                            ],
                                        },
                                        async function (error, results) {
                                            return sendResponse(
                                                res,
                                                200,
                                                true,
                                                "Refunded",
                                                result.body.data
                                            );
                                        }
                                    );
                                }
                            } catch (e) {
                                console.log(e);
                                return sendResponse(
                                    res,
                                    400,
                                    false,
                                    "An Error Occured",
                                    e.body
                                );
                            }
                        }
                    );
                } else {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Can Not Refund Ecart",
                        {}
                    );
                }
            }
        );
    }

    async transferCart(res, payload) {
        const { id } = res.user;
        const { cartId, pin, to } = payload;

        if (pin == undefined) {
            sendResponse(res, 400, false, "Pin required", {});
        }

        db.query(
            {
                sql: "SELECT * FROM ecart WHERE (id = ? AND user_id = ?)",
                timeout: 40000,
                values: [cartId, id],
            },
            function (error, results) {
                if (results.length == 0) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "Access to Cart Denied or Cart Not Found",
                        {}
                    );
                }

                db.query(
                    {
                        sql: "SELECT pin FROM users WHERE id = ?",
                        timeout: 40000,
                        values: [id],
                    },
                    function (error, results, fields) {
                        if (toHash(String(pin)) === results[0].pin) {
                            db.query(
                                {
                                    sql: "UPDATE ecart SET user_id = ? WHERE (id = ? AND user_id = ?)",
                                    timeout: 40000,
                                    values: [to, cartId, id],
                                },
                                function (error, results) {
                                    sendResponse(
                                        res,
                                        200,
                                        true,
                                        "Cart Transfered",
                                        {}
                                    );
                                }
                            );
                        } else {
                            sendResponse(res, 400, false, "Incorrect Pin", {});
                        }
                    }
                );
            }
        );
    }

    async createEcart(res, payload) {
        const { id } = res.user;
        const { name } = payload;
        const cartId = genId();
        db.query(
            {
                sql: "INSERT INTO ecart(id,user_id,name) VALUES(?,?,?)",
                timeout: 40000,
                values: [cartId, id, name],
            },
            function (error, results, fields) {
                if (error) {
                    console.log(error);
                    return sendResponse(
                        res,
                        400,
                        true,
                        "Error Creating Ecart",
                        {}
                    );
                }
                return sendResponse(res, 200, true, "Ecart Created", {
                    ecart: cartId,
                    userId: id,
                    name,
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
                                    values: [newQuantity, itemId],
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

        if (quantity === undefined) {
            quantity = 1;
        }

        if (quantity == 0) {
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
                                        if (
                                            item.item_quantity <
                                            Number(quantity)
                                        ) {
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
