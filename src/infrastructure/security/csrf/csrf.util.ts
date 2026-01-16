import crypto from 'node:crypto';

export const makeCsrfToken = () => crypto.randomBytes(32).toString('base64url');

export function isAllowedByOriginOrReferer(params: {
  origin?: string;
  referer?: string;
  originAllowlist: string[];
  refererAllowlist: string[];
}) {
  const { origin, referer, originAllowlist, refererAllowlist } = params;

  const originOk = origin ? originAllowlist.includes(origin) : null;
  const refererOk = referer
    ? refererAllowlist.some((p) => referer.startsWith(p))
    : null;

  const allow =
    originOk === true ||
    (originOk === null && refererOk === true) ||
    (originOk === null &&
      refererOk === null &&
      originAllowlist.length === 0 &&
      refererAllowlist.length === 0);

  return allow;
}
