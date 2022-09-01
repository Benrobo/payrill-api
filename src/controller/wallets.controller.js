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

class WalletController {
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
        const userId = res.user.id;

        if (id !== userId)
            return sendResponse(
                res,
                404,
                false,
                "failed to retrieve wallet: user not found."
            );

        db.query(
            {
                sql: "SELECT * FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results) {
                const ewallet = results[0].ewallet;
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

        // Identity Verification
        if (
            payload.type === "TRANSFER_FUNDS_BETWEEN_EWALLETS_CREATED" &&
            payload.status === "NEW"
        ) {
            const transactionId = payload.id;
            const amount = payload.data.amount;
            const from = payload.data.source_ewallet_id;
            const to = payload.data.destination_ewallet_id;
            const currency = payload.data.currency;
            const type = "transfer";

            db.query(
                {
                    sql: "SELECT id,ewallet,username FROM users WHERE ewallet in (?,?) GROUP BY id",
                    timeout: 40000,
                    values: [from,to],
                },
                function (error, results) {
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
                        const title = "Transfer to " + username;

                        createTransaction(transactionId,sender,receiver,amount,currency,type,title);
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

            db.query(
                {
                    sql: "SELECT id FROM users WHERE (ewallet = ?)",
                    timeout: 40000,
                    values: [ewallet],
                },
                function (error, results) {
                    if (results.length != 0) {
                        let receiver = results[0].id;
                        let sender = "";

                        createTransaction(
                            transactionId,
                            sender,
                            receiver,
                            amount,
                            currency,
                            type,
                            title
                        );
                    }
                }
            );
        } else if (
            payload.type === "BENEFICIARY_CREATED" &&
            payload.status === "NEW"
        ) {
            const beneficiaryId = payload.data.id;
            const merchantId = payload.data.merchant_reference_id;
            let { tranId, payout } = await Refund.findOne({
                merchantId,
            });
            const { userId, paid, totalAmount, currency, country } =
                await Transactions.findOne({
                    id: tranId,
                });
            const { currency: sellerCurrency, country: sellerCountry } =
                await User.findOne({
                    id: userId,
                });
            const { wId } = await Wallets.findOne({
                userId,
            });

            try {
                // Create Sender
                const senderPayload = {
                    country: sellerCountry,
                    currency: sellerCurrency,
                    entity_type: "company",
                    company_name: "RayPal",
                    payment_type: "priority",
                    identification_type: "company registered number",
                    identification_value: "10207686",
                    // phone_number: "442037443095",
                    occupation: "transportation",
                    source_of_income: "business",
                    // date_of_birth: "31/07/1984",
                    // address: "123 Main Street London",
                    purpose_code: "refund",
                    beneficiary_relationship: "client",
                };
                const result = await Fetch(
                    "POST",
                    "/v1/payouts/sender",
                    senderPayload
                );
                const senderId = result.body.data.id;
                const refundAmount = Number(paid) - Number(totalAmount);
                payout = payout || "us_general_bank";
                console.log(payout);

                // Create Payout
                const payoutPayload = {
                    ewallet: wId,
                    payout_amount: refundAmount,
                    // payout_method_type: payout,
                    sender_currency: sellerCurrency,
                    sender_country: sellerCountry,
                    beneficiary_country: country,
                    payout_currency: currency,
                    sender_entity_type: "company",
                    payment_type: "priority",
                    beneficiary_entity_type: "individual",
                    beneficiary: beneficiaryId,
                    sender: senderId,
                    confirm_automatically: true,
                    description: "Refund from RayPal",
                };
                const res = await Fetch("POST", "/v1/payouts", payoutPayload);
                console.log(res);
            } catch (e) {
                console.log(e);
            }
        } else if (
            payload.type === "PAYOUT_FAILED" &&
            payload.status === "NEW"
        ) {
            const merchantId = payload.data.beneficiary.merchant_reference_id;
            let { tranId } = await Refund.findOne({
                merchantId,
            });
            const { name, email, paid, totalAmount, currency } =
                await Transactions.findOne({
                    id: tranId,
                });
            sendMail(
                name,
                email,
                "Refund Failed",
                `
                Your Refund Request of <b>${
                    paid - totalAmount
                } ${currency}</b> has failed.<br>
                Contact The merchant to get your refund manually.<br>
                Thanks for using RayPal.<br>
            `
            );
        }

        sendResponse(res, 200, true, "Webhook Endpoint", {});
    }
}

module.exports = WalletController;
