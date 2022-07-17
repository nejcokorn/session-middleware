/*!
	TODO licence
 */

"use strict";

const cookie = require("cookie");
const merge = require("deepmerge");
const { sign, unsign } = require("cookie-signature");
const onHeaders = require("on-headers");

const { SessionHandler } = require("../session/handler");

const expressMiddleware = (userOptions) => {
	// Default options
	let defaultOptions = {
		store: {},
		maxAge: 60 * 60 * 24,
		trustProxy: false,
		cookie: {
			name: "session",
			path: "/",
			secure: true,
			httpOnly: false,
			secret: "todo",
		},
	};

	// Merge default options with user options
	const options = merge(defaultOptions, userOptions);

	const setCookieSession = (req, res) => {
		// Set cookie
		res.setHeader(
			"Set-Cookie",
			cookie.serialize(
				options.cookie.name,
				sign(req.session.id, options.cookie.secret),
				{
					secure: options.cookie.secure,
					httpOnly: options.cookie.httpOnly,
					maxAge: options.maxAge,
				}
			)
		);
	};

	return (req, res, next) => {
		new Promise(async (resolve, reject) => {
			// Attach session object to the request object
			req.sessionHandler = new SessionHandler(
				req,
				req.headers.cookie,
				options
			);

			// Generate new session
			req.sessionHandler.generate();

			// This is fired when headers are emitted for response
			// Do not emit headers before all requests are processed
			onHeaders(res, function () {
				setCookieSession(req, res);
			});

			// Remove session handler from the session
			res.on("close", () => {
				req.sessionHandler.unsubscribe();
			});

			// Call next express middleware
			next();
		})
			.catch(() => {})
			.then(() => {});
	};
};

module.exports = {
	expressMiddleware: expressMiddleware,
};
