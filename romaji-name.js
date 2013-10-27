var enamdict = require("enamdict");
var hepburn = require("hepburn");
var bulkReplace = require("bulk-replace");

// Thanks to Jed Schmidt!
// https://twitter.com/jedschmidt/status/368179809551388672
// https://ja.wikipedia.org/wiki/%E5%A4%A7%E5%AD%97_(%E6%95%B0%E5%AD%97)
var generations = [
    /([一壱壹]|\b(?:1|１|I)\b)/i,
    /([二弐貮貳]|\b(?:2|２|II)\b)/i,
    /([三参參]|\b(?:3|３|III)\b)/i,
    /([四肆]|\b(?:4|４|IV)\b)/i,
    /([五伍]|\b(?:5|５|V)\b)/i,
    /([六陸]|\b(?:6|６|VI)\b)/i,
    /([七柒漆質]|\b(?:7|７|VII)\b)/i,
    /([八捌]|\b(?:8|８|VIII)\b)/i,
    /([九玖]|\b(?:9|９|IX)\b)/i,
    /([十拾]|\b(?:10|１０|X)\b)/i
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
var puncRegex = /[!"#$%&()*+,\-.\/:;<=>?@[\\\]^_`{|}~\u3000-\u303F]/g;
var aposRegex = /(^|[^nm])'/ig;

// Extract an, at least, 2 character long kanji string
var kanjiRegex = /[\u4e00-\u9faf][\u4e00-\u9faf\s]*[\u4e00-\u9faf]/;

// All the conceivable bad accents that people could use instead of the typical
// Romaji stress mark. The first character in each list has the proper accent.
var letterToAccents = {
    'a': 'āâáàăắặấåäǟãą',
    'e': 'ēêéèềěëėę',
    'i': 'īîíìïįı',
    'o': 'ōôóòöőõȭȯȱøỏ',
    'u': 'ūûúùŭůüųűư'
};

// Common cases where another form is more-commonly used
var badRomaji = {
    "ou": "oo",
    "si": "shi"
};

// Should be using n instead
var badMUsage = /m([^aeiouy]|$)/i;

// The formatting for when the full names are generated
var localeFormatting = {
    "": "given surname generation",
    "ja": "surname given generation"
};

// Build up the maps for later replacements
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

    // The use of 'ii' is commonly accepted, no accent is used
    if (letter !== "i") {
        asciiToAccent[letterPair] = goodAccent;
    }

    // Hack for usage of "ou", treat the same as "oo"
    if (letter === "o") {
        asciiToAccent["ou"] = goodAccent;
        asciiToLetter["ou"] = letter;
    }
});

