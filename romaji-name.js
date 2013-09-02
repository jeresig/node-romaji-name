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

var generationMap = [ "", "", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

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

// Should be using n instead
var badMUsage = /m([^aeiouy]|$)/i;

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
            original: name,
            name_format: "surname given generation",
            locale: "ja"
        };

        var cleaned = this.cleanWhitespace(name);

        // Extract extra information (kanji, generation)
        cleaned = this.extractKanji(cleaned, nameObj);
        cleaned = this.extractGeneration(cleaned, nameObj);

        // Clean up the string
        cleaned = this.flipName(cleaned);
        cleaned = this.stripPunctuation(cleaned);
        cleaned = cleaned.trim();

        var uncorrectedName = cleaned;

        // Simplify the processing by starting in lowercase
        cleaned = cleaned.toLowerCase();

        // Fix lots of bad Romaji usage
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
            if ((surname && !this.toKana(surname)) ||
                    (given && !this.toKana(given))) {
                // If one of them is not valid then we assume that we're
                // dealing with a western name so we just leave it as-is.
                var parts = uncorrectedName.split(/\s+/);

                nameObj.given = parts[0];
                nameObj.surname = parts[1] || "";
                nameObj.name_format = "given surname generation";
                nameObj.locale = "";
                this.injectFullName(nameObj);

                return nameObj;
            }

            var enamName = enamdict.findByName(
                (surname ? surname + " " : "") + given);

            if (enamName) {
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

                this.injectFullName(nameObj);

            } else {
                nameObj.surname = surname;
                nameObj.given = given;
                nameObj.surname_kana = this.toKana(surname);
                nameObj.given_kana = this.toKana(given);
                this.injectFullName(nameObj);
            }

        // Otherwise there was only kanji left
        } else {
            // TODO: Handle the kanji, possibly do a name lookup?
        }

        return nameObj;
    },

    mergeNames: function(base, child) {
        var nameObj = {};
        var mergeBlacklist = ["generation", "kanji"];

        for (var prop in base) {
            if (mergeBlacklist.indexOf(prop) < 0) {
                nameObj[prop] = base[prop];
            }
        }

        for (var prop in child) {
            if (child[prop]) {
                nameObj[prop] = child[prop];
            }
        }

        // Generate new: name/name_ascii/name_plain/kana
        this.injectFullName(nameObj);

        return nameObj;
    },

    genFullName: function(nameObj) {
        var name = "";

        nameObj.name_format.split(/\s+/).forEach(function(part) {
            var value = nameObj[part];

            if (part === "generation") {
                value = generationMap[value];
            }

            // Only add something if the part is empty and don't add
            // a generation if it's just 1 (since it's superflous)
            if (value) {
                name += (name ? " " : "") + value;
            }
        });

        return name.trim();
    },

    injectFullName: function(nameObj) {
        this.capitalizeNames(nameObj);

        var name = this.genFullName(nameObj);

        if (name) {
            nameObj.name = name;
            nameObj.ascii = nameObj.locale === "ja" ?
                this.stripAccentsToASCII(name) : name;
            nameObj.plain = this.stripAccents(name);
        }

        if (nameObj.given_kana) {
            nameObj.kana = (nameObj.surname_kana || "") + nameObj.given_kana;
        }

        return nameObj;
    },

    capitalizeNames: function(nameObj) {
        if (nameObj.given) {
            nameObj.given = this.capitalize(nameObj.given);
        }
        if (nameObj.surname) {
            nameObj.surname = this.capitalize(nameObj.surname);
        }
    },

    capitalize: function(name) {
        name = name.toLowerCase();
        return name.substr(0, 1).toUpperCase() + name.substr(1);
    },

    cleanWhitespace: function(name) {
        return name.replace(/\r?\n/g, " ").trim();
    },

    flipName: function(name, split) {
        split = split || /,\s*/;
        return name.split(split).reverse().join(" ");
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
        name = bulkReplace(name, badRomaji);
        name = name.replace(badMUsage, "n$1");
        return name;
    },

    convertRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToAccent);
    },

    stripRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToLetter);
    },

    extractKanji: function(name, nameObj) {
        var kanji = "";

        name = name.replace(kanjiRegex, function(all) {
            kanji = all;
            return "";
        });

        // Strip extraneous whitespace from the kanji
        kanji = kanji.replace(/\s+/g, "");

        if (kanji) {
            // Extract generation info from kanji if it exists
            kanji = this.extractGeneration(kanji, nameObj);
            nameObj.kanji = kanji;

            // TODO: A pretty big hack, maybe use ENAMDICT to do it for real?
            if (kanji.length === 6) {
                nameObj.surname_kanji = kanji.substr(0, 3);
                nameObj.given_kanji = kanji.substr(3);
            } else if (kanji.length === 4) {
                nameObj.surname_kanji = kanji.substr(0, 2);
                nameObj.given_kanji = kanji.substr(2);
            } else if (kanji.length === 2) {
                nameObj.given_kanji = kanji;
            }
        }

        return name;
    },

    extractGeneration: function(name, nameObj) {
        var generation = "";

        generations.forEach(function(genRegex, i) {
            if (genRegex.test(name)) {
                generation = i + 1;
                name = name.replace(genRegex, "");
            }
        });

        // Remove extraneous generation kanji words
        name = name.replace(generationRegex, "");

        if (generation) {
            nameObj.generation = generation;
        }

        return name;
    },

    toKana: function(name) {
        // TODO: Should oo -> ou to match the conventions of ENAMDICT?
        var ret = hepburn.toHiragana(name);
        return /[a-z]/i.test(ret) ? "" : ret;
    }
};
