var enamdict = require("enamdict");
var hepburn = require("hepburn");
var bulkReplace = require("bulk-replace");

// Thanks to Jed Schmidt!
// https://twitter.com/jedschmidt/status/368179809551388672
// https://ja.wikipedia.org/wiki/%E5%A4%A7%E5%AD%97_(%E6%95%B0%E5%AD%97)
var generations = [
    /([1１一壱壹](?:代目|代|世)|\b1\b|\bI(\s|$)|[^０-９]１[^０-９])/i,
    /([2２二弐貮貳](?:代目|代|世)|\b(?:2|II)\b|[^０-９]２[^０-９])/i,
    /([3３三参參](?:代目|代|世)|\b(?:3|III)\b|[^０-９]３[^０-９])/i,
    /([4４四肆](?:代目|代|世)|\b(?:4|IV)\b|[^０-９]４[^０-９])/i,
    /([5５五伍](?:代目|代|世)|\b(?:5\b|V(\s|$))|[^０-９]５[^０-９])/i,
    /([6６六陸](?:代目|代|世)|\b(?:6|VI)\b|[^０-９]６[^０-９])/i,
    /([7７七柒漆質](?:代目|代|世)|\b(?:7|VII)\b|[^０-９]７[^０-９])/i,
    /([8８八捌](?:代目|代|世)|\b(?:8|VIII)\b|[^０-９]８[^０-９])/i,
    /([9９九玖](?:代目|代|世)|\b(?:9|IX)\b|[^０-９]９[^０-９])/i,
    /((?:10|１０|[十拾])(?:代目|代|世)|\b(?:10\b|[^０-９]１０[^０-９]|X(\s|$)))/i
];

