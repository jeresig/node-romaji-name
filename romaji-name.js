var enamdict = require("enamdict");
var hepburn = require("hepburn");
var bulkReplace = require("bulk-replace");

// Thanks to Jed Schmidt!
// https://twitter.com/jedschmidt/status/368179809551388672
// https://ja.wikipedia.org/wiki/%E5%A4%A7%E5%AD%97_(%E6%95%B0%E5%AD%97)
var generations = [
    /([1１一壱壹]|\bI\b)/i,
    /([2２二弐貮貳]|\bII\b)/i,
    /([3３三参參]|\bIII\b)/i,
    /([4４四肆]|\bIV\b)/i,
    /([5５五伍]|\bV\b)/i,
    /([6６六陸]|\bVI\b)/i,
    /([7７七柒漆質]|\bVII\b)/i,
    /([8８八捌]|\bVIII\b)/i,
    /([9９九玖]|\bIX\b)/i,
    /(10|１０|[十拾]|\bX\b)/i
];

// These characters are typically used to denote the generation of the
// artist, and should be trimmed.
var generationKanji = ["代", "世"];

var generationRegex = new RegExp(generationKanji.join("|"), "g");

// Punctuation
// (Both ASCII and Japanese)
// http://www.localizingjapan.com/blog/2012/01/20/regular-expressions-for-japanese-text/
// Include full width characters?
// Exclude the ' mark, it's used in some names
var puncRegex = /[!"#$%&()*+,\-.\/:;<=>?@[\\\]^_`{|}~\x3000-\x303F]/g;
var aposRegex = /(^|[^nm])'/ig;

// Extract an, at least, 2 character long kanji string
var kanjiRegex = /[\u4e00-\u9faf][\u4e00-\u9faf\s]*[\u4e00-\u9faf]/;

// All the conceivable bad accents that people could use instead of the typical
// Romaji stress mark. The first character in each list has the proper accent.
var letterToAccents = {
    'a': 'āáàăắặâấåäǟãą',
    'e': 'ēéèêềěëėę',
    'i': 'īíìîïįı',
    'o': 'ōóòôöőõȭȯȱøỏ',
    'u': 'ūúùŭûůüųűư'
};

// Common cases where another form is more-commonly used
var badRomaji = {
    "ou": "oo",
    "si": "shi"
};

// Build up the maps for later replacements
var letterToGoodAccent = {};
var accentToLetter = {};
var accentToASCII = {};
var accentToGoodAccent = {};
var asciiToAccent = {};
var asciiToLetter = {};

Object.keys(letterToAccents).forEach(function(letter) {
    var accents = letterToAccents[letter];
    var goodAccent = accents.slice(0, 1);
    var letterPair = letter + letter;

    accents.split("").forEach(function(accent) {
        accentToLetter[accent] = letter;
        accentToASCII[accent] = letterPair;
        accentToGoodAccent[accent] = goodAccent;
    });

    letterToGoodAccent[letter] = goodAccent;
    asciiToAccent[letterPair] = goodAccent;
    asciiToLetter[letterPair] = letter;

    // Hack for usage of "ou", treat the same as "oo"
    if (letter === "o") {
        asciiToAccent["ou"] = goodAccent;
        asciiToLetter["ou"] = letter;
    }
});

module.exports = {
    init: function(callback) {
        enamdict.init(callback);
    },

    parseName: function(name) {
        var nameObj = {
            original: name
        };

        var cleaned = name;

        var kanjiResults = this.extractKanji(cleaned);
        cleaned = kanjiResults[0];
        if (kanjiResults[1]) {
            nameObj.kanji = kanjiResults[1];

            // Extract generation info from kanji if it exists
            var genResults = this.extractGeneration(nameObj.kanji);
            nameObj.kanji = genResults[0];
            if (genResults[1]) {
                nameObj.generation = genResults[1];
            }
        }

        var genResults = this.extractGeneration(cleaned);
        cleaned = genResults[0];
        if (genResults[1]) {
            nameObj.generation = genResults[1];
        }

        cleaned = this.splitComma(cleaned);
        cleaned = this.stripPunctuation(cleaned);
        cleaned = cleaned.trim();

        var uncorrectedName = cleaned;

        // Simplify the processing by starting in lowercase
        cleaned = cleaned.toLowerCase();
        cleaned = this.correctAccents(cleaned);
        cleaned = this.stripAccentsToASCII(cleaned);
        cleaned = this.correctBadRomaji(cleaned);

        // Make sure that ASCII characters are left to convert!
        if (/([a-z']+)\s*([a-z']*)/.test(cleaned)) {
            if (RegExp.$2) {
                var surname = RegExp.$1;
                var given = RegExp.$2;
            } else {
                var surname = "";
                var given = RegExp.$1;
            }

            // Make sure the names are valid romaji before continuing
            if (!this.toKana(surname) || !this.toKana(given)) {
                // If one of them is not valid then we assume that we're
                // dealing with a western name so we just leave it as-is.
                var parts = uncorrectedName.split(/\s+/);

                nameObj.given = parts[0];
                nameObj.surname = parts[1] || "";
                nameObj.name = uncorrectedName;
                nameObj.name_ascii = nameObj.name_plain =
                    this.stripAccents(uncorrectedName);
                nameObj.format = "modern";

                return nameObj;
            }

            var enamName = enamdict.findByName(
                (surname ? surname + " " : "") + given);

            if (enamName) {
                if (enamName.romaji()) {
                    nameObj.name =
                        this.convertRepeatedVowel(enamName.romaji());
                    nameObj.name_ascii = enamName.romaji();
                    nameObj.name_plain =
                        this.stripRepeatedVowel(enamName.romaji());
                }

                if (enamName.given().romaji()) {
                    nameObj.given =
                        this.convertRepeatedVowel(enamName.given().romaji());
                    nameObj.given_kana = enamName.given().kana() ||
                        this.toKana(nameObj.given);
                }

                if (enamName.surname().romaji()) {
                    nameObj.surname =
                        this.convertRepeatedVowel(enamName.surname().romaji());
                    nameObj.surname_kana = enamName.surname().kana() ||
                        this.toKana(nameObj.surname);
                }

                if (nameObj.given_kana && nameObj.surname_kana) {
                    nameObj.kana = nameObj.surname_kana +
                        nameObj.given_kana;
                }

                // Is this even useful?
                //nameObj.possible_kanji = enamName.kanji();

            } else {
                nameObj.name = this.convertRepeatedVowel(cleaned);
                nameObj.name_ascii = cleaned;
                nameObj.name_plain = this.stripAccents(nameObj.name);
                nameObj.surname = surname;
                nameObj.given = given;
                nameObj.surname_kana = this.toKana(surname);
                nameObj.given_kana = this.toKana(given);
                nameObj.kana = nameObj.surname_kana +
                    nameObj.given_kana;
            }

        // Otherwise there was only kanji left
        } else {
            // TODO: Handle the kanji, possibly do a name lookup?
        }

        return nameObj;
    },

    splitComma: function(name) {
        return name.split(/,\s*/).reverse().join(" ");
    },

    stripPunctuation: function(name) {
        return name
            .replace(puncRegex, " ")
            .replace(aposRegex, function(all, before) {
                return before;
            }).trim();
    },

    stripAccents: function(name) {
        return bulkReplace(name, accentToLetter);
    },

    stripAccentsToASCII: function(name) {
        return bulkReplace(name, accentToASCII);
    },

    correctAccents: function(name) {
        return bulkReplace(name, accentToGoodAccent);
    },

    correctBadRomaji: function(name) {
        return bulkReplace(name, badRomaji);
    },

    convertRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToAccent);
    },

    stripRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToLetter);
    },

    extractKanji: function(name) {
        var kanji = "";

        name = name.replace(kanjiRegex, function(all) {
            kanji = all;
            return "";
        });

        // Strip extraneous whitespace from the kanji
        kanji = kanji.replace(/\s+/g, "");

        return [name, kanji];
    },

    extractGeneration: function(name) {
        var generation = "";

        generations.forEach(function(genRegex, i) {
            if (genRegex.test(name)) {
                generation = i + 1;
                name = name.replace(genRegex, "");
            }
        });

        // Remove extraneous generation kanji words
        name = name.replace(generationRegex, "");

        return [name, generation];
    },

    toKana: function(name) {
        // TODO: Should oo -> ou to match the conventions of ENAMDICT?
        var ret = hepburn.toHiragana(name);
        return /[a-z]/i.test(ret) ? "" : ret;
    }
};
