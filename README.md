# Crossplane Function Template - TypeScript

A template for building Crossplane composition functions in TypeScript using the [@crossplane-org/function-sdk-typescript](https://github.com/upbound/function-sdk-typescript).

## Overview

This template provides a starting point for developing Crossplane functions that can transform, validate, and generate Kubernetes resources within Crossplane compositions. The example function creates sample Deployment and Pod resources.

## Prerequisites

- Node.js 24 or later recommended.
- npm
- Docker (for building container images)
- TypeScript 5+ or TypeScript 7 (tsgo)

## Project Structure

```text
.
├── src/                 # Source files
│   ├── function.ts      # Main function implementation
│   ├── function.test.ts # Function tests
│   ├── test-helpers.ts  # Test utilities for loading YAML test cases
│   └── main.ts          # Entry point and server setup
├── test-cases/          # YAML-based test cases
│   └── basic-app.yaml   # Example test case
├── scripts/             # Build and deployment scripts
│   ├── function-docker-build.sh
│   ├── function-xpkg-build.sh
│   ├── function-xpkg-push.sh
│   ├── configuration-xpkg-build.sh
│   └── configuration-xpkg-push.sh
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── jest.config.js       # Jest test configuration
├── eslint.config.js     # ESLint configuration
├── .prettierrc.json     # Prettier configuration
└── Dockerfile           # Container image definition
```

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Development

### Build TypeScript

Compile TypeScript to JavaScript using TypeScript 5:

```bash
npm run tsc
```

TypeScript 7 (tsgo) is the default engine for the build:

```bash
npm run build
# or
npm run tsgo
```

### Type Checking

Check types without emitting files:

```bash
npm run check-types
```

### Testing

Run tests using Jest:

```bash
npm test
```

Tests are written in [src/function.test.ts](src/function.test.ts) and use YAML-based test cases from the [test-cases/](test-cases/) directory.

### Linting and Formatting

The project includes ESLint and Prettier for code quality:

```bash
# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

### Running Locally

Run the function server in insecure mode for local testing:

```bash
npm run local
# or
node dist/main.js --insecure --debug
```

### Available CLI Options

- `--address` - Address to listen for gRPC connections (default: `0.0.0.0:9443`)
- `-d, --debug` - Enable debug logging
- `--insecure` - Run without mTLS credentials (for local development)
- `--tls-server-certs-dir` - Directory containing mTLS certificates (default: `/tls/server`)

## Building and Packaging

### Docker Build

Build the container image:

```bash
npm run function-docker-build
# or
docker build -t function-template-typescript .
```

The Dockerfile uses a multi-stage build:

1. **Build stage**: Uses `node:25` to install dependencies and compile TypeScript
2. **Runtime stage**: Uses `gcr.io/distroless/nodejs24-debian12` for a minimal, secure runtime

Refer to the [`scripts`](./scripts/) directory for examples of multi-platform builds.

### Package as Crossplane Function

Build the function as a Crossplane package (xpkg):

```bash
# Build the function package
npm run function-xpkg-build

# Push to a registry
npm run function-xpkg-push

# Build and push in one step
npm run function-build-all
```

### Configuration Package

Build a Crossplane configuration package:

```bash
# Build configuration package
npm run configuration-xpkg-build

# Push configuration package
npm run configuration-xpkg-push
```

All build scripts are located in the [scripts/](scripts/) directory and can be customized for your needs.

## Implementation Guide

### Creating Your Function

Edit [src/function.ts](src/function.ts) to implement your function logic. The main interface is:

```typescript
export class Function implements FunctionHandler {
  async RunFunction(req: RunFunctionRequest, logger?: Logger): Promise<RunFunctionResponse> {
    // Your function logic here
  }
}
```

### Key SDK Functions

The SDK provides helper functions for working with Crossplane resources:

- `getObservedCompositeResource(req)` - Get the observed composite resource (XR)
- `getDesiredCompositeResource(req)` - Get the desired composite resource
- `getObservedComposedResources(req)` - Get observed composed resources
- `getDesiredComposedResources(req)` - Get desired composed resources
- `setDesiredComposedResources(rsp, resources)` - Set desired composed resources
- `Resource.fromJSON()` - Create resources from JSON
- `normal(rsp, message)` - Add a normal condition to the response
- `fatal(rsp, message)` - Add a fatal condition to the response
- `to(req)` - Create a minimal response from a request

See [src/function.ts](src/function.ts) for examples of using these SDK functions.

### Example: Creating a Resource

```typescript
import { Resource } from '@crossplane-org/function-sdk-typescript';

// Create from JSON
const resource = Resource.fromJSON({
  resource: {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'my-config',
      namespace: 'default',
    },
    data: {
      key: 'value',
    },
  },
});

