import {
  Resource,
  RunFunctionRequest,
  RunFunctionResponse,
  fatal,
  normal,
  setDesiredComposedResources,
  to,
  getDesiredComposedResources,
  getDesiredCompositeResource,
  getObservedCompositeResource,
  type FunctionHandler,
  type Logger,
} from '@crossplane-org/function-sdk-typescript';
import { Service, ServiceAccount } from 'kubernetes-models/v1';
import { Deployment } from 'kubernetes-models/apps/v1';
import { Ingress } from 'kubernetes-models/networking.k8s.io/v1';

/**
 * Ingress path configuration
 */
interface IngressPath {
  path: string;
  pathType?: string;
}

/**
 * Ingress host configuration
 */
interface IngressHost {
  host: string;
  paths: IngressPath[];
}

/**
 * Ingress TLS configuration
 */
interface IngressTLS {
  secretName: string;
  hosts: string[];
}

/**
 * Function is a sample implementation showing how to use the SDK
 */
export class Function implements FunctionHandler {
  // Note: This implementation is currently synchronous. When adding async operations
  // (e.g., API calls, database queries), use await with those operations.
  // eslint-disable-next-line @typescript-eslint/require-await
  async RunFunction(req: RunFunctionRequest, logger?: Logger): Promise<RunFunctionResponse> {
    const startTime = Date.now();

    // Set up a minimal response from the request
    let rsp = to(req);

    try {
      // Get our Observed Composite
      const observedComposite = getObservedCompositeResource(req);
      logger?.debug({ observedComposite }, 'Observed composite resource');

      // Get our Desired Composite
      const desiredComposite = getDesiredCompositeResource(req);
      logger?.debug({ desiredComposite }, 'Desired composite resource');

      // List the Desired Composed resources
      const desiredComposed = getDesiredComposedResources(req);

      // Extract parameters from XR spec
      const name = observedComposite?.resource?.metadata?.name;
      if (!name) {
        fatal(rsp, 'Composite resource name is required');
        return rsp;
      }
      const params = observedComposite?.resource?.spec?.parameters || {};
      const deploymentConfig = params.deployment || {};
      const imageConfig = deploymentConfig.image || {};
      const serviceConfig = params.service || {};
      const ingressConfig = params.ingress || {};
      const serviceAccountConfig = params.serviceAccount || {};

      // Common metadata for all resources
      const commonMetadata = {
        labels: {
          'app.kubernetes.io/name': name,
          'app.kubernetes.io/instance': name,
          'app.kubernetes.io/managed-by': 'crossplane',
        },
      };

      // Create ServiceAccount if enabled
      if (serviceAccountConfig.create) {
        const serviceAccount = new ServiceAccount({
          metadata: {
            ...commonMetadata,
            name: serviceAccountConfig.name || name,
            annotations: {
              ...(serviceAccountConfig.annotations || {}),
            },
          },
          automountServiceAccountToken: serviceAccountConfig.automount ?? true,
        });

        desiredComposed['serviceaccount'] = Resource.fromJSON({
          resource: serviceAccount.toJSON(),
        });
      }

      // Create Service if config is provided
      if (serviceConfig && Object.keys(serviceConfig).length > 0) {
        const service = new Service({
          metadata: {
            ...commonMetadata,
          },
          spec: {
            type: serviceConfig.type || 'ClusterIP',
            ports: [
              {
                port: serviceConfig.port || 80,
                targetPort: 'http',
                protocol: 'TCP',
                name: 'http',
              },
            ],
            selector: {
              'app.kubernetes.io/name': name,
              'app.kubernetes.io/instance': name,
            },
          },
        });

        desiredComposed['service'] = Resource.fromJSON({
          resource: service.toJSON(),
        });
      }

      const deployment = new Deployment({
        metadata: {
          ...commonMetadata,
          annotations: {
            ...(deploymentConfig.podAnnotations || {}),
          },
        },
        spec: {
          replicas: deploymentConfig.replicaCount || 1,
          selector: {
            matchLabels: {
              'app.kubernetes.io/name': name,
              'app.kubernetes.io/instance': name,
            },
          },
          template: {
            metadata: {
              labels: {
                'app.kubernetes.io/name': name,
                'app.kubernetes.io/instance': name,
                ...(deploymentConfig.podLabels && deploymentConfig.podLabels),
              },
              ...(deploymentConfig.podAnnotations && {
                annotations: deploymentConfig.podAnnotations,
              }),
            },
            spec: {
              ...((serviceAccountConfig.create === true || serviceAccountConfig.name) && {
                serviceAccountName: serviceAccountConfig.name || name,
              }),
              ...(deploymentConfig.podSecurityContext && {
                securityContext: deploymentConfig.podSecurityContext,
              }),
              ...(deploymentConfig.nodeSelector && {
                nodeSelector: deploymentConfig.nodeSelector,
              }),
              ...(deploymentConfig.tolerations && {
                tolerations: deploymentConfig.tolerations,
              }),
              ...(deploymentConfig.affinity && {
                affinity: deploymentConfig.affinity,
              }),
              ...(deploymentConfig.volumes && {
                volumes: deploymentConfig.volumes,
              }),
              containers: [
                {
                  name: name,
                  image: `${imageConfig.repository || 'nginx'}:${imageConfig.tag || 'latest'}`,
                  imagePullPolicy: imageConfig.pullPolicy || 'IfNotPresent',
                  ports: [
                    {
                      name: 'http',
                      containerPort: serviceConfig.port || 80,
                      protocol: 'TCP',
                    },
                  ],
                  ...(deploymentConfig.securityContext && {
                    securityContext: deploymentConfig.securityContext,
                  }),
                  ...(deploymentConfig.resources && {
                    resources: deploymentConfig.resources,
                  }),
                  ...(deploymentConfig.livenessProbe && {
                    livenessProbe: deploymentConfig.livenessProbe,
                  }),
                  ...(deploymentConfig.readinessProbe && {
                    readinessProbe: deploymentConfig.readinessProbe,
                  }),
                  ...(deploymentConfig.volumeMounts && {
                    volumeMounts: deploymentConfig.volumeMounts,
                  }),
                },
              ],
            },
          },
        },
      });

      desiredComposed['deployment'] = Resource.fromJSON({
        resource: deployment.toJSON(),
      });

      // Create Ingress if config is provided
      if (ingressConfig && Object.keys(ingressConfig).length > 0) {
        const ingress = new Ingress({
          metadata: {
            ...commonMetadata,
            annotations: {
              ...(ingressConfig.annotations || {}),
            },
          },
          spec: {
            ...(ingressConfig.className && {
              ingressClassName: ingressConfig.className,
            }),
            ...(ingressConfig.hosts && {
              rules: ingressConfig.hosts.map((hostConfig: IngressHost) => ({
                host: hostConfig.host,
                http: {
                  paths: hostConfig.paths.map((pathConfig: IngressPath) => ({
                    path: pathConfig.path,
                    pathType: pathConfig.pathType || 'ImplementationSpecific',
                    backend: {
                      service: {
                        name: name,
                        port: {
                          number: serviceConfig.port || 80,
                        },
                      },
                    },
                  })),
                },
              })),
            }),
            ...(ingressConfig.tls &&
              ingressConfig.tls.length > 0 && {
                tls: ingressConfig.tls
                  .map((tlsEntry: IngressTLS) => {
                    // Validate that hosts are present for each TLS entry
                    if (!tlsEntry.hosts || tlsEntry.hosts.length === 0) {
                      logger?.warn(
                        { secretName: tlsEntry.secretName },
                        'TLS entry has no hosts defined, skipping'
                      );
                      return null;
                    }
                    return {
                      secretName: tlsEntry.secretName,
                      hosts: tlsEntry.hosts,
                    };
                  })
                  .filter((entry: IngressTLS | null) => entry !== null),
              }),
          },
        });

        desiredComposed['ingress'] = Resource.fromJSON({
          resource: ingress.toJSON(),
        });
      }

      // Merge desiredComposed with existing resources using the response helper
      rsp = setDesiredComposedResources(rsp, desiredComposed);

      const duration = Date.now() - startTime;
      logger?.info({ duration: `${duration}ms` }, 'Function completed successfully');

      normal(rsp, 'processing complete');
      return rsp;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger?.error(
        {
          error: error instanceof Error ? error.message : String(error),
          duration: `${duration}ms`,
        },
        'Function invocation failed'
      );

      fatal(rsp, error instanceof Error ? error.message : String(error));
      return rsp;
    }
  }
}
