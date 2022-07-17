/*!
	TODO licence
 */

"use strict";

class Session {
	constructor(id) {
		Object.defineProperty(this, "id", {
			value: id,
			writable: false,
			enumerable: true,
			configurable: true,
		});
	}
}

module.exports = {
	Session: Session,
};
