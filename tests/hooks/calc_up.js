#!/usr/bin/env node

const axios = require('axios');
const EventEmitter = require('events');
const EventSource = require('eventsource');

const { db, USER_CALCULATIONS_TABLE } = require('./../../services/db');

const emitter = new EventEmitter();

const calcTimer = '\n🏁 Сalculation completed in';

async function calcUP() {
	try {
		const auth = await axios.post('http://localhost:3000/v0/auth', {
			email: 'member@test.com',
			password: '123123'
		});
		const Cookie = auth.headers['set-cookie'][0].match(/^(.*?);/)[1];
		// console.log('auth', Cookie);

		// draft for optimade search request
		// const optimade = await axios.get('https://api.mpds.io/v1/structures?filter=nelements=2');
		// console.log(optimade.data.data[0]);

		const es = new EventSource('http://localhost:3000/stream', {
			withCredentials: true,
			https: false,
			headers: { Cookie }
		});

		let count = 0;
		es.addEventListener('calculations', async (e) => {
			if (e.data.length > 2) {
				const { id, progress } = JSON.parse(e.data)[0];

				//TODO - Make progress clear points by 50 || 100
				console.log('CalcID:', id, 'progress:', progress + count);
				count += 1;

				const { uuid } = await db(USER_CALCULATIONS_TABLE).where({ id }).first();
				// console.log('es', uuid);

				emitter.emit('uuid', uuid);
			} else {
				console.timeEnd(calcTimer);
				cleanUP(es);
				process.exit(1);
			}
		});

		axios.post('http://localhost:3000/v0/calculations', {
			dataId: 1, engine: 'dummy',
		}, {
			headers: { Cookie }
		});
		console.log('🚀 Calculation start');
		console.time(calcTimer);

		emitter.on('uuid', async (uuid) => {
			// console.log('emmiter', uuid);
			if (uuid) {
				const hook = await axios.post('http://localhost:3000/v0/webhooks/calc_update', { uuid, status: 100 });
				// console.log('hook', hook.data);
			} else {
				cleanUP(es);
			}
		});
	} catch (e) {
		console.error(e);
	}
}

calcUP();

function cleanUP(es) {
	emitter.removeAllListeners('uuid');
	es.removeEventListener('calculations');
	es.close();
}