// Add to desired composed resources
desiredComposed['my-config'] = resource;
```

### Using Kubernetes Models

The template includes [kubernetes-models](https://github.com/tommy351/kubernetes-models-ts) for type-safe K8s resource creation:

```typescript
import { Pod } from 'kubernetes-models/v1';

const pod = new Pod({
  metadata: {
    name: 'my-pod',
    namespace: 'default',
  },
  spec: {
    containers: [
      {
        name: 'app',
        image: 'nginx:latest',
      },
    ],
  },
});

pod.validate(); // Validate the resource

desiredComposed['my-pod'] = Resource.fromJSON({ resource: pod.toJSON() });
```

### Testing Your Function

Create YAML test cases in the [test-cases/](test-cases/) directory. Each test case defines:

- Input: The observed composite resource and context
- Expected: Resource counts, types, and validation rules

See [test-cases/basic-app.yaml](test-cases/basic-app.yaml) for an example. Tests use [src/test-helpers.ts](src/test-helpers.ts) to load and validate YAML test cases.

## TypeScript Configuration

This template uses strict TypeScript settings:

- `strict: true` - All strict type checking options
- `noUncheckedIndexedAccess: true` - Safer array/object access
- `exactOptionalPropertyTypes: true` - Stricter optional properties
- `verbatimModuleSyntax: true` - Explicit import/export syntax

The SDK directory is excluded from compilation to avoid conflicts with different TypeScript settings.

## Dependencies

### Production Dependencies

- `@crossplane-org/function-sdk-typescript` - Crossplane function SDK
- `commander` - CLI argument parsing
- `pino` - Structured logging
- `kubernetes-models` - Type-safe Kubernetes resource models
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
- `yaml` - YAML parsing for test cases

### Dev Dependencies

- `@typescript/native-preview` - TypeScript 7 (tsgo) native preview tooling
- `jest` - Testing framework
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - Jest type definitions
- `eslint` - Linting
- `typescript-eslint` - TypeScript ESLint plugin
- `prettier` - Code formatting
- `glob` - File pattern matching for test discovery

## Notes

- The SDK is now available as `@crossplane-org/function-sdk-typescript` on npm
- mTLS is enabled by default when running in production (disable with `--insecure` for local dev)
- Tests are automatically discovered from YAML files in the [test-cases/](test-cases/) directory
- Build scripts in [scripts/](scripts/) handle Docker and xpkg packaging

## Troubleshooting

### TypeScript Compilation Errors

If you encounter TypeScript errors:

1. Run `npm install` to ensure dependencies are properly installed
2. Try clearing the build directory: `npm run clean`
3. Check that TypeScript version is 5+ or use tsgo (TypeScript 7)

### Test Failures

If tests fail:

1. Verify test case YAML files are properly formatted in [test-cases/](test-cases/)
2. Check that expected resources match what your function generates
3. Run tests with verbose output: `NODE_OPTIONS=--experimental-vm-modules jest --verbose`

### Docker Build Failures

If the Docker build fails:

1. Ensure all dependencies in [package.json](package.json) are available
2. Check that the build completes successfully locally first: `npm run build`
3. Verify Docker has access to the project directory

## License

Apache-2.0

## Author

Steven Borrelli <steve@borrelli.org>
