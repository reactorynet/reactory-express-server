const Hash = (e: any) : number => {
  let hashFunc: Function;
  function stringHash(string: string, noType?: any) {
    let hashString = string;
    if (!noType) {
      hashString = `string${string}`;
    }
    var hash = 0;
    for (var i = 0; i < hashString.length; i++) {
        var character = hashString.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  function objectHash(obj: any, exclude?: any) {
    if (exclude.indexOf(obj) > -1) {
      return undefined;
    }
    let hash = '';
    const keys = Object.keys(obj).sort();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const keyHash = hashFunc(key);
      const attrHash = hashFunc(obj[key], exclude);
      exclude.push(obj[key]);
      hash += stringHash(`object${keyHash}${attrHash}`, true);
    }
    return stringHash(hash, true);
  }

  function Hash(unkType: any, exclude?: any[]): number {
    let ex = exclude;
    if (ex === undefined) {
      ex = [];
    }
    if (!isNaN(unkType) && typeof unkType !== 'string') {
      return unkType;
    }
    switch (typeof unkType) {
      case 'object':
        return objectHash(unkType as object, ex);
      default:
        return stringHash(String(unkType));
    }
  }

  hashFunc = Hash;

  return Hash(e);
};

/**
 * Returns a guaranteed non-negative integer hash.
 *
 * The base `Hash` implementation folds the accumulator with `hash & hash`,
 * which yields a SIGNED 32-bit integer and can therefore be negative
 * (e.g. Hash('Improve the tool descriptions ...') === -453156351).
 *
 * Use this variant whenever the hash is used to build a user facing or
 * persisted identifier (support ticket references, human readable codes,
 * slugs) where a leading '-' is invalid or confusing.
 *
 * The unsigned coercion (`>>> 0`) is used rather than Math.abs so that the
 * result is always a stable integer in the range 0 .. 4294967295 and never
 * produces `-0` or a non-integer value.
 */
export const HashUnsigned = (value: any): number => {
  const raw = Hash(value);
  const numeric =
    typeof raw === 'number' && Number.isFinite(raw) ? Math.trunc(raw) : 0;
  return numeric >>> 0;
};

export default Hash;