module.exports = {
    init: function(callback) {
        enamdict.init(callback);
        return this;
    },

    parseName: function(name, options) {
        // Fallback options object
        options = options || {};

        // Assume that we're re-parsing a name object
        if (typeof name === "object") {
            if (name.options) {
                for (var prop in name.options) {
                    if (!(prop in options)) {
                        options[prop] = name.options[prop];
                    }
                }
            }
            name = name.original || name.name;
        }

        // Fallback to an empty string if no name is provided
        name = name || "";

        var nameObj = {
            original: name,
            locale: "ja"
        };

        if (Object.keys(options).length > 0) {
            nameObj.options = options;
        }

        var cleaned = this.cleanWhitespace(name);

        // Optionally remove everything enclosed in parentheses
        if (options.stripParens) {
            cleaned = this.stripParens(cleaned);
        }

        // Extract extra information (kanji, generation)
        cleaned = this.extractKanji(cleaned, nameObj);
        cleaned = this.extractGeneration(cleaned, nameObj);

        // Clean up the string
        cleaned = this.flipName(cleaned);
        cleaned = this.stripPunctuation(cleaned);

        // Fix some other things we don't care about
        cleaned = this.stripInitials(cleaned);
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
                nameObj.locale = "";

                if (options.flipNonJa && nameObj.surname) {
                    var tmp = nameObj.given;
                    nameObj.given = nameObj.surname;
                    nameObj.surname = tmp;
                }

                this.injectFullName(nameObj);

                return nameObj;
            }

            // If givenFirst is specified then we assume that the given
            // name is always first. This doesn't matter for non-Japanese
            // names (like above) but does matter for Japanese names,
            // which are expected to be surname first.
            if (options.givenFirst && surname && given) {
                var tmp = surname;
                surname = given;
                given = tmp;
            }

            // Look up the two parts of the name in ENAMDICT
            var givenEntries = enamdict.find(given);
            var surnameEntries = enamdict.find(surname);

            if (given && surname && (givenEntries || surnameEntries)) {
                // Fix cases where only one of the two names was found
                if (!givenEntries || !surnameEntries) {
                    if (givenEntries) {
                        // Swap the names if they're in the wrong place
                        if (givenEntries.type() === "surname") {
                            var tmp = surname;
                            surname = given;
                            given = tmp;
                            surnameEntries = givenEntries;
                            givenEntries = null;
                        }

                    } else {
                        // Swap the names if they're in the wrong place
                        if (surnameEntries.type() === "given") {
                            var tmp = given;
                            given = surname;
                            surname = tmp;
                            givenEntries = surnameEntries;
                            surnameEntries = null;
                        }
                    }

                // Otherwise both parts of the name were found
                // Fix the case where the names are reversed
                } else if ((surnameEntries.type() === "given" ||
                        givenEntries.type() === "surname") &&
                        surnameEntries.type() !== givenEntries.type()) {
                    var tmp = surnameEntries;
                    surnameEntries = givenEntries;
                    givenEntries = tmp;
                }

                // Get the romaji names, if they exist in ENAMDICT
                // If not, fall back to what was provided
                var givenRomaji = givenEntries ?
                    givenEntries.romaji() : given;
                var surnameRomaji = surnameEntries ?
                    surnameEntries.romaji() : surname;

                // Get the kana names, if they exist in ENAMDICT
                // If not, generate our own kana using hepburn
                var givenKana = givenEntries && givenEntries.kana() ||
                    this.toKana(givenRomaji || "");
                var surnameKana = surnameEntries && surnameEntries.kana() ||
                    this.toKana(surnameRomaji || "");

                if (givenRomaji) {
                    nameObj.given = this.convertRepeatedVowel(givenRomaji);
                    nameObj.given_kana = givenKana;
                }

                if (surnameRomaji) {
                    nameObj.surname = this.convertRepeatedVowel(surnameRomaji);
                    nameObj.surname_kana = surnameKana;
                }

                // Figure out how the kanji name relates to which name part
                if (nameObj.kanji) {
                    var nameKanji = nameObj.kanji;
                    var givenKanji = givenEntries && givenEntries.kanji();
                    var surnameKanji = surnameEntries &&
                        surnameEntries.kanji();

                    if (givenKanji) {
                        var foundNames = givenKanji.filter(function(kanji) {
                            return nameKanji.indexOf(kanji) >= 0;
                        });

                        // Hopefully only one name is found
                        if (foundNames.length > 0) {
                            nameObj.given_kanji = foundNames[0];
                        }
                    }

                    if (surnameKanji) {
                        var foundNames = surnameKanji.filter(function(kanji) {
                            return nameKanji.indexOf(kanji) >= 0;
                        });

                        // Hopefully only one name is found
                        if (foundNames.length > 0) {
                            nameObj.surname_kanji = foundNames[0];
                        }
                    }

                    // If only one of the kanji is found
                    if (nameObj.given_kanji !== nameObj.surname_kanji) {
                        if (nameObj.given_kanji &&
                                nameObj.given_kanji !== nameKanji) {
                            nameObj.surname_kanji = nameKanji
                                .replace(nameObj.given_kanji, "");
                        } else if (nameObj.surname_kanji &&
                                nameObj.surname_kanji !== nameKanji) {
                            nameObj.given_kanji = nameKanji
                                .replace(nameObj.surname_kanji, "");
                        }
                    }
                }

                this.injectFullName(nameObj);

            } else {
                if (surname) {
                    nameObj.surname = surname;
                    nameObj.surname_kana = this.toKana(surname);
                }

                nameObj.given = given;
                nameObj.given_kana = this.toKana(given);

                if (nameObj.kanji) {
                    nameObj.given_kanji = nameObj.kanji;
                }

                this.injectFullName(nameObj);
            }

        // Otherwise there was only kanji left and we haven't already
        // detected which characters belong to the surname or given name
        } else if (nameObj.kanji && !nameObj.given_kanji) {
            if (nameObj.kanji.length <= 2) {
                // If it's very short then it's probably not a full
                // name, just the given name.
                nameObj.given_kanji = nameObj.kanji;

            } else if (nameObj.kanji.length <= 3 &&
                    enamdict.findKanji(nameObj.kanji)) {
                // Assume that if we have an exact match that it's
                // a valid given name (the surname, alone, is almost never
                // specified).
                nameObj.given_kanji = nameObj.kanji;

            } else if (nameObj.kanji.length === 4) {
                // Almost always a name of length 4 means that there is
                // a surname of length 2 and a given name of length 2
                nameObj.surname_kanji = nameObj.kanji.substr(0, 2);
                nameObj.given_kanji = nameObj.kanji.substr(2);

            } else {
                // For everything else we need to slice-and-dice the
                // name to make sure that we have the correct name parts
                var complete = [];
                var partial = [];

                // Split name 1 .. n
                for (var pos = 2; pos < nameObj.kanji.length - 1; pos++) {
                    var surname = nameObj.kanji.substr(0, pos);
                    var given = nameObj.kanji.substr(pos);

                    var match = {
                        diff: Math.abs(surname.length - given.length),
                        surname: enamdict.findKanji(surname),
                        given: enamdict.findKanji(given)
                    };

                    if (match.surname && match.given) {
                        complete.push(match);

                    } else if (match.surname || match.given) {
                        partial.push(match);
                    }
                }

                if (complete.length > 0) {
                    // Find the name with the least-dramatic difference in
                    // size (e.g. AABB is more likely than ABBB)
                    complete = complete.sort(function(a, b) {
                        return Math.abs(a.surname.length - a.given.length) -
                            Math.abs(b.surname.length - b.given.length);
                    });

                    nameObj.surname_kanji = complete[0].surname.kanji();
                    nameObj.given_kanji = complete[0].given.kanji();

                // Otherwise if there are an odd number of partial matches then
                // we guess and go for the one that evenly splits the name
                } else if (partial.length > 0) {
                    partial = partial.filter(function(name) {
                        return name.diff === 0;
                    });

                    if (partial.length > 0) {
                        var partialSurname = partial[0].surname &&
                            partial[0].surname.kanji();
                        var partialGiven = partial[0].given &&
                            partial[0].given.kanji();

                        if (partialSurname) {
                            partialGiven = nameObj.kanji
                                .replace(partialSurname, "");
                        } else {
                            partialSurname = nameObj.kanji
                                .replace(partialGiven, "");
                        }

                        nameObj.surname_kanji = partialSurname;
                        nameObj.given_kanji = partialGiven;
                    }
                }

                // Anything else is going to be too ambiguous
            }
        }

        return nameObj;
    },

    mergeNames: function(base, child) {
        var nameObj = {};
        var mergeBlacklist = ["generation", "kanji"];
        var copyProps = ["original", "given", "given_kana", "given_kanji",
            "generation"];

        for (var prop in base) {
            if (mergeBlacklist.indexOf(prop) < 0) {
                nameObj[prop] = base[prop];
            }
        }

        copyProps.forEach(function(prop) {
            if (prop in child) {
                nameObj[prop] = child[prop];
            }
        });

        // Generate new: name/name_ascii/name_plain/kana
        this.injectFullName(nameObj);

        return nameObj;
    },

    genFullName: function(nameObj) {
        var name = "";
        var formatting = localeFormatting[nameObj.locale] || "";

        formatting.split(/\s+/).forEach(function(part) {
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

        if (nameObj.given_kanji) {
            nameObj.kanji = (nameObj.surname_kanji || "") +
                nameObj.given_kanji;
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

    stripInitials: function(name) {
        return name.replace(/(^| )[a-z]( |$)/ig, "$1$2");
    },

    stripParens: function(name) {
        return name.replace(/\s*\([^\)]*\)/g, "");
    },

    extractKanji: function(name, nameObj) {
        var kanji = "";

        name = name.replace(kanjiRegex, function(all) {
            kanji = all.trim();
            return "";
        });

        if (kanji) {
            // Extract generation info from kanji if it exists
            kanji = this.extractGeneration(kanji, nameObj).trim();

            var parts = kanji.split(/\s+/);

            // Surname and given name are already specified
            if (parts.length === 2) {
                nameObj.surname_kanji = parts[0];
                nameObj.given_kanji = parts[1];
            }

            // Strip extraneous whitespace from the kanji
            nameObj.kanji = kanji.replace(/\s+/g, "");
        }

        return name;
    },

    extractGeneration: function(name, nameObj) {
        var generation = "";

        generations.forEach(function(genRegex, i) {
            if (!generation && genRegex.test(name)) {
                generation = i + 1;

                // Handle the case where the name is written:
                // Given Generation Surname
                var invertedName = new RegExp("([a-z']+)\\s+" + RegExp.$1 +
                    "\\s+([a-z']+)", "i");

                if (invertedName.test(name)) {
                    name = name.replace(invertedName, "$2 $1");

                } else {
                    name = name.replace(genRegex, "");
                }
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
