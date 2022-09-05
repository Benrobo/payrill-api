const sendResponse = require("../helpers/response");
const Fetch = require("../utils/fetch");
const db = require("../services/db");

class CardControler {
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

    async getCard(res) {
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT card_id FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 400, false, "Card Not Found", {});
                }
                const cardId = results[0].card_id;

                let result = await Fetch("GET", "/v1/issuing/cards/" + cardId);

                delete result.body.data.ewallet_contact;
                const card = result.body.data;

                return sendResponse(res, 200, true, "User Card", card);
            }
        );
    }

    async getAllCards(res) {
        const { id } = res.user;
        db.query(
            {
                sql: "SELECT contact_id FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results, fields) {
                if (results.length == 0) {
                    return sendResponse(res, 400, false, "Cards Not Found", {});
                }
                const contactId = results[0].contact_id;

                let result = await Fetch(
                    "GET",
                    "/v1/issuing/cards?contact=" + contactId
                );

                const cards = result.body.data;

                return sendResponse(res, 200, true, "All User Cards", cards);
            }
        );
    }

    async createCard(res, payload) {
        const self = this;
        const { id } = res.user;
        let pin = payload.pin || 1234;
        db.query(
            {
                sql: "SELECT contact_id, country FROM users WHERE (id = ?)",
                timeout: 40000,
                values: [id],
            },
            async function (error, results, fields) {
                const contactId = results[0].contact_id;
                const country = results[0].country;

                // Create Virtual Card
                payload = {
                    ewallet_contact: contactId,
                    country,
                    card_program: "cardprog_21e21afebf22da2d9880ec0a88db4b39",
                };
                let result = await Fetch("POST", "/v1/issuing/cards", payload);
                const cardId = result.body.data.card_id;

                // Activate Virtual Card and Set Card Pin
                try {
                    await self.#activateCard(cardId, pin);
                } catch (e) {
                    await self.#activateCard(cardId, pin);
                }

                const card = result.body.data;

                return sendResponse(res, 200, true, "Card Created", card);
            }
        );
    }

    async changeCardStatus(res, payload) {
        try {
            let result = await Fetch("POST", "/v1/issuing/cards/status", payload);
            const status = result.body.data;
            return sendResponse(res, 200, true, "Card Status Updated", status);
        } catch (e) {
            console.log(e);
            return sendResponse(res, 400, false, "Card Status Failed to Updated", {});
        }
    }
}

module.exports = CardControler;
