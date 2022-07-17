/*!
	TODO licence
 */

"use strict";

const EventEmitter = require("events");
const cookie = require("cookie");
const { sign, unsign } = require("cookie-signature");
const { v4: uuidv4 } = require("uuid");

const { Session } = require("./session");

const activeSessions = {};
const activeSubscriptions = {};

var onChange = null;
(async () => {
	// Require ES Modules
	let importedModule = await import("on-change");
	onChange = importedModule.default;
})();

class SessionHandler extends EventEmitter {
	/**
	 * Generate new session and store it
	 *
	 * @param { Object } [linkObj] Object where session object is suppose to link
	 * @param { String } [rawCookie] Raw cookie
	 * @param { Object } [options] Session hendler options
	 * @public
	 */
	constructor(linkObj, rawCookie, options) {
		super();

		this.linkObj = linkObj;
		this.options = options;
		this.session = null;

		// Parse cookie session
		this.cookieSessionId = this.parseCookie(rawCookie);

		// Regenerate current session
		this.on("regenerate", (sessionId) => {
			this.regenerate(sessionId, false);
		});

		// Destroy current session
		this.on("destory", () => {
			this.destroy();
		});
	}

	/**
	 * Generate new session and store it
	 *
	 * @param {String} [id] Session id
	 * @return {void}
	 * @public
	 */
	async generate(id) {
		// Pull id from the cookie
		if (id === undefined || id === null) {
			this.sessionId = this.cookieSessionId;
		} else {
			this.sessionId = id;
		}

		// Set session id
		if (this.sessionId === undefined || this.sessionId === null) {
			this.sessionId =
				this.options && typeof this.options.uuid == "function"
					? this.options.uuid()
					: uuidv4();
		}

		// Active sessions lookup
		if (this.sessionId) {
			this.session =
				activeSessions[this.sessionId] !== undefined
					? activeSessions[this.sessionId]
					: null;
		}

		// Store lookup
		if (this.session === null) {
			// this.session = await store.find(this.sessionId);
			// // Add session to the list of active sessions
			// activeSessions[this.sessionId] = this.session;
		}

		// Create new session
		if (this.session === null) {
			this.session = new Session(this.sessionId);

			// Add session to the list of active sessions
			activeSessions[this.sessionId] = this.session;
		}

		// Subscribe to keep the session active
		this.subscribe();

		// Attach Session to the linkObj
		this.linkObj.session = this.createProxy(this.session);
	}

	/**
	 * Generate new session and store it
	 *
	 * @param {String} [sessionId] Session id
	 * @param {Boolean} [notify] Notify other session handlers
	 * @return {void}
	 * @public
	 */
	regenerate(sessionId, notify = true) {
		// Save current session id
		let oldSessionId = this.session.id;

		if (sessionId === undefined || sessionId !== null) {
			// Create new session id
			sessionId = this.options.uuid() | uuidv4();
		}

		// Unsbuscribe from the current session
		this.unsubscribe();

		// Create new session
		this.generate(sessionId);

		// Notify all session handlers with the new sessionId
		if (notify === true) {
			for (const sessionHandler of activeSubscriptions[oldSessionId]) {
				sessionHandler.event.emit("regenerate", sessionId);
			}
		}
	}

	/**
	 * Create proxy object on session object
	 * Catches and stores all the changes done to the session object
	 *
	 * @return {Session}
	 * @private
	 */
	createProxy() {
		// Proxy the session object changes
		let proxySession = onChange(
			this.session,
			(path, newState, oldState, applyData) => {
				// TODO - Store changes in store
			}
		);

		return proxySession;
	}

	/**
	 * Link this object of the session handler to the session object
	 * Call unsubscribe to remove the link
	 *
	 * @return {void}
	 * @public
	 */
	subscribe() {
		// Make sure array object exist for this session id
		activeSubscriptions[this.session.id] =
			activeSubscriptions[this.session.id] instanceof Array
				? activeSubscriptions[this.session.id]
				: [];
		// Link this handler to the session
		activeSubscriptions[this.session.id].push(this);
	}

	/**
	 * Unlink session handler from the session object
	 *
	 * @return {void}
	 * @public
	 */
	unsubscribe() {
		// Remove active subscriptions
		if (activeSubscriptions[this.session.id] instanceof Array) {
			activeSubscriptions[this.session.id] = activeSubscriptions[
				this.session.id
			].filter((l) => {
				return l !== this.link;
			});

			if (activeSubscriptions[this.session.id].length === 0) {
				// Completely remove object from array
				activeSubscriptions[this.session.id] = undefined;

				// Remove session from active session object
				activethis.Sessions[this.session.id] = undefined;
			}
		}
	}

	/**
	 * Destroy current session
	 *
	 * @return {void}
	 * @public
	 */
	destroy() {
		if (
			!(this.session instanceof Object) &&
			this.session.id === undefined &&
			this.session.id === null &&
			!(activeSubscriptions[this.session.id] instanceof Array)
		) {
			return;
		}

		// Notify all session handlers
		for (const sessionHandler of activeSubscriptions[this.session.id]) {
			sessionHandler.event.emit("destroy");
		}

		// Remove session from the list of activeSessions
		activeSessions[this.session.id] = undefined;

		// Remove session object
		this.linkObj.session = undefined;
	}

	/**
	 * Parse cookie string from HTTP request
	 *
	 * @param {String} [rawCookies] Raw cookie
	 * @return {String} [cookieSessionId]
	 * @private
	 */
	parseCookie(rawCookies) {
		let cookieSessionId = null;

		// Parse cookies from raw headers
		let cookies = cookie.parse(rawCookies || "");

		// Verify if cookie exist
		if (cookies[this.options.cookie.name] === undefined) {
			return null;
		}

		// Verify cookie signature
		for (const secret of this.options.cookie.secret instanceof Array
			? this.options.cookie.secret
			: [this.options.cookie.secret]) {
			cookieSessionId = unsign(cookies[this.options.cookie.name], secret);

			// Valid session when bellow condition is true
			if (cookieSessionId !== false) {
				break;
			}
		}

		// Invalid cookie signature
		if (cookieSessionId === false) {
			return null;
		}

		return cookieSessionId;
	}
}

module.exports = {
	SessionHandler: SessionHandler,
};
