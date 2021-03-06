const { db, USERS_EMAILS_TABLE } = require('../../../services/db');

module.exports = {
    get,
};

async function get(req, res, next) {
    const { redirectURL, code } = req.query;

    if (code) {
        const updated = await db(USERS_EMAILS_TABLE)
            .where({ code })
            .update({ verified: true }, ['userId']);
        const verified = updated && !!updated[0].userId;
        if (redirectURL) {
            res.redirect(redirectURL);
        } else {
            res.send(verified ? 'Your email was successfully verified' : 'Verification failed');
        }
    }
}
