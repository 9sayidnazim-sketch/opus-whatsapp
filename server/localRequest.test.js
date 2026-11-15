import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalRequest } from './localRequest.js';

const request = (remoteAddress, headers = {}) => ({
  socket: { remoteAddress },
  headers: { host: 'localhost:5173', ...headers },
});

test('the Settings tester on this machine is allowed', () => {
  assert.equal(isLocalRequest(request('127.0.0.1', { origin: 'http://localhost:5173' })), true);
  assert.equal(isLocalRequest(request('::1', { host: '[::1]:5173', origin: 'http://[::1]:5173' })), true);
  assert.equal(isLocalRequest(request('::ffff:127.0.0.1', { host: '127.0.0.1:5173', origin: 'http://127.0.0.1:5173' })), true);
});

test('curl on this machine (no Origin) is allowed', () => {
  assert.equal(isLocalRequest(request('127.0.0.1')), true);
});

test('another device on the network is refused', () => {
  assert.equal(isLocalRequest(request('192.168.1.20', { host: '192.168.1.10:5173' })), false);
  assert.equal(isLocalRequest(request('192.168.1.20', { host: 'localhost:5173' })), false);
  assert.equal(isLocalRequest(request('fe80::1', { host: 'localhost:5173' })), false);
});

test('a request with no socket address is refused', () => {
  assert.equal(isLocalRequest({ headers: { host: 'localhost:5173' } }), false);
});

test('DNS rebinding (foreign Host on a loopback connection) is refused', () => {
  assert.equal(isLocalRequest(request('127.0.0.1', { host: 'attacker.example:5173' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { host: '127.0.0.1.nip.io:5173' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { host: 'localhost:5173@attacker.example' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { host: '' })), false);
});

test('tunnels and local proxies are refused', () => {
  assert.equal(isLocalRequest(request('127.0.0.1', { host: 'abc123.ngrok-free.app' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { 'x-forwarded-for': '203.0.113.9' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { 'cf-connecting-ip': '203.0.113.9' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { forwarded: 'for=203.0.113.9' })), false);
});

test('cross-site requests from the same browser are refused', () => {
  assert.equal(isLocalRequest(request('127.0.0.1', { origin: 'https://attacker.example' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { origin: 'http://localhost:3000' })), false);
  assert.equal(isLocalRequest(request('127.0.0.1', { origin: 'null' })), false);
});
