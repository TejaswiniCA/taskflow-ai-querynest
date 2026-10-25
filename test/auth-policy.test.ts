import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedVerifiedEmail,
  isLocalDevelopmentAuthEnabled,
  isLoopbackHost,
  normalizeEmail,
} from '../src/lib/auth-policy';

describe('Allowed Google account policy', () => {
  it('normalizes email case and surrounding whitespace', () => {
    assert.equal(normalizeEmail('  Owner@Example.com '), 'owner@example.com');
    assert.equal(normalizeEmail('  '), null);
  });

  it('allows only the configured email when the provider verified it', () => {
    assert.equal(
      isAllowedVerifiedEmail('OWNER@example.com', true, 'owner@example.com'),
      true
    );
    assert.equal(
      isAllowedVerifiedEmail('owner@example.com', false, 'owner@example.com'),
      false
    );
    assert.equal(
      isAllowedVerifiedEmail('other@example.com', true, 'owner@example.com'),
      false
    );
  });

  it('fails closed when no allowlisted address is configured', () => {
    assert.equal(isAllowedVerifiedEmail('owner@example.com', true, undefined), false);
  });
});

describe('Local development authentication gate', () => {
  it('requires both the development environment and the exact opt-in flag', () => {
    assert.equal(isLocalDevelopmentAuthEnabled('development', 'true'), true);
    assert.equal(isLocalDevelopmentAuthEnabled('production', 'true'), false);
    assert.equal(isLocalDevelopmentAuthEnabled('development', 'false'), false);
    assert.equal(isLocalDevelopmentAuthEnabled('development', undefined), false);
  });

  it('accepts only loopback hostnames', () => {
    assert.equal(isLoopbackHost('localhost:3000'), true);
    assert.equal(isLoopbackHost('127.0.0.1:3000'), true);
    assert.equal(isLoopbackHost('[::1]:3000'), true);
    assert.equal(isLoopbackHost('192.168.1.20:3000'), false);
    assert.equal(isLoopbackHost(null), false);
  });
});
