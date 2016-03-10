/* @flow */

import { bus, cache } from '../../core-client';
import { subscribe, on } from '../store/store';
import { setPresence, setItemPresence } from '../store/actions';

subscribe({ type: 'state', path: 'connectionStatus', source: 'presence' }, status => {
	if (status === 'online') {
		cache.getState([ 'user' ], id => {
			if (id) {
				bus.emit('change', setPresence(id, 'online'));
			}
		});
	}
});

on('subscribe', options => {
	if (options.slice) {
		const { slice } = options;

		const id = cache.getState([ 'user' ]);

		if (id) {
			switch (slice.type) {
			case 'thread':
				const room = slice.filter.parents_cts[0];

				cache.getEnity(`${id}_${room}`, (err, result) => {
					setItemPresence('room', room, id, 'online', !!result);
				});
				break;
			case 'text':
				const thread = slice.filter.parents_cts[0];

				cache.getEnity(`${id}_${thread}`, (err, result) => {
					setItemPresence('thread', thread, id, 'online', !!result);
				});
				break;
			}
		}
	}
});

on('unsubscribe', options => {
	if (options.slice) {
		const { slice } = options;

		const id = cache.getState([ 'user' ]);

		if (id) {
			switch (slice.type) {
			case 'thread':
				const room = slice.filter.parents_cts[0];

				cache.getEnity(`${id}_${room}`, (err, result) => {
					setItemPresence('room', room, id, 'offline', !!result);
				});
				break;
			case 'text':
				const thread = slice.filter.parents_cts[0];

				cache.getEnity(`${id}_${thread}`, (err, result) => {
					setItemPresence('thread', thread, id, 'offline', !!result);
				});
				break;
			}
		}
	}
});
