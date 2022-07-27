
const {userSchema,eventSchema} = require('./Schema')
const ExpressError = require('./utils/ExpressError');

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        return res.redirect('/login');
    }
    next();
}


module.exports.validateUser = (req, res, next) => {
    const { error } = userSchema.validate(req.body);
    console.log(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

// module.exports.validateEvent = (req, res, next) => {
//     const { error } = eventSchema.validate(req.body);
//     console.log(req.body);
//     if (error) {
//         const msg = error.details.map(el => el.message).join(',')
//         throw new ExpressError(msg, 400)
//     } else {
//         next();
//     }
// }

