var enamdict = require("../node-enamdict/enamdict");

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

// Punctuation
// (Both ASCII and Japanese)
// http://www.localizingjapan.com/blog/2012/01/20/regular-expressions-for-japanese-text/
// Include full width characters?
// Exclude the ' mark, it's used in some names
var puncRegex = /[!"#$%&()*+,\-.\/:;<=>?@[\\\]^_`{|}~\x3000-\x303F]/g;

// Extract an, at least, 2 character long kanji string
var kanjiRegex = /[\u4e00-\u9faf][\u4e00-\u9faf\s]*[\u4e00-\u9faf]/;

var letterToAccents = {
    'a': 'āáàăắặâấåäǟãą',
    'A': 'ĀÄ',
    'e': 'ēéèêềěëėę',
    'E': 'ĒÊЁ',
    'i': 'īíìîïįı',
    'I': 'ĪİÎ',
    'o': 'ōóòôöőõȭȯȱøỏ',
    'O': 'ŌÖÔ',
    'u': 'ūúùŭûůüųűư',
    'U': 'ŪÛÜ'
};

// Common cases where another form is more-commonly used
var badRomaji = {
    "ou": "oo",
    "si": "shi"
};

var letterToGoodAccent = {};
var accentToLetter = {};

var accentRegex = (function() {
    var accentStr = "";

    Object.keys(letterToAccents).forEach(function(letter) {
        var accents = letterToAccents[letter];

        accents.split("").forEach(function(accent) {
            accentToLetter[accent] = letter;
        });

        accentStr += accents;

        letterToGoodAccent[letter] = accents.slice(0, 1);
    });

    return new RegExp("[" + accentStr + "]", "g");
})();

var repeatedVowelRegex = (function() {
    var vowelStrings = ["ou", "OU"];

    Object.keys(letterToGoodAccent).forEach(function(letter) {
        vowelStrings.push(letter + letter);
    });

    return new RegExp(vowelStrings.join("|"), "ig");
})();

var badRomajiRegex = new RegExp(Object.keys(badRomaji).join("|"), "ig");

var generationRegex = new RegExp(generationKanji.join("|"), "g");

module.exports = {
    init: function(callback) {
        enamdict.init(callback);
    },

    // Fix n at end of name
    // Fix n next to consanant

    makeNameObject: function(name) {
        return {
            original: name
        };
    },

    parseName: function(name) {
        var nameObj = this.makeNameObject(name);

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
        cleaned = this.correctAccents(cleaned);
        cleaned = this.stripAccentsToASCII(cleaned);
        cleaned = this.correctBadRomaji(cleaned);
        cleaned = cleaned.trim();

        // Make sure that ASCII characters are left to convert!
        if (/\w+/.test(cleaned)) {
            var enamName = enamdict.findByName(cleaned);

            if (enamName) {
                if (enamName.romaji()) {
                    nameObj.romaji =
                        this.convertRepeatedVowel(enamName.romaji());
                    nameObj.romaji_ascii = enamName.romaji();
                    nameObj.romaji_plain =
                        this.stripRepeatedVowel(enamName.romaji());
                }

                if (enamName.given().romaji()) {
                    nameObj.given_romaji =
                        this.convertRepeatedVowel(enamName.given().romaji());
                }
                if (enamName.surname().romaji()) {
                    nameObj.surname_romaji =
                        this.convertRepeatedVowel(enamName.surname().romaji());
                }

                if (enamName.katakana()) {
                    nameObj.katakana = enamName.katakana();
                }

                if (enamName.given().katakana()) {
                    nameObj.given_katakana = enamName.given().katakana();
                }
                if (enamName.surname().katakana()) {
                    nameObj.surname_katakana = enamName.surname().katakana();
                }

                // Is this even useful?
                //nameObj.possible_kanji = enamName.kanji();

            } else {
                nameObj.romaji = this.convertRepeatedVowel(cleaned);
                nameObj.romaji_ascii = cleaned;
                nameObj.romaji_plain = this.stripAccents(nameObj.romaji);
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
        return name.replace(puncRegex, " ").trim();
    },

    stripAccents: function(name) {
        return name.replace(accentRegex, function(accent) {
            return accentToLetter[accent];
        });
    },

    stripAccentsToASCII: function(name) {
        return name.replace(accentRegex, function(accent) {
            return accentToLetter[accent] + accentToLetter[accent];
        });
    },

    correctAccents: function(name) {
        return name.replace(accentRegex, function(accent) {
            return letterToGoodAccent[accentToLetter[accent]];
        });
    },

    correctBadRomaji: function(name) {
        return name.replace(badRomajiRegex, function(letters) {
            return badRomaji[letters];
        });
    },

    convertRepeatedVowel: function(name) {
        return name.replace(repeatedVowelRegex, function(letters) {
            var letter = letters.slice(0, 1);
            return letterToGoodAccent[letter];
        });
    },

    stripRepeatedVowel: function(name) {
        return name.replace(repeatedVowelRegex, function(letters) {
            return letters.slice(0, 1);
        });
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
    }
};
