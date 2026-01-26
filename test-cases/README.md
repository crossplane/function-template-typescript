# Test Cases

This directory contains test cases for the Crossplane TypeScript function. Test cases can be written in either YAML or JSON format and are automatically loaded by the test suite.

## Running Tests

Run all tests including test case files:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm test -- --watch
```

## Test Case Format

Each test case file should define one or more test cases with the following structure:

### YAML Format

```yaml
---
name: Test Case Name
description: Optional description of what this test validates

input:
  observed:
    composite:
      resource:
        apiVersion: example.crossplane.io/v1alpha1
        kind: App
        metadata:
          name: test-app
          namespace: default
        spec:
          parameters:
            name: test-app

    # Optional: Include observed resources with status
    resources:
      deployment:
        resource:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            annotations:
              crossplane.io/composition-resource-name: deployment
            name: my-deployment
          status:
            readyReplicas: 3

expected:
  # Expected number of resources to be created
  resourceCount: 2

  # Expected resource types (partial list)
  resourceTypes:
    - Deployment
    - Pod

  # Specific resource assertions (partial match) - map format
  resources:
    deployment:
      kind: Deployment
      apiVersion: apps/v1
      metadata:
        namespace: foo
      spec:
        replicas: 3
        selector:
          matchLabels:
            app: my-app

    pod:
      kind: Pod
      apiVersion: v1
      metadata:
        namespace: default
      spec:
        containers: []

  # Expected status fields on the composite resource (optional)
  status:
    ready: true
```

### JSON Format

```json
{
  "name": "Test Case Name",
  "description": "Optional description",
  "input": {
    "observed": {
      "composite": {
        "resource": {
          "apiVersion": "example.crossplane.io/v1alpha1",
          "kind": "App",
          "metadata": {
            "name": "test-app"
          },
          "spec": {
            "parameters": {
              "name": "test-app"
            }
          }
        }
      }
    }
  },
  "expected": {
    "resourceCount": 2,
    "resourceTypes": ["Deployment", "Pod"]
  }
}
```

## Expected Assertions

The test framework supports several types of assertions:

### Resource Count

```yaml
expected:
  resourceCount: 2
```

Validates that exactly 2 resources are created.

### Resource Types

```yaml
expected:
  resourceTypes:
    - Deployment
    - Pod
```

Validates that these resource kinds are present in the output (doesn't need to be exhaustive).

### Specific Resources

Resources are specified as a **map** where keys are resource names:

```yaml
expected:
  resources:
    deployment:
      kind: Deployment
      apiVersion: apps/v1
      metadata:
        namespace: foo
      spec:
        replicas: 3
        selector:
          matchLabels:
            app: my-app
        template:
          metadata:
            labels:
              app: my-app

    pod:
      kind: Pod
      apiVersion: v1
      metadata:
        namespace: default
      spec:
        containers: []
```

This format:

- **Mirrors the input structure** (consistent with `input.observed.resources`)
- Makes it easy to reference specific resources by name
- Validates with **partial match** - only the fields you specify are checked

Benefits:

- Check specific fields without listing every field
- Validate nested properties
- Focus assertions on what's important for each test case

### Composite Status

```yaml
expected:
  status:
    ready: true
    message: 'Resources created successfully'
```

Validates the status fields set on the composite resource (partial match).

## Testing with Observed Resources

Observed resources simulate what Crossplane passes to your function when resources already exist in the cluster with status information from the provider. This is useful for testing:

- **Status Propagation**: Verify that resource status information is correctly handled
- **Reconciliation**: Test how your function behaves when resources already exist
- **Update Scenarios**: Simulate updating existing infrastructure

### Example with Observed Resources

```yaml
input:
  observed:
    composite:
      resource:
        # Your composite resource spec

    resources:
      deployment:
        resource:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            annotations:
              crossplane.io/composition-resource-name: deployment
            name: my-deployment
            namespace: foo
          spec:
            replicas: 3
          status:
            readyReplicas: 3
            availableReplicas: 3

expected:
  # Verify status handling
  status:
    ready: true
```

This simulates the scenario where:

1. Crossplane has already created the Deployment resource
2. The Kubernetes API has reconciled it and set the status fields
3. Your function receives this observed state and can use it to update the composite status

## Examples

See the existing test case files in this directory:

- [basic-app.yaml](./basic-app.yaml) - Basic application with Deployment and Pod resources

## Writing Your Own Test Cases

1. Create a new `.yaml` or `.json` file in this directory
2. Define your test case(s) following the format above
3. Run `npm test` - the test suite will automatically discover and run your test cases

### Tips

- Use partial matching to focus on the most important assertions
- Group related test cases in the same file (multiple YAML documents or JSON array)
- Use descriptive names and descriptions to document what each test validates
- Start with simple tests validating resource counts and types, then add more specific assertions
- Test both successful scenarios and error conditions

## Test Helper API

The test framework provides several helper functions in [test-helpers.ts](../test-helpers.ts):

- `loadTestCases(filePath)` - Load test cases from YAML or JSON
- `assertTestCase(response, testCase)` - Run all assertions for a test case
- `assertResources(response, expectedResources)` - Assert specific resources
- `assertStatus(response, expectedStatus)` - Assert composite status
- `assertResourceCount(response, count)` - Assert resource count
- `assertResourceTypes(response, types)` - Assert resource types exist

You can use these directly in custom tests in [function.test.ts](../function.test.ts).
