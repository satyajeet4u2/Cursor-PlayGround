/** OpenAPI 3.0 specification for Ops Cases API */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Ops Cases API',
    version: '1.0.0',
    description:
      'REST API for enterprise case management: auth, cases, status transitions, and audit trail.',
  },
  servers: [
    { url: '/', description: 'Current deployment' },
    { url: '/api', description: 'Current deployment with API prefix' },
    { url: 'http://localhost:4000', description: 'Local development' },
  ],
  tags: [
    { name: 'Health', description: 'Service health' },
    { name: 'Auth', description: 'Authentication' },
    { name: 'Cases', description: 'Case CRUD and listing' },
    { name: 'Transitions', description: 'Workflow status transitions' },
    { name: 'Audit', description: 'Case audit history' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT from POST /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INVALID_TRANSITION' },
              message: { type: 'string', example: 'Cannot perform "start_work" from status "draft"' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'agent@demo.ops' },
          password: { type: 'string', format: 'password', example: 'demo1234' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          userId: { type: 'string', description: 'Present on GET /auth/me' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['manager', 'agent'] },
        },
      },
      CaseStatus: {
        type: 'string',
        enum: [
          'draft',
          'assigned',
          'in_progress',
          'pending_review',
          'on_hold',
          'closed',
        ],
      },
      CaseVerdict: {
        type: 'string',
        enum: ['cleared', 'discrepant'],
        nullable: true,
      },
      CaseAction: {
        type: 'string',
        enum: [
          'assign',
          'start_work',
          'submit_review',
          'close_cleared',
          'close_discrepant',
          'put_on_hold',
          'resume',
        ],
      },
      Case: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          caseNumber: { type: 'string', example: 'CASE-2026-0001' },
          clientId: { type: 'string' },
          assigneeId: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/CaseStatus' },
          caseType: { type: 'string', example: 'inventory_audit' },
          dueAt: { type: 'string', format: 'date-time', nullable: true },
          slaBreachedAt: { type: 'string', format: 'date-time', nullable: true },
          verdict: { $ref: '#/components/schemas/CaseVerdict' },
          closedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuditEvent: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          caseId: { type: 'string' },
          action: { $ref: '#/components/schemas/CaseAction' },
          fromStatus: { $ref: '#/components/schemas/CaseStatus' },
          toStatus: { $ref: '#/components/schemas/CaseStatus' },
          actorId: { type: 'string' },
          at: { type: 'string', format: 'date-time' },
          metadata: { type: 'object', additionalProperties: true },
        },
      },
      TransitionRequest: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { $ref: '#/components/schemas/CaseAction' },
          assigneeId: {
            type: 'string',
            description: 'Required when action is assign (manager only)',
          },
        },
      },
      TransitionResponse: {
        type: 'object',
        properties: {
          case: { $ref: '#/components/schemas/Case' },
          auditEvent: { $ref: '#/components/schemas/AuditEvent' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'ok' } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in',
        description: 'Returns a JWT valid for 8 hours.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user from JWT',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'JWT claims',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/cases': {
      get: {
        tags: ['Cases'],
        summary: 'List cases',
        description: 'Returns up to 100 cases, newest first.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Case list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cases: { type: 'array', items: { $ref: '#/components/schemas/Case' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/cases/{id}': {
      get: {
        tags: ['Cases'],
        summary: 'Get case by ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Case',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { case: { $ref: '#/components/schemas/Case' } },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/cases/{id}/audit': {
      get: {
        tags: ['Audit'],
        summary: 'Audit trail for a case',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Audit events (newest first)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: { type: 'array', items: { $ref: '#/components/schemas/AuditEvent' } },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Case not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/cases/{id}/transitions': {
      post: {
        tags: ['Transitions'],
        summary: 'Apply workflow transition',
        description:
          'Server-enforced FSM. Agents may only transition assigned cases. Managers may close, hold, and resume.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TransitionRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Transition applied',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TransitionResponse' } },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Forbidden (wrong role or not assignee)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Case not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '409': { description: 'Invalid transition for current status', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
} as const;
