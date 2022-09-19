const { genId, toHash } = require("../helpers");
const { createTransaction } = require("../services/transaction");
const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class UserControler {
    async transactions(res) {
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT * FROM transaction WHERE (receiver_id = ? OR sender_id = ?) ORDER BY createdAt DESC",
                timeout: 40000,
                values: [id, id],
            },
            function (error, results) {
                return sendResponse(
                    res,
                    200,
                    true,
                    "User Transactions",
                    results
                );
            }
        );
    }

    async getAllUsers(res) {
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT id,name,username FROM users WHERE (id != ?)",
                timeout: 40000,
                values: [id],
            },
            function (error, results, fields) {
                return sendResponse(res, 200, true, "All Users", results);
            }
        );
    }

    async pay(res, payload) {
        const { id } = res.user;
        let { type, amount, pin, currency } = payload;

        db.query(
            {
                sql: "SELECT pin, ewallet, currency FROM users WHERE id = ?",
                timeout: 40000,
                values: [id],
            },
            async function (error, results, fields) {
                if (toHash(String(pin)) === results[0].pin) {
                    const ewallet = results[0].ewallet;
                    currency = currency || results[0].currency;
                    let newPayload = {
                        ewallet,
                        currency,
                        amount,
                        metadata: {},
                    };
                    newPayload.metadata.type = type;
                    if (type == "crypto") {
                        newPayload.metadata.crypto = payload.crypto || "";
                        newPayload.metadata.wallet = payload.cryptoAddress || "";
                    }else if(type == "hotel-booking"){
                        newPayload.metadata.address = payload.address || "";
                    }
                    try {
                        let result = await Fetch(
                            "POST",
                            "/v1/account/withdraw",
                            newPayload
                        );
                        let status = result.statusCode == 200 ? true : false;
                        sendResponse(res, 200, true, result.body);
                    } catch (e) {
                        let message = "An Error Occurred";
                        if (e.body.status.error_code == "NOT_ENOUGH_FUNDS") {
                            message = "Insufficient Funds";
                        }
                        sendResponse(res, 400, false, message, e.body || e);
                    }
                } else {
                    sendResponse(res, 400, false, "Incorrect Pin", {});
                }
            }
        );
    }

    async transferFund(res, payload, recieverId) {
        const { id } = res.user;
        let { pin, currency } = payload;

        if (id == recieverId) {
            return sendResponse(
                res,
                400,
                false,
                "Can Not Send Fund to yourself",
                {}
            );
        }
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
                            sql: "SELECT id,ewallet,currency FROM users WHERE id in (?,?) GROUP BY ewallet",
                            timeout: 40000,
                            values: [id, recieverId],
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
                            let sender, reciever;
                            if (results[0].id == id) {
                                sender = results[0].ewallet;
                                currency = currency || results[0].currency;
                                reciever = results[1].ewallet;
                            } else {
                                sender = results[1].ewallet;
                                currency = currency || results[1].currency;
                                reciever = results[0].ewallet;
                            }
                            payload["source_ewallet"] = sender;
                            payload["destination_ewallet"] = reciever;
                            payload["currency"] = currency;
                            payload.metadata = {};
                            payload.metadata.type = "transfer";
                            console.log(payload);
                            try {
                                let result = await Fetch(
                                    "POST",
                                    "/v1/account/transfer",
                                    payload
                                );
                                let status =
                                    result.statusCode == 200 ? true : false;
                                if(status){
                                    // initiate transaction response to credit reciever ewallet account
                                        const transactionResponseBody = {
                                            id: result.body.data?.id,
                                            metadata: {
                                                merchant_defined: "accepted",
                                                type: "transfer"
                                            },
                                            status: 'accept'
                                        };

                                        const transactionResult = await Fetch("POST", "/v1/account/transfer/response", transactionResponseBody);

                                        const tranStatus = transactionResult.statusCode === 200 ? true : false;

                                        if(tranStatus){
                                            return sendResponse(res, 200, true, "Transfer Successful", result.body.data);
                                        }
                                        throw("");
                                }else{
                                    throw("")
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
                    sendResponse(res, 400, false, "Incorrect Pin", {});
                }
            }
        );
    }
}

module.exports = UserControler;
