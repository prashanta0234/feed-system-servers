'use strict';

/**
 * cookie-auth policy
 *
 * Our services (see authentication-service) hand the access token to the
 * browser as an httpOnly cookie called `access_token`, NOT as an
 * Authorization header. express-gateway's built-in `jwt` policy can only
 * read the token from a header/query/bearer, so before it runs we copy the
 * cookie value into `Authorization: Bearer <token>`. The downstream `jwt`
 * policy then verifies it like any normal bearer token.
 *
 * Only runs when there is no Authorization header already, so callers that
 * DO send a bearer token (e.g. service-to-service) keep working unchanged.
 */
module.exports = {
  version: '1.0.0',
  schema: {
    $id: 'http://express-gateway.io/schemas/plugins/cookie-auth.json',
    type: 'object',
    properties: {}
  },
  init(pluginContext) {
    pluginContext.registerPolicy({
      name: 'cookie-auth',
      schema: {
        $id: 'http://express-gateway.io/schemas/policies/cookie-auth.json',
        type: 'object',
        properties: {
          cookieName: {
            type: 'string',
            default: 'access_token',
            description: 'Name of the cookie that holds the access token.'
          }
        }
      },
      policy: (actionParams) => {
        const cookieName = actionParams.cookieName || 'access_token';

        return (req, res, next) => {
          if (!req.headers.authorization && req.headers.cookie) {
            const prefix = cookieName + '=';
            const hit = req.headers.cookie
              .split(';')
              .map((c) => c.trim())
              .find((c) => c.startsWith(prefix));

            if (hit) {
              const token = decodeURIComponent(hit.slice(prefix.length));
              if (token) {
                req.headers.authorization = 'Bearer ' + token;
              }
            }
          }
          next();
        };
      }
    });
  }
};
