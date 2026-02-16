/*
  LZ-based compression algorithm from lz-string (MIT)
  Source reference: https://github.com/pieroxy/lz-string
*/

type Dict = Record<string, number>;

const keyStrUtf16 = (a: number): string => String.fromCharCode(a + 32);

const getBaseValue = (alphabet: Record<string, number>, character: string): number => {
  const value = alphabet[character];
  return value ?? 0;
};

const compress = (uncompressed: string, bitsPerChar: number, getCharFromInt: (a: number) => string): string => {
  if (uncompressed == null) return '';

  let i: number;
  let value: number;
  const contextDictionary: Dict = {};
  const contextDictionaryToCreate: Record<string, boolean> = {};
  let contextC = '';
  let contextW = '';
  let contextWc = '';
  let contextEnlargeIn = 2;
  let contextDictSize = 3;
  let contextNumBits = 2;
  const contextData: string[] = [];
  let contextDataVal = 0;
  let contextDataPosition = 0;

  for (let ii = 0; ii < uncompressed.length; ii += 1) {
    contextC = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(contextDictionary, contextC)) {
      contextDictionary[contextC] = contextDictSize++;
      contextDictionaryToCreate[contextC] = true;
    }

    contextWc = contextW + contextC;
    if (Object.prototype.hasOwnProperty.call(contextDictionary, contextWc)) {
      contextW = contextWc;
    } else {
      if (Object.prototype.hasOwnProperty.call(contextDictionaryToCreate, contextW)) {
        if (contextW.charCodeAt(0) < 256) {
          for (i = 0; i < contextNumBits; i += 1) {
            contextDataVal = contextDataVal << 1;
            if (contextDataPosition === bitsPerChar - 1) {
              contextDataPosition = 0;
              contextData.push(getCharFromInt(contextDataVal));
              contextDataVal = 0;
            } else {
              contextDataPosition += 1;
            }
          }
          value = contextW.charCodeAt(0);
          for (i = 0; i < 8; i += 1) {
            contextDataVal = (contextDataVal << 1) | (value & 1);
            if (contextDataPosition === bitsPerChar - 1) {
              contextDataPosition = 0;
              contextData.push(getCharFromInt(contextDataVal));
              contextDataVal = 0;
            } else {
              contextDataPosition += 1;
            }
            value >>= 1;
          }
        } else {
          value = 1;
          for (i = 0; i < contextNumBits; i += 1) {
            contextDataVal = (contextDataVal << 1) | value;
            if (contextDataPosition === bitsPerChar - 1) {
              contextDataPosition = 0;
              contextData.push(getCharFromInt(contextDataVal));
              contextDataVal = 0;
            } else {
              contextDataPosition += 1;
            }
            value = 0;
          }
          value = contextW.charCodeAt(0);
          for (i = 0; i < 16; i += 1) {
            contextDataVal = (contextDataVal << 1) | (value & 1);
            if (contextDataPosition === bitsPerChar - 1) {
              contextDataPosition = 0;
              contextData.push(getCharFromInt(contextDataVal));
              contextDataVal = 0;
            } else {
              contextDataPosition += 1;
            }
            value >>= 1;
          }
        }
        contextEnlargeIn -= 1;
        if (contextEnlargeIn === 0) {
          contextEnlargeIn = 2 ** contextNumBits;
          contextNumBits += 1;
        }
        delete contextDictionaryToCreate[contextW];
      } else {
        value = contextDictionary[contextW];
        for (i = 0; i < contextNumBits; i += 1) {
          contextDataVal = (contextDataVal << 1) | (value & 1);
          if (contextDataPosition === bitsPerChar - 1) {
            contextDataPosition = 0;
            contextData.push(getCharFromInt(contextDataVal));
            contextDataVal = 0;
          } else {
            contextDataPosition += 1;
          }
          value >>= 1;
        }
      }
      contextEnlargeIn -= 1;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits += 1;
      }
      contextDictionary[contextWc] = contextDictSize++;
      contextW = String(contextC);
    }
  }

  if (contextW !== '') {
    if (Object.prototype.hasOwnProperty.call(contextDictionaryToCreate, contextW)) {
      if (contextW.charCodeAt(0) < 256) {
        for (i = 0; i < contextNumBits; i += 1) {
          contextDataVal <<= 1;
          if (contextDataPosition === bitsPerChar - 1) {
            contextDataPosition = 0;
            contextData.push(getCharFromInt(contextDataVal));
            contextDataVal = 0;
          } else {
            contextDataPosition += 1;
          }
        }
        value = contextW.charCodeAt(0);
        for (i = 0; i < 8; i += 1) {
          contextDataVal = (contextDataVal << 1) | (value & 1);
          if (contextDataPosition === bitsPerChar - 1) {
            contextDataPosition = 0;
            contextData.push(getCharFromInt(contextDataVal));
            contextDataVal = 0;
          } else {
            contextDataPosition += 1;
          }
          value >>= 1;
        }
      } else {
        value = 1;
        for (i = 0; i < contextNumBits; i += 1) {
          contextDataVal = (contextDataVal << 1) | value;
          if (contextDataPosition === bitsPerChar - 1) {
            contextDataPosition = 0;
            contextData.push(getCharFromInt(contextDataVal));
            contextDataVal = 0;
          } else {
            contextDataPosition += 1;
          }
          value = 0;
        }
        value = contextW.charCodeAt(0);
        for (i = 0; i < 16; i += 1) {
          contextDataVal = (contextDataVal << 1) | (value & 1);
          if (contextDataPosition === bitsPerChar - 1) {
            contextDataPosition = 0;
            contextData.push(getCharFromInt(contextDataVal));
            contextDataVal = 0;
          } else {
            contextDataPosition += 1;
          }
          value >>= 1;
        }
      }
      contextEnlargeIn -= 1;
      if (contextEnlargeIn === 0) {
        contextEnlargeIn = 2 ** contextNumBits;
        contextNumBits += 1;
      }
      delete contextDictionaryToCreate[contextW];
    } else {
      value = contextDictionary[contextW];
      for (i = 0; i < contextNumBits; i += 1) {
        contextDataVal = (contextDataVal << 1) | (value & 1);
        if (contextDataPosition === bitsPerChar - 1) {
          contextDataPosition = 0;
          contextData.push(getCharFromInt(contextDataVal));
          contextDataVal = 0;
        } else {
          contextDataPosition += 1;
        }
        value >>= 1;
      }
    }
    contextEnlargeIn -= 1;
    if (contextEnlargeIn === 0) {
      contextEnlargeIn = 2 ** contextNumBits;
      contextNumBits += 1;
    }
  }

  value = 2;
  for (i = 0; i < contextNumBits; i += 1) {
    contextDataVal = (contextDataVal << 1) | (value & 1);
    if (contextDataPosition === bitsPerChar - 1) {
      contextDataPosition = 0;
      contextData.push(getCharFromInt(contextDataVal));
      contextDataVal = 0;
    } else {
      contextDataPosition += 1;
    }
    value >>= 1;
  }

  while (true) {
    contextDataVal <<= 1;
    if (contextDataPosition === bitsPerChar - 1) {
      contextData.push(getCharFromInt(contextDataVal));
      break;
    }
    contextDataPosition += 1;
  }

  return contextData.join('');
};