var generationMap = [ "", "", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Punctuation
// (Both ASCII and Japanese)
// http://www.localizingjapan.com/blog/2012/01/20/regular-expressions-for-japanese-text/
// Include full width characters?
// Exclude the ' and - marks, they're used in some names
var puncRegex = /[!"#$%&()*+,.\/:;<=>?@[\\\]^_`{|}~\u3000-\u303F]|(?:^|\s)[\—\-](?:\s|$)/g;
var aposRegex = /(^|[^nm])'/ig;

// Extract an, at least, 2 character long kanji string
var kanjiRegex = /[\u4e00-\u9faf][\u4e00-\u9faf\s\d\(\)]*[\u4e00-\u9faf]/g;

// Detect anonymous artists
var anonRegex = /various.*artists|anonymous|unknown|unidentified|not read/i;

// Detect after
var afterRegex = /\bafter\b|of school|school of/i;

// Detect attributed
var attrRegex = /to attributed|attributed to|attributed/ig;

// Detect school
var schoolRegex = /([\w']+)\s+school/ig;

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
var badMUsage = /(\w)m([^aeiouy]|$)/i;

// The formatting for when the full names are generated
var localeFormatting = {
    "": "given middle surname generation",
    "ja": "surname middle given generation"
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

        // Extract extra information (anonymous, kanji, generation, etc.)
        cleaned = this.extractAnonymous(cleaned, nameObj);
        cleaned = this.extractAfter(cleaned, nameObj);
        cleaned = this.extractAttributed(cleaned, nameObj);
        cleaned = this.extractSchool(cleaned, nameObj);
        cleaned = this.extractKanji(cleaned, nameObj);
        cleaned = this.extractGeneration(cleaned, nameObj);

        // Clean up the string
        cleaned = this.stripParens(cleaned);
        cleaned = this.flipName(cleaned);
        cleaned = this.stripPunctuation(cleaned);

        // Fix some other things we don't care about
        cleaned = cleaned.trim();

        var uncorrectedName = cleaned;

        // Simplify the processing by starting in lowercase
        cleaned = cleaned.toLowerCase();

        // Fix lots of bad Romaji usage
        cleaned = this.correctAccents(cleaned);
        cleaned = this.stripAccentsToASCII(cleaned);
        cleaned = this.correctBadRomaji(cleaned);

        // Make sure that ASCII characters are left to convert!
        if (/([a-z'-]+)\s*([a-z' -]*)\s*/.test(cleaned)) {
            if (RegExp.$2) {
                var surname = RegExp.$1;
                var given = RegExp.$2;
            } else {
                var surname = "";
                var given = RegExp.$1;
            }

            // The kanji represents a different name (alias?)
            if (nameObj.differs) {
                delete nameObj.kanji;
                delete nameObj.given_kanji;
                delete nameObj.surname_kanji;
                delete nameObj.generation;
            }

            // Make sure the names are valid romaji before continuing
            if ((surname && !this.toKana(surname)) ||
                    (given && !this.toKana(given))) {
                // If one of them is not valid then we assume that we're
                // dealing with a western name so we just leave it as-is.
                var parts = uncorrectedName.split(/\s+/);

                nameObj.locale = "";
                nameObj.given = parts[0];
                nameObj.surname = "";

                if (parts.length === 2) {
                    nameObj.surname = parts[1];
                } else if (parts.length > 2) {
                    var middle = parts.slice(1, parts.length - 1);
                    nameObj.middle = middle.map(function(name) {
                        return name.length === 1 ? name + "." : name;
                    }).join(" ");
                    nameObj.surname = parts[parts.length - 1];
                }

                if (options.flipNonJa && nameObj.surname) {
                    var tmp = nameObj.given;
                    nameObj.given = nameObj.surname;
                    nameObj.surname = tmp;
                }

                this.injectFullName(nameObj);

                return nameObj;
            } else {
                var parts = given.split(/\s+/);

                if (parts.length > 1) {
                    var middle = parts.slice(0, parts.length - 1);
                    nameObj.middle = middle.join(" ");
                    given = parts[parts.length - 1];
                }
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

                this.splitKanjiByName(nameObj, givenEntries, surnameEntries);
                this.injectFullName(nameObj);

            } else {
                if (surname) {
                    nameObj.surname = this.convertRepeatedVowel(surname);
                    nameObj.surname_kana = this.toKana(surname);
                }

                nameObj.given = this.convertRepeatedVowel(given);
                nameObj.given_kana = this.toKana(given);

                this.splitKanjiByName(nameObj, givenEntries);
                this.injectFullName(nameObj);
            }

        // Otherwise there was only kanji left and we haven't already
        // detected which characters belong to the surname or given name
        } else if (nameObj.kanji && !nameObj.given_kanji) {
            this.splitKanji(nameObj);
        }

        delete nameObj.differs;

        return nameObj;
    },

    splitKanjiByName: function(nameObj, givenEntries, surnameEntries) {
        // Figure out how the kanji name relates to which name part
        if (!nameObj.kanji) {
            return;
        }

        var nameKanji = nameObj.kanji;
        var givenKanji = givenEntries && givenEntries.kanji();
        var surnameKanji = surnameEntries &&
            surnameEntries.kanji();

        if (!givenKanji && !surnameKanji) {
            this.splitKanji(nameObj);
            return;
        }

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
    },

    splitKanji: function(nameObj) {
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

        if (nameObj.given && name) {
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
        name = name.replace(badMUsage, "$1n$2");
        return name;
    },

    convertRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToAccent);
    },

    stripParens: function(name) {
        return name.replace(/\s*\([^\)]*\)/g, "");
    },

    extractAttributed: function(name, nameObj) {
        name = name.replace(attrRegex, function(all) {
            nameObj.attributed = true;
            return "";
        });

        return name;
    },

    extractAfter: function(name, nameObj) {
        name = name.replace(afterRegex, function(all) {
            nameObj.after = true;
            return "";
        });

        return name;
    },

    extractSchool: function(name, nameObj) {
        if (schoolRegex.test(name)) {
            name = "";
            nameObj.surname = RegExp.$1;
        }

        return name;
    },

    extractAnonymous: function(name, nameObj) {
        if (anonRegex.test(name)) {
            name = "";
            nameObj.anonymous = true;
            nameObj.locale = "";
        }

        return name;
    },

    extractKanji: function(name, nameObj) {
        var self = this;
        var kanji = "";

        name = name.replace(kanjiRegex, function(all) {
            if (!kanji) {
                kanji = self.stripPunctuation(all).trim();
            }
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
        var generation;

        // Don't look for the generation inside parens
        var trimName = this.stripParens(name);

        generations.forEach(function(genRegex, i) {
            if (!generation && genRegex.test(trimName)) {
                generation = i + 1;

                // Handle the case where the name is written:
                // Given Generation Surname
                var invertedName = new RegExp("([a-z'-]+)\\s+" + RegExp.$1 +
                    "\\s+([a-z'-]+)", "i");

                if (invertedName.test(name)) {
                    name = name.replace(invertedName, "$2 $1");

                } else {
                    name = name.replace(genRegex, function(all, name, extra) {
                        return typeof extra === "string" && extra || "";
                    });
                }
            }
        });

        // Specifying 1st generation is redundant
        if (generation === 1) {
            generation = undefined;
        }

        // The kanji represents a different name (alias?)
        if (nameObj.kanji && nameObj.generation !== generation) {
            nameObj.differs = true;
        }

        if (generation) {
            nameObj.generation = generation;
        }

        return name;
    },

    toKana: function(name) {
        // TODO: Should oo -> ou to match the conventions of ENAMDICT?
        var ret = hepburn.toHiragana(name.replace(/-/g, ""));
        return /[a-z]/i.test(ret) ? "" : ret;
    }
};
