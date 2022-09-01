const { genHash, compareHash, genId, genUnique } = require("../helpers");
const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");

class PaymentController {
    async #getPaymentTransactions(issued_id) {
        const trans = await Transactions.find({ linkId: issued_id });
        return trans;
    }

    async createLinks(res, payload) {
        const { title, country, amount, currency } = payload;

        if (title === undefined || title === "")
            return sendResponse(
                res,
                400,
                false,
                "payment link title is missing."
            );
        if (country === undefined || country === "")
            return sendResponse(
                res,
                400,
                false,
                "payment link country is missing."
            );
        if (currency === undefined || currency === "")
            return sendResponse(
                res,
                400,
                false,
                "payment link currency is missing."
            );
        if (amount === undefined || amount === "")
            return sendResponse(
                res,
                400,
                false,
                "payment link amount is missing."
            );

        try {
            // check if user creating link exists
            const { id } = res.user;
            const doesUserExist = await User.find({ id });

            if (doesUserExist.length === 0)
                return sendResponse(
                    res,
                    400,
                    false,
                    "UNauthorised to add link. user doesnt exists."
                );

            const walletData = await Wallets.findOne({ userId: id });
            const walletId = walletData.wId;

            // save link
            const savedData = {
                id: genUnique(),
                userId: id,
                title,
                country,
                currency,
                amount,
                wId: walletId,
                active: true,
                createdAt: new Date(),
            };

            let linksaved = await PaymentLinks.create(savedData);

            sendResponse(
                res,
                200,
                true,
                "Payment links created successfully.",
                linksaved
            );
        } catch (e) {
            console.log(e);
            sendResponse(
                res,
                500,
                false,
                "Something went wrong while creating link."
            );
        }
    }

    async getAllLinks(res) {
        try {
            // check if user fetching link exists
            const { id } = res.user;
            const doesUserExist = await User.find({ id });

            if (doesUserExist.length === 0)
                return sendResponse(
                    res,
                    404,
                    false,
                    "Unauthorised to fetch payment link. user doesnt exists."
                );

            const allLinks = await PaymentLinks.find({ userId: id });

            sendResponse(
                res,
                200,
                true,
                "Payment links fetched successfully.",
                allLinks
            );
        } catch (e) {
            console.log(e);
            sendResponse(
                res,
                500,
                false,
                "Something went wrong fetching payment links."
            );
        }
    }

    async getLinkById(res, linkId, accountId) {
        if (linkId === undefined || linkId === "")
            return sendResponse(res, 400, false, "payment link ID is missing.");

        try {
            const getLinkById = await PaymentLinks.findOne({ id: linkId });

            const transactions = await this.#getPaymentTransactions(accountId) || [];

            const fullData = {
                ...getLinkById?._doc,
                transactions,
            };

            sendResponse(
                res,
                200,
                true,
                "Payment links fetched successfully.",
                fullData
            );
        } catch (e) {
            console.log(e);
            sendResponse(
                res,
                500,
                false,
                "Something went wrong fetching payment links."
            );
        }
    }

    async disableLink(res, payload) {
        const { linkId } = payload;

        if (linkId === undefined || linkId === "")
            return sendResponse(res, 400, false, "payment link ID is missing.");

        try {
            // check if user disabling link exists
            const { id } = res.user;
            const doesUserExist = await User.find({ id });

            if (doesUserExist.length === 0)
                return sendResponse(
                    res,
                    404,
                    false,
                    "Unauthorised to disable payment link. user doesnt exists."
                );

            // check if user who is trying to disable link was actually the one who created it.
            const wasCreatedByUser = doesUserExist.filter(
                (user) => user.id === id
            );

            if (wasCreatedByUser.length === 0)
                return sendResponse(
                    res,
                    401,
                    false,
                    "Permission Denied. you dont have permission to disable this link"
                );

            // check if link exists before disabling it
            const doesLinkExists = await PaymentLinks.findOne({ id: linkId });

            if (doesLinkExists === null)
                return sendResponse(
                    res,
                    404,
                    false,
                    "Failed to disable payment link. link doesnt exists."
                );

            const filter = { userId: id, id: linkId };
            const update = { active: false };
            const link = await PaymentLinks.findOneAndUpdate(filter, update);

            sendResponse(res, 200, true, "Link disabled successfully.", link);
        } catch (e) {
            console.log(e);
            sendResponse(
                res,
                500,
                false,
                "Something went wrong disabling payment link."
            );
        }
    }

    async deleteLink(res, payload) {
        const { linkId } = payload;

        if (linkId === undefined || linkId === "")
            return sendResponse(res, 400, false, "payment link ID is missing.");

        try {
            // check if user disabling link exists
            const { id } = res.user;
            const doesUserExist = await User.find({ id });

            if (doesUserExist.length === 0)
                return sendResponse(
                    res,
                    404,
                    false,
                    "Unauthorised to delete payment link. user doesnt exists."
                );

            // check if user who is trying to delete link was actually the one who created it.
            const wasCreatedByUser = doesUserExist.filter(
                (user) => user.id === id
            );

            if (wasCreatedByUser.length === 0)
                return sendResponse(
                    res,
                    401,
                    false,
                    "Permission Denied. you dont have permission to delete this link"
                );

            // check if link exists before deleting it
            const doesLinkExists = await PaymentLinks.findOne({ id: linkId });

            if (doesLinkExists === null)
                return sendResponse(
                    res,
                    404,
                    false,
                    "Failed to delete payment link. link doesnt exists."
                );

            const filter = { userId: id, id: linkId };
            const update = { active: false };
            const deletedLink = await PaymentLinks.findOneAndDelete(
                filter,
                update
            );

            sendResponse(
                res,
                200,
                true,
                "Link deleted successfully.",
                deletedLink
            );
        } catch (e) {
            console.log(e);
            sendResponse(
                res,
                500,
                false,
                "Something went wrong deleting payment link."
            );
        }
    }
}

module.exports = PaymentController;
