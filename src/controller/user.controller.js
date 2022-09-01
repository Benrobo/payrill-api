const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class UserControler {
    async transactions(res) {
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT * FROM transaction WHERE (receiver_id = ? OR sender_id = ?)",
                timeout: 40000,
                values: [id, id],
            },
            function (error, results, fields) {
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

    async getCard(res){
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT card_id FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results, fields) {
                const cardId = results[0].card_id;

                let result = await Fetch(
                    "GET",
                    "/v1/issuing/cards/" + cardId
                );

                delete result.body.data.ewallet_contact;
                const card = result.body.data;

                return sendResponse(
                    res,
                    200,
                    true,
                    "User Card",
                    card
                );
            }
        );
    }

    async transferFund(res, payload, recieverId) {
        const { id } = res.user;

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
                let sender, reciever, currency;
                if (results[0].id == id) {
                    sender = results[0].ewallet;
                    currency = results[0].currency;
                    reciever = results[1].ewallet;
                } else {
                    sender = results[1].ewallet;
                    currency = results[1].currency;
                    reciever = results[0].ewallet;
                }
                payload["source_ewallet"] = sender;
                payload["destination_ewallet"] = reciever;
                payload["currency"] = currency;
                console.log(payload);
                try {
                    let result = await Fetch(
                        "POST",
                        "/v1/account/transfer",
                        payload
                    );
                    let status = result.statusCode == 200 ? true : false;
                    return sendResponse(res, 200, true, "", result);
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
    }
}

module.exports = UserControler;
