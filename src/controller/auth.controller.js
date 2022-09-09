const { genHash, compareHash, genId, toHash } = require("../helpers");
const sendResponse = require("../helpers/response");
const { validateEmail, validatePhonenumber } = require("../utils/validate");
const { genAccessToken, genRefreshToken } = require("../helpers/token");
const {
    createPersonalWallet,
    createCompanyWallet,
} = require("../config/rapydEndpoints");
const Fetch = require("../utils/fetch");
const db = require("../services/db");
const { RAPYD_CARD_PROGRAM } = require("../config")


class AuthControler {
    #parseUserName(fullname) {
        const parse = fullname.split(" ");
        let firstName = parse[0];
        let lastName = parse.length > 1 ? parse[1] : "";
        return {
            firstName,
            lastName,
        };
    }

    #genUniqueNumber(count = 6) {
        const nums = "1234567890".split("");
        let uniqueNum = "";

        Array(count)
            .fill(count)
            .forEach((num) => {
                const rand = Math.floor(Math.random() * nums.length);
                uniqueNum += nums[rand];
            });
        return uniqueNum;
    }

    async #activateCard(card, pin) {
        let payload = { card };
        try {
            let result = await Fetch(
                "POST",
                "/v1/issuing/cards/activate",
                payload
            );
            let status = result.statusCode == 200 ? true : false;
            if (status) {
                // Set Card Pin
                this.#setCardPin(card, pin);
            }
        } catch (e) {
            console.log(e);
        }
    }

    async #setCardPin(card, new_pin) {
        let payload = { card, new_pin };
        try {
            let result = await Fetch("POST", "/v1/issuing/cards/pin", payload);
        } catch (e) {
            console.log(e);
        }
    }

    async #addFund(payload) {
        try {
            let result = await Fetch(
                "POST",
                "/v1/issuing/bankaccounts/bankaccounttransfertobankaccount",
                payload
            );
            let message = result.statusCode == 200 ? "success" : "failed";
            let status = result.statusCode == 200 ? true : false;
            return status;
        } catch (e) {
            console.log(e);
            return false;
        }
    }

    async login(res, payload) {
        const self = this;
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

        let { email, password } = payload;

        if (email === "") {
            return sendResponse(res, 400, false, "email is missing");
        }

        if (password === "") {
            return sendResponse(res, 400, false, "password is missing");
        }

        if (!validateEmail(email))
            return sendResponse(res, 400, false, "email given is invalid");

        db.query(
            {
                sql: "SELECT * FROM users WHERE (email = ? AND password = ?)",
                timeout: 40000,
                values: [email, toHash(password)],
            },
            function (error, results, fields) {
                if (error)
                    return sendResponse(res, 400, false, "An Error Occured!");
                if (results.length === 0)
                    return sendResponse(res, 400, false, "User not found!");

                if (toHash(password) !== results[0].password)
                    return sendResponse(
                        res,
                        400,
                        false,
                        "password given is incorrect"
                    );

                try {

                    // users payload for adding fund
                    const { currency, issuing_id } = results[0];
                    const amount = 0;

                    const userPayload = {
                        id: results[0]?.id,
                        username: results[0]?.username,
                        email: results[0]?.email,
                        type: results[0]?.type,
                    };
                    const refreshToken = genRefreshToken(userPayload);
                    const accessToken = genAccessToken(userPayload);

                    // update token columnin users table
                    const query = `UPDATE users SET token=? WHERE (email=?)`;
                    db.query({
                        sql: query,
                        values: [refreshToken, email]
                    }, async (err, result, fields) => {
                        if (err)
                            return sendResponse(res, 500, false, "An Error Occured!");

                        // add 0 fund to users ewallet on logging in
                        const fundPayload = {
                            currency,
                            issued_bank_account: issuing_id,
                            amount
                        }
                        const fundAdded = await self.#addFund(fundPayload);

                        if (!fundAdded) {
                            return sendResponse(res, 500, false, "Something went wrong while logging in.", {
                                message: "Failed to create initial deposit."
                            });
                        }
                        return sendResponse(res, 200, true, "Login Successful", {
                            ...userPayload,
                            accessToken,
                        });

                    })

                } catch (e) {
                    console.log(e);
                    sendResponse(
                        res,
                        500,
                        false,
                        "something went wrong when trying to login",
                        {
                            error: e.message,
                        }
                    );
                }
            }
        );
    }

    async register(res, payload) {
        const self = this;
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

        const {
            username,
            email,
            password,
            pin,
            country,
            currency,
            type,
            fullname,
        } = payload;

        if (email === undefined) {
            return sendResponse(res, 400, false, "email is missing");
        }

        if (username === undefined) {
            return sendResponse(res, 400, false, "username is missing");
        }

        if (fullname === undefined) {
            return sendResponse(res, 400, false, "fullname is missing");
        }

        if (password === undefined) {
            return sendResponse(res, 400, false, "password is missing");
        }

        if (pin === undefined) {
            return sendResponse(res, 400, false, "pin is missing");
        }

        if (country === undefined) {
            return sendResponse(res, 400, false, "country is missing");
        }

        if (currency === undefined) {
            return sendResponse(res, 400, false, "currency is missing");
        }

        if (!validateEmail(email)) {
            return sendResponse(res, 400, false, "email given is invalid");
        }

        db.query(
            {
                sql: "SELECT * FROM users WHERE (email = ?)",
                timeout: 40000,
                values: [email],
            },
            async function (error, results, fields) {
                if (results.length > 0) {
                    return sendResponse(
                        res,
                        400,
                        false,
                        "user with this email already exists"
                    );
                }

                try {
                    // Create Wallet
                    const { firstName, lastName } = self.#parseUserName(fullname)
                    let combo = `${firstName}${lastName === "" ? "" : "-" + lastName
                        }`;
                    const refId = `${combo}-${self.#genUniqueNumber(6)}`;
                    const walletPayload = {
                        email,
                        contact: {
                            first_name: firstName,
                            last_name: lastName === "" ? firstName : lastName,
                            contact_type: "personal",
                            country,
                            currency,
                            date_of_birth: "11/22/2000",
                            nationality: country,
                            address: {
                                name: firstName + " " + lastName,
                                line_1: "123 Main Street",
                                line_2: "",
                                line_3: "",
                                city: "Anytown",
                                state: "CA",
                                zip: "12345",
                                phone_number: "",
                                metadata: {},
                                canton: "",
                                district: "",
                                country,
                            },
                        },
                        first_name: firstName,
                        last_name: lastName,
                        ewallet_reference_id: refId,
                    };

                    try {
                        let result = await Fetch(
                            "POST",
                            createPersonalWallet,
                            walletPayload
                        );
                        let status = result.statusCode == 200 ? true : false;
                        const token = "";
                        const name = (firstName + " " + lastName).trim();

                        if (status) {
                            const ewallet = result.body.data.id;
                            const contactId =
                                result.body.data.contacts.data[0].id;

                            // Create virtual account for top up
                            payload = {
                                country,
                                currency,
                                ewallet,
                            };
                            result = await Fetch(
                                "POST",
                                "/v1/issuing/bankaccounts",
                                payload
                            );
                            status = result.statusCode == 200 ? true : false;

                            if (!status) {
                                return sendResponse(
                                    res,
                                    400,
                                    false,
                                    "Error Creating Virtual Account!"
                                );
                            }
                            const issuing_id = result.body.data.id || "";
                            const userId = genId();

                            // Create Virtual Card
                            payload = {
                                ewallet_contact: contactId,
                                country,
                                card_program: RAPYD_CARD_PROGRAM,
                            };

                            result = await Fetch(
                                "POST",
                                "/v1/issuing/cards",
                                payload
                            );

                            const cardId = result.body.data.card_id;

                            // Activate Virtual Card and Set Card Pin
                            try {
                                await self.#activateCard(cardId, pin);
                            } catch (e) {
                                await self.#activateCard(cardId, pin);
                            }

                            // Save user data
                            db.query(
                                {
                                    sql: "INSERT INTO users(id,name,username,type,email,country,currency,token,password,ewallet,pin,issuing_id,card_id,contact_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                                    timeout: 40000,
                                    values: [
                                        userId || "",
                                        name || "",
                                        username || "",
                                        type || "",
                                        email || "",
                                        country || "USA",
                                        currency || "USD",
                                        token || "",
                                        toHash(password) || "",
                                        ewallet || "",
                                        toHash(pin) || "",
                                        issuing_id,
                                        cardId,
                                        contactId
                                    ],
                                },
                                function (error, results, fields) {
                                    if (error) {
                                        return sendResponse(
                                            res,
                                            400,
                                            false,
                                            "Error: " + error
                                        );
                                    }
                                    const response = {
                                        name,
                                        username,
                                        email,
                                        currency,
                                        country,
                                        ewallet,
                                        issuing_id,
                                    };
                                    return sendResponse(
                                        res,
                                        200,
                                        true,
                                        "User registered successfully",
                                        response
                                    );
                                }
                            );
                        }
                    } catch (e) {
                        console.log(e);
                        sendResponse(
                            res,
                            500,
                            false,
                            `Something went wrong when registering: ${e.body?.status.message || e.mesage || e
                            }`
                        );
                    }
                } catch (e) {
                    console.log(e)
                    sendResponse(
                        res,
                        500,
                        false,
                        "Something went wrong when registering user",
                        {
                            error: e.message || e,
                        }
                    );
                }
            }
        );
    }
}

module.exports = AuthControler;
