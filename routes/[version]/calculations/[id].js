const { StatusCodes } = require('http-status-codes');

const { checkAuth } = require('../../../middlewares/auth');
const { getUserCalculations } = require('../../../middlewares/db');

const { deleteAndClearCalculation, getAndPrepareCalculations } = require('./_helpers');

module.exports = {
    delete: [
        checkAuth,
        getUserCalculations,
        del,
    ],
};

async function del(req, res, next) {

    if (!req.params.id) {
        return next({ status: StatusCodes.BAD_REQUEST });
    }

    res.status(StatusCodes.ACCEPTED).json({});

    try {
        await deleteAndClearCalculation(req.user.id, req.params.id);

        req.session.calculations = req.session.calculations.filter(calculation => calculation.id !== req.params.id);

        const output = await getAndPrepareCalculations(req.session.calculations);
    
        res.sse.sendTo(output, 'calculations');
    } catch(error) {
        return next({ status: StatusCodes.MISDIRECTED_REQUEST, error });
    } 
}