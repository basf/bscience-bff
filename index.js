#!/usr/bin/env node

const path = require('path');
const express = require('express');
const bff = require('express-bff');
const passport = require('passport');
const { getReasonPhrase } = require('http-status-codes');

const { PORT = 3000 } = process.env;

const { dev, backend } = require('./config');

const sseMiddleware = require('./middlewares/sse');

const secure = !dev;

const app = express();

secure && app.set('trust proxy', 1); // if nginx used

bff(app, {
	security: {
		cors: {
			credentials: true,
			origin: true,
		},
		csrf: false,
		secure,
	},
	session: {
		persist: true,
		cookie: {
			secure: false, // TODO FIXME?
			httpOnly: true,
			sameSite: true,
			maxAge: 86400000,
		},
	},
	sse: {
		path: '/stream',
	},
	api: {
		dir: path.join(__dirname, 'routes'),
	},
	proxy: {
		target: backend.baseURL,
	},
	static: false,
	ssr: false,
	middlewares: [
		passport.initialize(),
		passport.session(),
		sseMiddleware,
	]
});

app.use((err, req, res, next) => {
	const status = err.status || 400;
	const error = err || { status, error: getReasonPhrase(status) };

	console.error(JSON.stringify(error).substring(0, 500) + '...');

	if (res.headersSent) {
		res.sse.sendTo([error], 'errors');
	} else {
		res.status(status).json(error);
	}
});

app.listen(PORT, () => {
	console.log(`App in dev-mode=${dev} listens to http://localhost:${PORT}`);
});
