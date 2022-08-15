const {
    User,
    Wallets,
    Accounts,
    Transactions,
    Products,
    PaymentLinks,
    Refund,
} = require("../model");
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
const { sendMail } = require("../services/mailer");
class WalletController {
    async #recalculateTransaction(paymentLinkId, tranId, transactions) {
        let amount = 0;
        transactions.forEach(function (transaction) {
            amount += transaction.amount;
        });

        await Transactions.updateOne(
            { id: tranId, linkId: paymentLinkId },
            { paid: amount }
        );
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
        const { wId } = await Wallets.findOne({ userId: id });

        // Add Ewallet to payload
        payload.ewallet = wId;

        if (wId) {
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
        } else {
            sendResponse(res, 400, false, "Error Getting Ewallet", {});
        }
    }

    async createAccount(res, payload, paymentLinkId, paymentCookie) {
        if (!paymentLinkId) {
            return sendResponse(res, 500, false, "Invalid Payment Link id", {});
        }

        try {
            // Verify Payment Link and Get Price
            let paymentPrice;
            let country;
            let userId = null;
            let currency = "USD"; // Default

            try {
                const payLink = await PaymentLinks.findOne({
                    id: paymentLinkId,
                });
                if (!payLink) {
                    return sendResponse(
                        res,
                        500,
                        false,
                        "Payment Link Not Found",
                        {}
                    );
                }

                // Get Data From Payment Link
                userId = payLink.userId;

                let { currency } = await User.findOne({ id: userId });

                payload.currency =
                    typeof payload.currency === "undefined"
                        ? currency
                        : payload.currency;
                payload.country =
                    typeof payload.country === "undefined"
                        ? payLink.country
                        : payload.country;

                // Get Amount In Customer's Currency
                paymentPrice = await convertCurrency(
                    currency,
                    payload.currency,
                    payLink.amount
                );

                payload.description =
                    typeof payload.description === "undefined"
                        ? payLink.title
                        : payload.description;
                payload.ewallet = payLink.wId;
                country = payload.country || "US";
            } catch (e) {
                return sendResponse(
                    res,
                    500,
                    false,
                    "Payment Link Not Found",
                    {}
                );
            }

            // Get Wallet
            const getWallet = await Wallets.findOne({ userId });

            if (!getWallet) {
                return sendResponse(res, 500, false, "Wallet Id Not Found", {});
            }

            const name =
                (payload?.first_name || " ") +
                " " +
                (payload?.last_name || " ");
            const email = payload?.email || "";

            // Delete name and email From Object
            delete payload.name;
            delete payload.email;

            // Check if there is already a transaction stored
            if (paymentCookie !== "") {
                // Check if Transaction Exists in our DB
                const checkTransaction = await Transactions.findOne({
                    id: paymentCookie,
                });

                if (checkTransaction) {
                    // Retrieve Virtual Account
                    let result = await Fetch(
                        "GET",
                        "/v1/issuing/bankaccounts/" + paymentCookie
                    );

                    let message =
                        result.statusCode == 200
                            ? "Vitual Account Retrieved"
                            : "Failed To Retrieve Vitual Account";
                    let status = result.statusCode == 200 ? true : false;

                    // Add Payment Amount
                    result.body.data.amount = paymentPrice;

                    // Recalculate and Update Transaction Table
                    // this.#recalculateTransaction(
                    //     paymentLinkId,
                    //     paymentCookie,
                    //     result.body.data.transactions
                    // );

                    if (status) {
                        return sendResponse(
                            res,
                            result.statusCode,
                            status,
                            message,
                            result.body.data
                        );
                    }
                }
            }

            console.log("Not Logged If Cookie is Used");

            try {
                let result = await Fetch(
                    "POST",
                    "/v1/issuing/bankaccounts",
                    payload
                );
                let message =
                    result.statusCode == 200
                        ? "Vitual Account Created"
                        : "Failed To Create Vitual Account";
                let status = result.statusCode == 200 ? true : false;

                if (status) {
                    // const bankName = result.body.data.bank_account.account_number || "";
                    // const bic = result.body.data.bank_account.account_number || "";
                    // const routingNumber = result.body.data.bank_account.aba_routing_number || "";

                    const iban =
                        result.body.data.bank_account.account_number || "";
                    const county =
                        result.body.data.bank_account.county_iso || "";
                    const currency = result.body.data.currency || "";
                    const accountId = result.body.data.id;
                    const description = result.body.data.description || "";
                    const walletId = payload.ewallet;

                    try {
                        // Create Empty Transaction
                        const createTransaction = await Transactions.create({
                            id: accountId,
                            userId,
                            linkId: paymentLinkId,
                            currency,
                            country,
                            name,
                            email,
                            paid: 0,
                            totalAmount: paymentPrice,
                            iban,
                            createdAt: Date.now(),
                            status: "Created",
                        });

                        // Store Transaction in Cookie
                        res.cookie(paymentLinkId, accountId, {
                            httpOnly: true,
                            secure: false,
                            sameSite: "none",
                        });

                        result.body.data.accountId = accountId;

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
                            `Error Creating Account`,
                            {},
                            e.body
                        );
                    }
                }
            } catch (e) {
                console.log(e);
                sendResponse(
                    res,
                    500,
                    false,
                    `Error: ${e.body.status.message}`,
                    {},
                    e.body
                );
            }
        } catch (e) {}
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

        const getUser = await Wallets.findOne({ userId: id });

        const getUserInfo = await User.findOne({ id: userId });

        if (getUser) {
            id = getUser.wId;
        }

        try {
            let result = await Fetch("GET", "/v1/user/" + id);
            let message =
                result.statusCode == 200
                    ? "wallet retrieved successfully"
                    : "failed to retrieve wallet";
            let status = result.statusCode == 200 ? true : false;

            const { country, currency } = getUserInfo;
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
            sendResponse(res, 500, false, "failed to retrieve wallet", {});
        }
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

    async verifyIdentity(res, payload) {
        const { id } = res.user;

        try {
            const getWallet = await Wallets.findOne({ userId: id });
            const walletId = getWallet.wId;

            payload.ewallet = walletId;

            let result = await Fetch("POST", "/v1/identities", payload);
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
            sendResponse(
                res,
                500,
                false,
                `Error: ${e.body.status.message}`,
                {},
                e.body
            );
        }
    }

    async webhook(res, payload) {
        console.log(payload);

        // Identity Verification
        if (payload.type === "IDENTITY_VERIFICATION") {
            // Update wallet verification status
            const walletId = payload.data.ewallet;
            const verificationStatus = payload.data.verification_status;

            try {
                if (verificationStatus === "NOT_APPROVED") {
                    const updateWallet = await Wallets.updateOne(
                        { wId: walletId },
                        { verified: false, status: "failed" }
                    );
                } else {
                    const updateWallet = await Wallets.updateOne(
                        { wId: walletId },
                        { verified: true, status: "verified" }
                    );
                }
            } catch (e) {
                console.log(e);
            }
        } else if (
            payload.type === "ISSUING_DEPOSIT_COMPLETED" &&
            payload.status === "NEW"
        ) {
            // Bank Account Deposit

            const accountId = payload.data.issued_account_id;
            const getTransaction = await Transactions.findOne({
                id: accountId,
            });

            // Check if Transaction Exists
            if (getTransaction) {
                const paid = Number(getTransaction.paid);
                const total = Number(getTransaction.totalAmount);
                const name = getTransaction.name;
                const email = getTransaction.email;
                const currency = getTransaction.currency;
                const linkId = getTransaction.linkId;
                const sellerId = getTransaction.userId;
                const country = getTransaction.country;

                const amount = Number(payload.data.amount);

                const newPaid = paid + amount;

                // Check If Payment is Complete
                if (newPaid >= total) {
                    await Transactions.updateOne(
                        { id: accountId },
                        {
                            paid: newPaid,
                            status: "Completed",
                        }
                    );

                    // console.log(getTransaction);

                    // Send Email
                    if (newPaid > total) {
                        // Create Payout Link

                        const seller = await User.findOne({ id: sellerId });
                        const sellerCountry = seller.country;
                        const logo = "https://raypal.finance/favicon.ico";
                        const website = "https://raypal.finance";

                        try {
                            const merchantId = genUnique();
                            const payload = {
                                category: "bank",
                                sender_entity_type: "individual",
                                sender_country: sellerCountry,
                                merchant_reference_id: merchantId,
                                beneficiary_country: country,
                                beneficiary_entity_type: "individual",
                                payout_currency: currency,
                                payment_type: "priority",
                                merchant_color: "black",
                                merchant_logo: logo,
                                merchant_alias: "RayPal",
                                merchant_website: website,
                                merchant_customer_support:
                                    "info@raypal.finance",
                                beneficiary_optional_fields: {
                                    last_name: name.split(" ")[0] || "",
                                    first_name: name.split(" ")[1] || "",
                                    payment_type: "priority",
                                },
                            };
                            const result = await Fetch(
                                "POST",
                                "/v1/hosted/disburse/beneficiary",
                                payload
                            );
                            console.log(result.body);

                            const payout =
                                result.body.data.default_payout_method_type;

                            // Store Refund Data
                            await Refund.create({
                                tranId: accountId,
                                merchantId,
                                payout,
                            });

                            const refundLink = result.body.data.redirect_url;

                            sendMail(
                                name,
                                email,
                                "Payment Received",
                                `
                            We have received your payment of <b>${amount} ${currency}</b>,<br>
                            You have now completed your payment of <b>${total} ${currency}</b>,<br>
                            You have made a total payment of <b>${newPaid} ${currency}</b>.<br>
                            Use the link below to get a refund of your over payment of <b>${
                                newPaid - total
                            } ${currency}</b>.<br>
                            <a href="${refundLink}">${refundLink}</a><br>
                            Thanks for using RayPal.
                        `
                            );
                        } catch (e) {
                            sendMail(
                                name,
                                email,
                                "Payment Received",
                                `
                            We have received your payment of <b>${amount} ${currency}</b>,<br>
                            You have now completed your payment of <b>${total} ${currency}</b>,<br>
                            Contact The Merchant to get a refund of <b>${
                                newPaid - total
                            } ${currency}</b>.<br>
                            Thanks for using RayPal.
                        `
                            );
                            console.log(e);
                        }
                    } else {
                        sendMail(
                            name,
                            email,
                            "Payment Received",
                            `
                        We have received your payment of <b>${amount} ${currency}</b>,<br>
                        You have now completed your payment of <b>${total} ${currency}</b>.<br>
                        Thanks for using RayPal.
                    `
                        );
                    }
                } else {
                    await Transactions.updateOne(
                        { id: accountId },
                        {
                            paid: newPaid,
                            status: "Updated",
                        }
                    );

                    // Send Mail

                    const paymentLink = `https://raypal.finance/payment/link/${linkId}?accountId=${accountId}`;

                    sendMail(
                        name,
                        email,
                        "Payment Received",
                        `
                    We have received your payment of <b>${amount} ${currency}</b>,<br>
                    You have now made a total payment of  <b>${newPaid} ${currency}</b> and Still have <b>${
                            total - newPaid
                        } ${currency}</b> Remaining.<br>
                    Click on the link below to complete your payment anytime you want.<br>
                    <a href="${paymentLink}">${paymentLink}</a><br>
                    Thanks for using RayPal.<br>
                `
                    );
                }
            }
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
                Your Refund Request of <b>${paid - totalAmount} ${currency}</b> has failed.<br>
                Contact The merchant to get your refund manually.<br>
                Thanks for using RayPal.<br>
            `
            );
        }

        sendResponse(res, 200, true, "Webhook Endpoint", {});
    }
}

module.exports = WalletController;