const decompress = (length: number, resetValue: number, getNextValue: (index: number) => number): string => {
  const dictionary: string[] = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result: string[] = [];
  let w: string;
  let bits: number;
  let resb: number;
  let maxpower: number;
  let power: number;
  let c = 0;

  const data = {
    val: getNextValue(0),
    position: resetValue,
    index: 1,
  };

  dictionary[0] = '0';
  dictionary[1] = '1';
  dictionary[2] = '2';

  bits = 0;
  maxpower = 2 ** 2;
  power = 1;
  while (power !== maxpower) {
    resb = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) {
      data.position = resetValue;
      data.val = getNextValue(data.index++);
    }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  switch (bits) {
    case 0:
      bits = 0;
      maxpower = 2 ** 8;
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = bits;
      break;
    case 1:
      bits = 0;
      maxpower = 2 ** 16;
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      c = bits;
      break;
    case 2:
      return '';
    default:
      c = 0;
  }

  const cc = String.fromCharCode(c);
  dictionary[3] = cc;
  w = cc;
  result.push(cc);

  while (true) {
    if (data.index > length) return '';

    bits = 0;
    maxpower = 2 ** numBits;
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    c = bits;
    switch (c) {
      case 0:
        bits = 0;
        maxpower = 2 ** 8;
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn -= 1;
        break;
      case 1:
        bits = 0;
        maxpower = 2 ** 16;
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1;
        enlargeIn -= 1;
        break;
      case 2:
        return result.join('');
      default:
        break;
    }

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }

    if (dictionary[c]) {
      entry = dictionary[c];
    } else if (c === dictSize) {
      entry = w + w.charAt(0);
    } else {
      return '';
    }
    result.push(entry);

    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn -= 1;

    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits += 1;
    }
  }
};

const baseReverseDic: Record<string, Record<string, number>> = {};

export const compressToUTF16 = (input: string): string => {
  if (input == null) return '';
  return `${compress(input, 15, keyStrUtf16)} `;
};

export const decompressFromUTF16 = (compressed: string): string => {
  if (compressed == null) return '';
  if (compressed === '') return '';

  const alphabet = baseReverseDic.utf16 || {};
  if (!baseReverseDic.utf16) {
    for (let i = 0; i < 32768; i += 1) {
      alphabet[keyStrUtf16(i)] = i;
    }
    baseReverseDic.utf16 = alphabet;
  }

  return decompress(compressed.length, 16384, (index) => getBaseValue(alphabet, compressed.charAt(index)));
};
