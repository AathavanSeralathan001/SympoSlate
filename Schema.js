const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value, {
                    allowedTags: [],
                    allowedAttributes: {},
                });
                if (clean !== value) return helpers.error('string.escapeHTML', { value })
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension)

module.exports.userSchema = Joi.object({
    user:Joi.object({
        name:Joi.string().required().escapeHTML(),
        email:Joi.string().required().escapeHTML(),
        username:Joi.string().required().escapeHTML(),
        password:Joi.string().required().escapeHTML()
    }).required()
})

// module.exports.eventSchema = Joi.object({
//     event:Joi.object({
//         name:Joi.string().required().escapeHTML(),
//         description:Joi.string().required().escapeHTML(),
//         startDate:Joi.date().required(),
//         endDate:Joi.date().required()
//     }).required()
// })

