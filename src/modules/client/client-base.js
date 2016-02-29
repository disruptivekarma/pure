/* @flow */

// $FlowFixMe: Flow cannot find ignored modules
import 'babel-polyfill';
import '../session/session-client';
import '../socket/socket-client';
import '../store/stateManager';
import '../store/storeHelpers';

if (process.env.NODE_ENV !== 'production') {
	require('../client-test/client-test');
}
