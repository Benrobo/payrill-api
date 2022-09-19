const { genHash, compareHash, genId, genUnique } = require("../helpers");
const sendResponse = require("../helpers/response");
const { validateEmail, validatePhonenumber } = require("../utils/validate");
const {
    genAccessToken,
    genRefreshToken,
    verifyToken,
} = require("../helpers/token");
const Fetch = require("../utils/fetch");
const {
    createPersonalWallet,
    createCompanyWallet,
} = require("../config/rapydEndpoints");

const { convertCurrency } = require("../services");
const { createTransaction } = require("../services/transaction");
const { sendMail } = require("../services/mailer");
const db = require("../services/db");
const query = require("../helpers/query");

class WalletController {
    #currencyToSymbol(currency) {
        let all = {
            "USD": "$",
            "CAD": "$",
            "GBP": "£",
            "JPY": "¥",
            "EUR": "€"
        }
        return all[currency] || (currencyToSymbol(currency));
    }

    async addFund(res, payload) {
        try {
            let result = await Fetch(
                "POST",
                "/v1/issuing/bankaccounts/bankaccounttransfertobankaccount",
                payload
            );
            let message = result.statusCode == 200 ? "success" : "failed";
            let status = result.statusCode == 200 ? true : false;
            sendResponse(
                res,
                result.statusCode,
                status,
                message,
                result.body.data
            );
        } catch (e) {
            console.log(e);
            sendResponse(res, 500, false, `Something Went Wrong`, e.body);
        }
    }

    async withdrawFund(res, payload) {
        const { id } = res.user;

        db.query(
            {
                sql: "SELECT * FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results) {
                const ewallet = results[0].ewallet;

                // Add Ewallet to payload
                payload.ewallet = ewallet;
                try {
                    let result = await Fetch(
                        "POST",
                        "/v1/account/withdraw",
                        payload
                    );
                    let message =
                        result.statusCode == 200
                            ? "Funds withdraw successfull"
                            : "Failed to withdraw fund.";
                    let status = result.statusCode == 200 ? true : false;
                    sendResponse(
                        res,
                        result.statusCode,
                        status,
                        message,
                        result.body.data
                    );
                } catch (e) {
                    console.log(e);
                    sendResponse(
                        res,
                        500,
                        false,
                        "An Error occured while withdrawing."
                    );
                }
            }
        );
    }

    async getWallet(res, id) {
        // check if users exists first
        const userId = id || res.user.id;

        db.query(
            {
                sql: "SELECT * FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id.trim()],
            },
            async function (error, results) {
                const ewallet = results[0].ewallet;
                const issuing_id = results[0].issuing_id;
                try {
                    let result = await Fetch("GET", "/v1/user/" + ewallet);
                    let message =
                        result.statusCode == 200
                            ? "wallet retrieved successfully"
                            : "failed to retrieve wallet";
                    let status = result.statusCode == 200 ? true : false;

                    const { country, currency } = results[0];
                    result.body.data.country = country;
                    result.body.data.currency = currency;
                    result.body.data.issuing_id = issuing_id;

                    sendResponse(
                        res,
                        result.statusCode,
                        status,
                        message,
                        result.body.data
                    );
                } catch (e) {
                    console.log(e);
                    sendResponse(
                        res,
                        500,
                        false,
                        "failed to retrieve wallet",
                        {}
                    );
                }
            }
        );
    }

    async getIdType(res, payload) {
        try {
            let result = await Fetch(
                "GET",
                "/v1/identities/types?country=" + payload
            );
            let message =
                result.statusCode == 200
                    ? "ID Types retrieved successfully"
                    : "failed to retrieve ID Types";
            let status = result.statusCode == 200 ? true : false;
            sendResponse(
                res,
                result.statusCode,
                status,
                message,
                result.body.data
            );
        } catch (e) {
            sendResponse(res, 500, false, "Something went wrong", {});
        }
    }

    async webhook(res, payload) {
        console.log(payload);

        const currencyToSymbol = this.#currencyToSymbol;

        if (
            payload.type === "TRANSFER_FUNDS_BETWEEN_EWALLETS_CREATED" &&
            payload.status === "NEW"
        ) {
            const transactionId = payload.id;
            const amount = payload.data.amount;
            const from = payload.data.source_ewallet_id;
            const to = payload.data.destination_ewallet_id;
            const currency = payload.data.currency;
            if(!payload.data.metadata){
                payload.data.metadata = {};
                payload.data.metadata.type = "transfer";
            }
            const type = payload.data.metadata.type;

            db.query(
                {
                    sql: "SELECT id,ewallet,username FROM users WHERE ewallet in (?,?) GROUP BY id",
                    timeout: 40000,
                    values: [from, to],
                },
                async function (error, results) {
                    console.log(error, results);
                    if (results.length != 0) {
                        let sender, receiver, username;
                        if (results[0].ewallet == from) {
                            sender = results[0].id;
                            receiver = results[1].id;
                            username = results[1].username;
                        } else {
                            sender = results[1].id;
                            receiver = results[0].id;
                            username = results[0].username;
                        }
                        if(type == "transfer"){
                            const title = "Transfer to " + username;
                            createTransaction(
                                transactionId,
                                sender,
                                receiver,
                                amount,
                                currency,
                                type,
                                title
                            );

                            let you = await query(
                                "SELECT * FROM users WHERE id = ?",
                                [receiver]
                            );
                            let me = await query(
                                "SELECT * FROM users WHERE id = ?",
                                [sender]
                            );

                            you = you[0];
                            me = me[0];

                            // Send Mail
                            sendMail(
                                you.name,
                                you.email,
                                "Transfer Received",
                                `You just received <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> from <b>${me.name}</b>`
                            );

                            sendMail(
                                me.name,
                                me.email,
                                "Transfer Sent",
                                `You just sent <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> to <b>${you.name}</b>`
                            );
                        }else if(type == "refund"){
                            const title = "Refund to " + username;
                            createTransaction(
                                transactionId,
                                sender,
                                receiver,
                                amount,
                                currency,
                                type,
                                title
                            );

                            let you = await query(
                                "SELECT * FROM users WHERE id = ?",
                                [receiver]
                            );
                            let me = await query(
                                "SELECT * FROM users WHERE id = ?",
                                [sender]
                            );

                            you = you[0];
                            me = me[0];

                            // Send Mail
                            sendMail(
                                you.name,
                                you.email,
                                "Refund Received",
                                `You just received <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> from <b>${me.name}</b>`
                            );

                            sendMail(
                                me.name,
                                me.email,
                                "Refund Sent",
                                `You just sent <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> to <b>${you.name}</b>`
                            );
                        }
                    }
                }
            );
        } else if (
            payload.type === "ISSUING_DEPOSIT_COMPLETED" &&
            payload.status === "NEW"
        ) {
            // Bank Account Deposit
            const transactionId = payload.id;
            const amount = payload.data.amount;
            const ewallet = payload.data.ewallet;
            const currency = payload.data.currency;
            const beneficiary = payload.data.bank_account.beneficiary_name;
            const type = "deposit";
            const title = "Deposit From " + beneficiary;

            if (amount == 0) {
                return;
            }

            db.query(
                {
                    sql: "SELECT * FROM users WHERE (ewallet = ?)",
                    timeout: 40000,
                    values: [ewallet],
                },
                function (error, results) {
                    if (results.length != 0) {
                        let receiver = results[0].id;
                        let sender = "";
                        let me = results[0];

                        createTransaction(
                            transactionId,
                            sender,
                            receiver,
                            amount,
                            currency,
                            type,
                            title
                        );

                        sendMail(
                            me.name,
                            me.email,
                            "Deposit Received",
                            `You just deposited <b>${
                                currencyToSymbol(currency) + amount
                            }</b> to your account from <b>${beneficiary}</b>`
                        );
                    }
                }
            );
        } else if (
            payload.type === "EWALLET_REMOVED_FUNDS" &&
            payload.status === "NEW"
        ) {
            const transactionId = payload.id;
            const amount = Math.abs(payload.data.last_transaction_amount);
            const ewallet = payload.data.id;
            const currency = payload.data.last_transaction_currency;
            const type = payload.data.metadata.type;
            let wallet = "";
            let crypto = "";
            let address = "";

            if (type == "crypto") {
                crypto = payload.data.metadata.crypto;
                wallet = payload.data.metadata.wallet;
            } else if (type == "hotel-booking") {
                address = payload.data.metadata.address;
            }

            db.query(
                {
                    sql: "SELECT * FROM users WHERE (ewallet = ?)",
                    timeout: 40000,
                    values: [ewallet],
                },
                function (error, results) {
                    if (results.length != 0) {
                        let receiver = results[0].id;
                        let me = results[0];
                        let sender = "";

                        if (type == "crypto") {
                            createTransaction(
                                transactionId,
                                sender,
                                receiver,
                                amount,
                                currency,
                                type,
                                "Purchased " + crypto
                            );

                            sendMail(
                                me.name,
                                me.email,
                                "Crypto Purchase",
                                `You just purchased <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> worth of <b>${crypto}</b> to the wallet <b>${wallet}</b>`
                            );
                        } else if (type == "hotel-booking") {
                            createTransaction(
                                transactionId,
                                sender,
                                receiver,
                                amount,
                                currency,
                                type,
                                "Booked a hotel"
                            );

                            sendMail(
                                me.name,
                                me.email,
                                "Hotel Booked",
                                `You just booked a hotel for <b>${
                                    currencyToSymbol(currency) + amount
                                }</b> at <b>${address}</b>`
                            );
                        }
                    }
                }
            );
        } else if (
            payload.type === "PAYMENT_COMPLETED" &&
            payload.status === "NEW"
        ) {
            const transactionId = payload.id;
            const amount = payload.data.amount;
            const ewallet = payload.data.ewallet_id;
            const currency = payload.data.currency_code;
            const ending = payload.data.payment_method_data.last4;
            const sender = payload.data.payment_method_data.name;
            const type = payload.data.metadata.type;

            if(type == "cart_payment"){
                try {
                    const result = await query("SELECT * FROM users WHERE ewallet = ?", [ewallet]);
                    if(result.length != 0){
                        let me = result[0];

                        // Create Transaction
                        createTransaction(
                            transactionId,
                            sender,
                            me.id,
                            amount,
                            currency,
                            "card_in",
                            "Payment from Card ending with " + ending
                        );

                        // Send Mail
                        sendMail(
                            me.name,
                            me.email,
                            "Card Payment",
                            `You just received <b>${
                                currencyToSymbol(currency) + amount
                            }</b> from card ending with <b>${ending}</b>`
                        );
                    }
                } catch (error) {
                    
                }
            }
        }

        sendResponse(res, 200, true, "Webhook Endpoint", {});
    }
}

module.exports = WalletController;
