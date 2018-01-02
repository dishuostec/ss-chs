import nodejieba from 'nodejieba';
import debuglog from 'debug';

const debug = debuglog('CHS');

const chineseCharacter = /[\u4E00-\u9FA5]/;
/** @see https://www.unicode.org/charts/PDF/UFF00.pdf */
const fullWidthCharacter = /[\uff01-\uff5e]/;
const insertSpaceLeft = /[^ |([]/;
const insertSpaceRight = /[^ |)\]]/;
const partsOfSpeech = /(\S?)(<(?:cap|name|noun|adverb|verb|pronoun|adjective|entit(?:y|ie))(?:s|[0-9]+)?>)(\S?)/g;

const fixPartsOfSpeech = (string) => {
  return string.replace(partsOfSpeech, (match, p1, p2, p3) => {

    const pad1 = p1 === '' ? '' : ' ';
    const pad3 = p3 === '' ? '' : ' ';
    return p1 + pad1 + p2 + pad3 + p3;
  });
};

const cut = (string) => {
  if (!chineseCharacter.test(string)) {
    return string;
  }

  string = fixPartsOfSpeech(string);

  const cutted = string.replace(/[\u4E00-\u9FA5]+/g, (match, offset, string) => {
    const cut = nodejieba.cut(match, true);

    if (offset > 0 && insertSpaceLeft.test(string.charAt(offset - 1))) {
      cut.unshift('');
    }

    const nextOffset = offset + match.length;
    if (nextOffset < string.length && insertSpaceRight.test(string.charAt(nextOffset))) {
      cut.push('');
    }

    return cut.join(' ');
  });

  debug('origin %s', string);
  debug('cutted %s', cutted);
  return cutted;
};

const convertFullWidthChar = (string) => {
  string = string.replace(/[\uff01-\uff5e]/g, (match, offset, string) => {
    // ff01 -> 21
    const codePoint = match.codePointAt(0);
    return String.fromCodePoint(codePoint - 0xfee0);
  });

  /** @see https://www.unicode.org/charts/PDF/U2000.pdf */
  string = string.replace(/[\u2018\u2019\u300c\300d]/g, '\''); // ‘’「」
  string = string.replace(/[\u201c\u201d\u300e\u300f]/g, '"'); // “”『』

  return string;
};

// const convertFullWidthSymbol = (string) => {
//   return string.replace(/[\uff01-\uff0f\uff1a-\uff20\uff38-\uff40\uff5b-\uff5e]/g, (match) => {
//     // ff01 -> 21
//     const codePoint = match.codePointAt(0);
//     return String.fromCodePoint(codePoint - 0xfee0);
//   });
// };

const cleanMessage = (message) => {
  message = message.replace(/\.(?!\d)/g, ' ');
  message = message.replace(/,(?=\S)/g, ', ');
  message = message.replace(/\s,\s/g, ' ');
  // these used to be bursted but are not anymore.
  message = message.replace(/([a-zA-Z]),\s/g, '$1 ');
  message = message.replace(/"(.*)"/g, '$1');
  message = message.replace(/\(/g, '');
  message = message.replace(/\)/g, '');
  message = message.replace(/\s"\s?/g, ' ');
  message = message.replace(/\s'\s?/g, ' ');
  message = message.replace(/\s?!\s?/g, ' ');
  message = message.replace(/\?\s?/g, ' ');
  message = message.replace(/[a-z](:)/gi, (match, p1) => match.replace(/:/, ''));
  return message;
};

const jiebaCut = (string, option) => {
  return nodejieba.cut(string, option);
};

const jiebaTag = (string) => {
  return nodejieba.tag(string);
};

const jiebaExtract = (string) => {
  return nodejieba.extract(string);
};

const messagePluginDir = `${__dirname}/plugins/message`;

export default {
  messagePluginDir,
  chineseCharacter,
  fullWidthCharacter,
  cleanMessage,
  convertFullWidthChar,
  cut,
  jiebaCut,
  jiebaTag,
  jiebaExtract,
};