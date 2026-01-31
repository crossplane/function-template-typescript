import { describe, it, expect } from '@jest/globals';
import { Function } from './function.js';
import { loadTestCases, assertTestCase } from './test-helpers.js';
import { to } from '@crossplane-org/function-sdk-typescript';
import { glob } from 'glob';

describe('Function', () => {
  it('should create a Function instance', () => {
    const fn = new Function();
    expect(fn).toBeInstanceOf(Function);
  });

  // Load and run all test cases from YAML files
  const testCaseFiles = glob.sync('test-cases/**/*.yaml');

  testCaseFiles.forEach((file) => {
    const testCases = loadTestCases(file);

    testCases.forEach((testCase) => {
      it(`${testCase.name} (${file})`, async () => {
        const fn = new Function();

        // Build a complete request from the test input
        // Use to() to ensure proper protobuf structure - it should preserve observed
        const req = to(testCase.input) as any;
        // Manually add observed since to() doesn't preserve it
        if (testCase.input.observed) {
          req.observed = testCase.input.observed;
        }

        // Run the function with the test input
        const response = await fn.RunFunction(req);

        // Assert the results match expectations
        assertTestCase(response, testCase);
      });
    });
  });

  it('should create deployment with correct configuration', async () => {
    const fn = new Function();

    // Create a minimal request
    const baseInput = {
      meta: {
        tag: 'test',
      },
      observed: {
        composite: {
          resource: {
            apiVersion: 'platform.upbound.io/v1',
            kind: 'App',
            metadata: {
              name: 'test-app',
            },
          },
        },
      },
      desired: {
        composite: {
          resource: {},
        },
      },
    };

    const req = to(baseInput);
    const response = await fn.RunFunction(req);

    expect(response).toBeDefined();
    expect(response.desired).toBeDefined();
    expect(response.desired?.resources).toBeDefined();

    // Check deployment exists
    const deployment = response.desired?.resources?.['deployment'];
    expect(deployment).toBeDefined();
    expect(deployment?.resource?.kind).toBe('Deployment');
    expect(deployment?.resource?.apiVersion).toBe('apps/v1');

    // Verify no service or ingress created (no config provided)
    expect(response.desired?.resources?.['service']).toBeUndefined();
    expect(response.desired?.resources?.['ingress']).toBeUndefined();
    expect(response.desired?.resources?.['serviceaccount']).toBeUndefined();
  });
});
