import {
  composeUserName,
  normalizeUserNamePart,
} from '#src/modules/users/index.js';

type JsonRecord = Record<string, unknown>;

export type BetterAuthRequestNormalization =
  | { body: unknown; error?: never }
  | { body?: never; error: string };

const FIRST_NAME_SCHEMA = {
  type: 'string',
  minLength: 1,
  maxLength: 100,
  description: 'The first name of the user',
} as const;

const LAST_NAME_SCHEMA = {
  type: 'string',
  minLength: 1,
  maxLength: 100,
  description: 'The last name of the user',
} as const;

const AUTH_CLIENT_IP_PARAMETER = {
  name: 'X-Forwarded-For',
  in: 'header',
  required: true,
  description: 'Example client IP used by the interactive API documentation.',
  example: '192.29.224.220',
  schema: {
    type: 'string',
    format: 'ipv4',
    default: '192.29.224.220',
    example: '192.29.224.220',
  },
} as const;

export function normalizeBetterAuthUserRequest(
  path: string,
  body: unknown,
): BetterAuthRequestNormalization {
  if (!isRecord(body)) return { body };

  const normalized = { ...body };
  if (path === '/sign-up/email') {
    return normalizeRequiredNameFields(normalized);
  }

  if (path === '/update-user') {
    return normalizeOptionalNameFields(normalized);
  }

  if (path === '/admin/create-user') {
    const result = normalizeRequiredNameFields(normalized);
    if (result.error) return result;

    const publicBody = result.body as JsonRecord;
    const data = isRecord(publicBody.data) ? { ...publicBody.data } : {};
    data.firstName = publicBody.firstName;
    data.lastName = publicBody.lastName;
    publicBody.data = data;
    delete publicBody.firstName;
    delete publicBody.lastName;
    return { body: publicBody };
  }

  if (path === '/admin/update-user' && isRecord(normalized.data)) {
    const dataResult = normalizeOptionalNameFields({ ...normalized.data });
    if (dataResult.error) return dataResult;
    normalized.data = dataResult.body;
  }

  return { body: normalized };
}

export function hideInternalUserName(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hideInternalUserName);
  if (!isRecord(value)) return value;

  const sanitized = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      hideInternalUserName(item),
    ]),
  );
  if (typeof sanitized.email === 'string' && 'name' in sanitized) {
    delete sanitized.name;
  }
  return sanitized;
}

export function normalizeBetterAuthOpenApiDocument<T>(document: T): T {
  visitOpenApiNode(document);

  const root = asRecord(document);
  const paths = asRecord(root?.paths);
  addAuthClientIpHeader(paths?.['/sign-up/email']);
  addAuthClientIpHeader(paths?.['/sign-in/email']);
  replaceUpdateUserRequestSchema(paths?.['/update-user']);
  replaceAdminUpdateUserDataSchema(paths?.['/admin/update-user']);
  return document;
}

function addAuthClientIpHeader(pathItem: unknown): void {
  const operation = asRecord(asRecord(pathItem)?.post);
  if (!operation) return;

  const parameters = Array.isArray(operation.parameters)
    ? operation.parameters.filter((parameter) => {
        const definition = asRecord(parameter);
        return !(
          definition?.in === 'header' &&
          typeof definition.name === 'string' &&
          definition.name.toLowerCase() === 'x-forwarded-for'
        );
      })
    : [];

  operation.parameters = [
    ...parameters,
    {
      ...AUTH_CLIENT_IP_PARAMETER,
      schema: { ...AUTH_CLIENT_IP_PARAMETER.schema },
    },
  ];
}

function normalizeRequiredNameFields(
  body: JsonRecord,
): BetterAuthRequestNormalization {
  const firstName = readNamePart(body.firstName);
  const lastName = readNamePart(body.lastName);
  if (!firstName || !lastName) {
    return {
      error: 'firstName and lastName are required and must not be empty.',
    };
  }

  delete body.name;
  return {
    body: {
      ...body,
      firstName,
      lastName,
      name: composeUserName(firstName, lastName),
    },
  };
}

function normalizeOptionalNameFields(
  body: JsonRecord,
): BetterAuthRequestNormalization {
  delete body.name;
  for (const field of ['firstName', 'lastName'] as const) {
    if (!(field in body)) continue;
    const value = readNamePart(body[field]);
    if (!value) return { error: `${field} must not be empty.` };
    body[field] = value;
  }
  return { body };
}

function readNamePart(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalizeUserNamePart(value);
  return normalized.length > 0 && normalized.length <= 100 ? normalized : null;
}

function visitOpenApiNode(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(visitOpenApiNode);
    return;
  }
  const node = asRecord(value);
  if (!node) return;

  const properties = asRecord(node.properties);
  if (properties && 'email' in properties && 'name' in properties) {
    delete properties.name;
    properties.firstName = { ...FIRST_NAME_SCHEMA };
    properties.lastName = { ...LAST_NAME_SCHEMA };
    node.required = replaceRequiredName(node.required, true);
  }

  Object.values(node).forEach(visitOpenApiNode);
}

function replaceUpdateUserRequestSchema(operation: unknown): void {
  const schema = requestSchema(operation);
  const properties = asRecord(schema?.properties);
  if (!schema || !properties) return;
  delete properties.name;
  properties.firstName = { ...FIRST_NAME_SCHEMA };
  properties.lastName = { ...LAST_NAME_SCHEMA };
  schema.required = replaceRequiredName(schema.required, false);
}

function replaceAdminUpdateUserDataSchema(operation: unknown): void {
  const schema = requestSchema(operation);
  const properties = asRecord(schema?.properties);
  if (!properties) return;
  properties.data = {
    type: 'object',
    description: 'User fields to update. The internal name field is derived.',
    properties: {
      firstName: { ...FIRST_NAME_SCHEMA },
      lastName: { ...LAST_NAME_SCHEMA },
    },
    additionalProperties: true,
  };
}

function requestSchema(operation: unknown): JsonRecord | null {
  const post = asRecord(asRecord(operation)?.post);
  const requestBody = asRecord(post?.requestBody);
  const content = asRecord(requestBody?.content);
  return asRecord(asRecord(content?.['application/json'])?.schema);
}

function replaceRequiredName(value: unknown, required: boolean): string[] {
  const fields = Array.isArray(value)
    ? value.filter((field): field is string => typeof field === 'string')
    : [];
  const withoutName = fields.filter(
    (field) => !['name', 'firstName', 'lastName'].includes(field),
  );
  return required ? [...withoutName, 'firstName', 'lastName'] : withoutName;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null;
}
