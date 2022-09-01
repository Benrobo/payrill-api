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

class TransactionController {
    async getAllTransactions(res) {
        try {
            const { id } = res.user;

            const allTransactions = await Transactions.find({ userId: id })

            sendResponse(res, 200, true, "Payment Transactions fetched successfully.", allTransactions);
        } catch (e) {
            console.log(e);
            sendResponse(res, 500, false, "Something went wrong fetching transactions.");
        }
    }

    async getTransactionById(res, tranId) {
        try {
            const transaction = await Transactions.find({ id: tranId });

            if(!transaction){
                return sendResponse(res, 500, false, "Transaction Not Found");
            }

            sendResponse(res, 200, true, "Payment Transactions fetched successfully.", transaction);
        } catch (e) {
            console.log(e);
            sendResponse(res, 500, false, "Something went wrong fetching transactions.");
        }
    }
}

module.exports = TransactionController;