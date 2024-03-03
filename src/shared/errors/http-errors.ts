export const httpErrors = {
  badRequestError: {
    status: 400,
    description: 'Bad Request',
    schema: {
      example: {
        statusCode: 400,
        message: 'any',
        error: 'Bad Request',
      },
    },
  },
  unauthorizedError: {
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        statusCode: 401,
        message: 'any',
        error: 'Unauthorized',
      },
    },
  },
  forbiddenError: {
    status: 403,
    description: 'Forbidden',
    schema: {
      example: {
        statusCode: 403,
        message: 'any',
        error: 'Forbidden',
      },
    },
  },
  notFoundError: {
    status: 404,
    description: 'Not Found',
    schema: {
      example: {
        statusCode: 404,
        message: 'any',
        error: 'Not Found',
      },
    },
  },
  conflictError: {
    status: 409,
    description: 'Conflict',
    schema: {
      example: {
        statusCode: 409,
        message: 'any',
        error: 'Conflict',
      },
    },
  },
  internalServerError: {
    status: 500,
    description: 'Internal Server Error',
    schema: {
      example: {
        statusCode: 500,
        message: 'any',
        error: 'Internal Server Error',
      },
    },
  },
  notImplementedError: {
    status: 501,
    description: 'Not Implemented',
    schema: {
      example: {
        statusCode: 501,
        message: 'any',
        error: 'Not Implemented',
      },
    },
  },
};
