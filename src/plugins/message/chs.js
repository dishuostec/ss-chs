import nlp from 'compromise';
import _ from 'lodash';
import helpers from '../../../';

const extractTag = (words, expectTags) => _.map(_.filter(words, word => expectTags.includes(word.tag)), 'word');

const adjective = [
  'ag', // 形语素 形容词性语素。形容词代码为a，语素代码ｇ前面置以A。
  'a', // 形容词 取英语形容词adjective的第1个字母。
  'ad', // 副形词 直接作状语的形容词。形容词代码a和副词代码d并在一起。
  'an', // 名形词 具有名词功能的形容词。形容词代码a和名词代码n并在一起。
];
// 'b', // 区别词 取汉字“别”的声母。
// 'c', // 连词 取英语连词conjunction的第1个字母。
// 'dg', // 副语素 副词性语素。副词代码为d，语素代码ｇ前面置以D。
const adverb = [
  'd', // 副词 取adverb的第2个字母，因其第1个字母已用于形容词。
];
// 'e', // 叹词 取英语叹词exclamation的第1个字母。
// 'f', // 方位词 取汉字“方” 的声母。
// 'g', // 语素 绝大多数语素都能作为合成词的“词根”，取汉字“根”的声母。
// 'h', // 前接成分 取英语head的第1个字母。
// 'i', // 成语 取英语成语idiom的第1个字母。
// 'j', // 简称略语 取汉字“简”的声母。
// 'k', // 后接成分
// 'l', // 习用语 习用语尚未成为成语，有点“临时性”，取“临”的声母。
// 'm', // 数词 取英语numeral的第3个字母，n，u已有他用。
const noun = [
  'ng', // 名语素 名词性语素。名词代码为n，语素代码ｇ前面置以N。
  'n', // 名词 取英语名词noun的第1个字母。
  'nr', // 人名 名词代码n和“人(ren)”的声母并在一起。
  'nrt', // 人名 "大王"
  'ns', // 地名 名词代码n和处所词代码s并在一起。
  'nt', // 机构团体 “团”的声母为t，名词代码n和t并在一起。
  'nz', // 其他专名 “专”的声母的第1个字母为z，名词代码n和z并在一起。
];
// 'o', // 拟声词 取英语拟声词onomatopoeia的第1个字母。
// 'p', // 介词 取英语介词prepositional的第1个字母。
// 'q', // 量词 取英语quantity的第1个字母。
// 'r', // 代词 取英语代词pronoun的第2个字母,因p已用于介词。
// 's', // 处所词 取英语space的第1个字母。
// 'tg', // 时语素 时间词性语素。时间词代码为t,在语素的代码g前面置以T。
// 't', // 时间词 取英语time的第1个字母。
// 'u', // 助词 取英语助词auxiliary 的第2个字母,因a已用于形容词。
const verb = [
  'vg', // 动语素 动词性语素。动词代码为v。在语素的代码g前面置以V。
  'v', // 动词 取英语动词verb的第一个字母。
  'vd', // 副动词 直接作状语的动词。动词和副词的代码并在一起。
  'vn', // 名动词 指具有名词功能的动词。动词和名词的代码并在一起。
];
// 'w', // 标点符号
// 'x', // 非语素字 非语素字只是一个符号，字母x通常用于代表未知数、符号。
// 'y', // 语气词 取汉字“语”的声母。
// 'z', // 状态词 取汉字“状”的声母的前一个字母。

const entity = [
  'nr',
  'nrt',
  'ns',
  'nt',
  'nz',
];

const cleanTags = tags => _.reject(tags, tag => tag.tag === 'x'
  && (!/\w/.test(tag.word))
  && (!helpers.chineseCharacter.test(tag.word)));

const getNouns = (tags, message) => {
  const englishNouns = nlp(message).match('#Noun').out('array');
  const chineseNouns = extractTag(tags, noun);
  return _.concat(englishNouns, chineseNouns);
};

const detect = function detect(cb) {
  const process = helpers.chineseCharacter.test(this.message.original)
    || helpers.fullWidthCharacter.test(this.message.original);

  this.message.isChinese = process;

  if (process) {
    const normal = helpers.convertFullWidthChar(this.message.original);
    this.message.raw = normal;

    const clean = helpers.cleanMessage(normal);

    this.message.chineseTag = helpers.jiebaTag(clean);
    this.message.chineseExtract = helpers.jiebaExtract(clean, 5);

    this.message.prev_clean = this.message.clean;
    this.message.clean = clean;
  }

  cb();
};

const addEntities = function addEntities(cb) {
  const tags = this.message.chineseTag;
  if (tags) {
    this.message.entities = extractTag(tags, entity);
    this.message.names = extractTag(tags, ['nr', 'nrt']);
  }
  cb();
};

const addPos = function addPos(cb) {
  const tags = this.message.chineseTag;
  if (tags) {
    this.message.nouns = getNouns(tags, this.message.prev_clean);
    this.message.adverbs = extractTag(tags, adverb);
    this.message.verbs = extractTag(tags, verb);
    this.message.adjectives = extractTag(tags, adjective);
  }
  cb();
};

const addQuestionTypes = function addQuestionTypes(cb) {
  let { isQuestion } = this.message;

  if (this.message.raw.slice(-1) === '?') {
    isQuestion = true;
  }

  const tags = this.message.chineseTag;
  if (tags) {
    const questionWords = [
      '谁', '什么', '何',
      '哪儿', '哪里', '哪个', '哪一个', '哪些',
      '几', '多少', '几时',
      '怎', '怎么', '怎样', '怎么样', '怎么着', '如何', '为什么',
      '吗',
      '难道', '岂', '究竟',
    ];

    if (tags.length !== 0) {
      for (let i = 0; i < tags.length; i++) {
        if (questionWords.indexOf(tags[i].word) !== -1) {
          isQuestion = true;
          break;
        }
      }
    }
    this.message.isQuestion = isQuestion;
  }

  cb();
};

const fixup = function fixup(cb) {
  this.message.clean = helpers.cut(this.message.clean);
  cb();
};

export default {
  chineseDetect: detect,
  chineseAddEntities: addEntities,
  chineseAddPos: addPos,
  chineseAddQuestionTypes: addQuestionTypes,
  chineseFixup: fixup,
};

