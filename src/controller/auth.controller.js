const { User, Wallets } = require("../model");
const { genHash, compareHash, genId } = require("../helpers");
const sendResponse = require("../helpers/response");
const { validateEmail, validatePhonenumber } = require("../utils/validate");
const { genAccessToken, genRefreshToken } = require("../helpers/token");
const {
    createPersonalWallet,
    createCompanyWallet,
} = require("../config/rapydEndpoints");
const Fetch = require("../utils/fetch");

class AuthControler {

    #parseUserName(username) {
        const parse = username.split(" ")
        let firstName = parse[0];
        let lastName = parse.length > 1 ? parse[1] : "";
        return { firstName, lastName }
    }

    #genUniqueNumber(count = 6) {
        const nums = "1234567890".split("")
        let uniqueNum = "";

        Array(count).fill(count).forEach((num) => {
            const rand = Math.floor(Math.random() * nums.length)
            uniqueNum += nums[rand]
        })
        return uniqueNum
    }

    async login(res, payload) {
        if (res === undefined) {
            throw new Error("expected a valid 'res' object but got none ");
        }
        if (Object.entries(payload).length === 0) {
            return sendResponse(
                res,
                400,
                false,
                "failed to log In, missing payload."
            );
        }

        const { email, password } = payload;

        if (email === "") {
            return sendResponse(res, 400, false, "email is missing");
        }

        if (password === "") {
            return sendResponse(res, 400, false, "password is missing");
        }

        if (!validateEmail(email))
            return sendResponse(res, 400, false, "email given is invalid");

        // check if user with this email address already exists
        const userExistsResult = await User.find({ email });

        if (userExistsResult.length === 0)
            return sendResponse(
                res,
                404,
                false,
                "No user with this email address exists."
            );

        // check if password is correct
        const userData = await User.findOne({ email });

        if (!compareHash(password, userData?.hash))
            return sendResponse(res, 400, false, "password given is incorrect");

        try {
            const userPayload = {
                id: userData?.id,
                username: userData?.username,
                email: userData?.email,
            };
            const refreshToken = genRefreshToken(userPayload);
            const accessToken = genAccessToken(userPayload);

            const filter = { email };
            const update = { token: refreshToken };

            await User.findOneAndUpdate(filter, update);

            return sendResponse(res, 201, true, "Logged In successful", {
                ...userPayload,
                accessToken,
            });
        } catch (e) {
            console.log(e);
            sendResponse(res, 500, false, "something went wrong logging in", {
                error: e.message,
            });
        }
    }

    async register(res, payload) {
        if (res === undefined) {
            throw new Error("expected a valid 'res' object but got none ");
        }
        if (Object.entries(payload).length === 0) {
            return sendResponse(
                res,
                400,
                false,
                "failed to register In, missing payload."
            );
        }

        const { username, email, password, country, currency } = payload;

        if (email === "") {
            return sendResponse(res, 400, false, "email is missing");
        }

        if (username === "") {
            return sendResponse(res, 400, false, "username is missing");
        }

        if (password === "") {
            return sendResponse(res, 400, false, "password is missing");
        }

        if (country === "") {
            return sendResponse(res, 400, false, "country is missing");
        }

        if (currency === "") {
            return sendResponse(res, 400, false, "currency is missing");
        }

        if (!validateEmail(email))
            return sendResponse(res, 400, false, "email given is invalid");

        // check if user with this email address already exists
        const userExistsResult = await User.find({ email });

        if (userExistsResult.length > 0)
            return sendResponse(
                res,
                400,
                false,
                "user with this email already exists"
            );

        try {
            // Create Wallet
            const { firstName, lastName } = this.#parseUserName(username)
            let combo = `${firstName}${lastName === "" ? "" : "-" + lastName}`
            const refId = `${combo}-${this.#genUniqueNumber(6)}`
            const walletPayload = { email, contact: { contact_type: "personal", country, currency }, first_name: firstName, last_name: lastName, ewallet_reference_id: refId };

            try {
                const result = await Fetch(
                    "POST",
                    createPersonalWallet,
                    walletPayload
                );
                const status = result.statusCode == 200 ? true : false;

                if (status) {
                    const userId = genId();

                    // return console.log(payload)

                    // save user data
                    const saveUserData = await User.create({
                        id: userId,
                        username,
                        email,
                        country,
                        currency,
                        token: "",
                        hash: genHash(password),
                    });

                    // save wallet data
                    const walletName =
                        (result.body.data.first_name || "") +
                        " " +
                        (result.body.data.last_name || "");

                    const saveWalletData = await Wallets.create({
                        id: genId(),
                        userId,
                        wId: result.body.data.id,
                        wName: walletName,
                        wAddr: "",
                        totalBalance: 0,
                        verified: false,
                        status: "unverified",
                        createdAt: Date.now(),
                    });

                    return sendResponse(
                        res,
                        201,
                        true,
                        "user registered successfully",
                        saveUserData
                    );
                }
            } catch (e) {
                console.log(e)
                sendResponse(
                    res,
                    500,
                    false,
                    `Something went wrong registering: ${e.body?.status.message || e.mesage}`,
                );
            }
        } catch (e) {
            sendResponse(
                res,
                500,
                false,
                "something went wrong registering user",
                {
                    error: e.message,
                }
            );
        }
    }
}

module.exports = AuthControler;
