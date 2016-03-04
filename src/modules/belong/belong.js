/* @flow */

import { bus, cache, config } from '../../core-server';
import winston from 'winston';
import { room as Room, roomrel as RoomRel } from '../../models/models';
import * as place from './place';
import * as constants from '../../lib/Constants';
import uuid from 'uuid';
import * as pg from '../../lib/pg';

/*
// postgres mock, because jest is acting up.

const pg = {
	read: (conn, sql, cb) => {
		setImmediate(() => cb(null, [
			{
				id: '5055f5b6-466e-46bc-a55d-fe020ee9ac42',
				name: 'Bangalore',
				identities: [ 'place:ChIJbU60yXAWrjsR4E9-UejD3_g' ]
			}
		]));
	}
};

// */


function addRooms(change, addable) {
	for (const stub of addable) {
		if (stub.id) { /* already in db */ continue; }

		stub.id = uuid.v4();

		change[stub.id] = new Room({
			id: stub.id,
			name: stub.name,
			tags: [ stub.type ],
			identities: [ stub.identity ]
		});
	}
}

function addRels(change, user, addable) {
	for (const stub of addable) {
		const rel = new RoomRel({
			user: user.id,
			item: stub.id,
			tags: stub.rels,
			roles: [ constants.ROLE_FOLLOWER ],
			createTime: Date.now()
		});

		change[rel.id] = rel;
	}
}

function removeRels(change, removable) {
	for (const rel of removable) {
		change[rel.id] = { roles: [] };
	}
}

function sendInvitations ([ user, relRooms, ...stubsets ]) {
	const stubs = {}, changedRels = {},
		all = [], addable = [], removable = [],
		change = {};

	for (const stubset of stubsets) {
		let rel;

		switch (stubset[0].identity.substr(6)) {
		case user.params.profile.home:
			rel = constants.TAG_REL_HOME;
			break;
		case user.params.profile.work:
			rel = constants.TAG_REL_WORK;
			break;
		case user.params.profile.hometown:
			rel = constants.TAG_REL_HOMETOWN;
			break;
		default:
			continue;
		}

		changedRels[rel] = true;

		for (const stub of stubset) {
			stub.rels = [ rel ];
			if (!stubs[stub.identity]) {
				stubs[stub.identity] = stub;
			} else {
				stubs[stub.identity].rels.push(rel);
			}
		}
	}

	for (const relRoom of relRooms) {
		const identity = relRoom.room.identities.filter(
			ident => ident.substr(0, 6) === 'place:'
		)[0];

		if (stubs[identity]) {
			stubs[identity].exits = true;
		} else {
			const type = relRoom.rel.tags.filter(tag =>
				tag >= constants.TAG_REL_HOME &&
				tag <= constants.TAG_REL_HOMETOWN
			)[0];

			if (changedRels[type]) {
				removable.push(relRoom.rel);
			} else {
				all.push({ identity, type, name: relRoom.room.name });
			}
		}
	}

	for (const identity in stubs) {
		const stub = stubs[identity];

		all.push(stub);
		if (!stub.exists) { addable.push(stub); }
	}

	// TODO: Find multi-criteria rooms.
	// TODO: Filter addable rooms by creatability.
	// TODO: Create addable rooms that don’t exist.

	pg.read(config.connStr, {
		$: 'SELECT * FROM "rooms" WHERE identities && &{idents}',
		idents: addable.map(a => a.iddentity)
	}, (err, rooms) => {
		if (err) { winston.error(err); return; }
		for (let room of rooms) {
			room = new Room(room);

			const stub = stubs[room.identities.filter(
				ident => ident.substr(0, 6) === 'place:'
			)[0]];

			if (stub) stub.id = room.id;
		}

		addRooms(change, addable);
		addRels(change, user, addable);
		removeRels(change, removable);

		bus.emit('change', { entities: change, source: 'belong' });
	});
}

bus.on('change', change => {

	/* While the work of this module is asynchronous, it will allow
	the change to continue immediately and emit a new change when the
	work is complete. */

	if (change.entities) { for (const id in change.entities) {
		const user = change.entities[id],
			promises = [ user ];

		if (
			user.type !== constants.TYPE_USER ||
			!user.params || !user.params.profile
		) { continue; }

		/* Fetch the current rooms of this user. */
		promises.push(new Promise((resolve, reject) => {
			cache.query({
				type: 'rel',
				link: { room: 'item' },
				filter: { user: id, roles_cts: [ constants.ROLE_FOLLOWER ] },
				order: 'roleTime'
			}, [ -Infinity, Infinity ], (err, results) => {
				if (err) { reject(err); return; }
				resolve(results);
			});
		}));

		if (user.params.profile) {
			const {
				home,
				work,
				hometown
			} = user.params.profile;

			if (home && home.id) {
				promises.push(place.getStubset(home.id));
			}

			if (work && work.id) {
				promises.push(place.getStubset(work.id));
			}

			if (hometown && hometown.id) {
				promises.push(place.getStubset(hometown.id));
			}
		}

		Promise.all(promises)
		.then(sendInvitations)
		.catch(err => winston.error(err));
	} }
});