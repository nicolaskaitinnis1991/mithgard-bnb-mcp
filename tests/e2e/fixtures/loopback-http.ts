// Loaded only by the EOF regression child. All Undici connections are routed
// to the parent-owned loopback server; no external DNS or provider calls occur.
import { connect } from 'node:net';
import { Agent, setGlobalDispatcher } from 'undici';

const port = Number(process.env.OPS_TEST_HTTP_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('Invalid test port');
setGlobalDispatcher(
  new Agent({
    connect: (_options, callback) => {
      const socket = connect({ host: '127.0.0.1', port });
      socket.once('connect', () => {
        callback(null, socket);
      });
      socket.once('error', (error) => {
        callback(error, null);
      });
    },
  }),
);
