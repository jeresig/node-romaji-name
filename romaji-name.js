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

// Punctuation
// (Both ASCII and Japanese)
// http://www.localizingjapan.com/blog/2012/01/20/regular-expressions-for-japanese-text/
// Include full width characters?
// Exclude the ' mark, it's used in some names
var puncRegex = /[!"#$%&()*+,\-.\/:;<=>?@[\\\]^_`{|}~\x3000-\x303F]/g;

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

    letterToAccents.keys().forEach(function(letter) {
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

    letterToGoodAccent.keys().forEach(function(letter) {
        vowelStrings.push(letter + letter);
    });

    return new RegExp(vowelStrings.join("|"), "ig");
})();

var badRomajiRegex = new RegExp(badRomaji.keys().join("|"), "ig");

module.exports = {
    // Fix n at end of name
    // Fix n next to consanant
    // Check for generation info
    // Split on comma
    // Detect kanji characters
    // Extract kanji
    // Remove whitespace

    /**
     * Output:
     *   romaji
     *   plain
     */
    makeNameObject: function(name) {
        return {
            original: name,
            romaji: "",
            plain: "", // TODO: Rename to ascii?
            generation: "",
            kanji: "",
            katakana: ""
        };
    },

    parseName: function(name) {
        var nameObj = makeNameObj(name);

        // Strip generation
        // Split/reverse/join on comma
        // Tokenize
        // Check tokens against enamdict
        // Figure out if Japanese, or not
        //   (No surname/given matches, fail)
        // Figure out surname
        // Get Kanji for it
        // Figure out given name
        // Get Kanji for it
        // Build complete name, in correct order
        // Build complete kanji name, in correct order
        // Strip whitespace

        var cleaned = this.stripPunctuation(name);

        cleaned.split(/\s+/);

        nameObj.romaji = this.correctAccents(
            this.convertRepeatedVowels(name));
        nameObj.plain = this.stripAccents(nameObj.romaji);
        return nameObj;
    },

    stripPunctuation: function(name) {
        return name.replace(puncRegex, " ").trim();
    },

    stripAccents: function(name) {
        return name.replace(accentRegex, function(accent) {
            return accentToLetter[accent];
        });
    },

    correctAccents: function(name) {
        return name.replace(accentRegex, function(accent) {
            return letterToGoodAccent[accent] || accentToLetter[accent];
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

    extractGeneration: function(name) {
        return generations.forEach(function(genRegex, i) {
            if (genRegex.test(name)) {
                
            }
        });
    }
};
