var csrf = require("csurf");
var csrfProtection = csrf({ cookie: true });

module.exports = csrfProtection;