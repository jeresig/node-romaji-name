var fs = require("fs");
var enamdict = require("enamdict");
var hepburn = require("hepburn");
var bulkReplace = require("bulk-replace");

// TODO:
// - Move all settings to external settings.json
// - Support string-based formatting of both names and kanji names

// Thanks to Jed Schmidt!
// https://twitter.com/jedschmidt/status/368179809551388672
// https://ja.wikipedia.org/wiki/%E5%A4%A7%E5%AD%97_(%E6%95%B0%E5%AD%97)
var generations = [
    /([1１一壱壹初](?:代目|代|世|sei|daime)|\b1\b|\bI(\s|$)|[^０-９]１[^０-９])/i,
    /([2２二弐貮貳](?:代目|代|世|sei|daime)|nidaime|\b(?:2|II|ll)\b|Ⅱ|[^０-９]２[^０-９])/i,
    /([3３三参參](?:代目|代|世|sei|daime)|sandaime|\b(?:3|III)\b|[^０-９]３[^０-９])/i,
    /([4４四肆](?:代目|代|世|sei|daime)|yodaime|\b(?:4|IV)\b|[^０-９]４[^０-９])/i,
    /([5５五伍](?:代目|代|世|sei|daime)|godaime|\b(?:5\b|V(\s|$))|[^０-９]５[^０-９])/i,
    /([6６六陸](?:代目|代|世|sei|daime)|\b(?:6|VI)\b|[^０-９]６[^０-９])/i,
    /([7７七柒漆質](?:代目|代|世|sei|daime)|\b(?:7|VII)\b|[^０-９]７[^０-９])/i,
    /([8８八捌](?:代目|代|世|sei|daime)|\b(?:8|VIII)\b|[^０-９]８[^０-９])/i,
    /([9９九玖](?:代目|代|世|sei|daime)|\b(?:9|IX)\b|[^０-９]９[^０-９])/i,
    /((?:10|１０|[十拾])(?:代目|代|世|sei|daime)|\b(?:10\b|[^０-９]１０[^０-９]|X(\s|$)))/i
];

var generationMap = [ "", "", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Punctuation
// (Both ASCII and Japanese)
// http://www.localizingjapan.com/blog/2012/01/20/regular-expressions-for-japanese-text/
// Include full width characters?
// Exclude the ' and - marks, they're used in some names
var puncRegex = /[!"#$%&*+,._?\/:;<=>@[\\\]^`{|}~\u3000-\u303F]|(?:^|\s)[\—\-](?:\s|$)/ig;
var aposRegex = /(^|[^nm])'/ig;

// Stop words
var stopRegex = /\b(?:^.*\bby|formerly|et al|can be read|signed|signature|may be translated as|seal|possibly|illustrations|professor|artists other two|born|artist)\b/ig;

// Extract an, at least, 2 character long kanji string
var kanjiRegex = /[\u4e00-\u9faf\u3041-\u3096\u30A0-\u30FF][\u4e00-\u9faf\u3041-\u3096\u30A0-\u30FF\s\d\(\)（）々]*[\u4e00-\u9faf\u3041-\u3096\u30A0-\u30FF☆？々](?:\s+[ivxIVX]+\b)?/g;

// Detect unknown artists
var unknownRegex = /unread|unbekannt|no\s+signature|not\s+identified|ansigned|unsigned|numerous|various.*artists|mixed.*artists|anonymous|unknown|unidentified|unidentied|not\s*read|not\s+signed|none|無落款|落款欠|不明|なし/i;

// Detect after
var afterRegex = /\bafter\b|in the style of|of style the in|original|imitator of|fake/i;

// Detect attributed
var attrRegex = /to attributed|attributed to|to atributed|atributed to|attributed|\batt\b/ig;

// Detect school
var schoolRegex = /of school|school of|a pupil of|of pupil a|([\w']+)\s+(?:school|schule|umkreis)/ig;

// Name split
var nameSplitRegex = /\/| with | or | and | & |・/ig;

// Typos and entities to convert
var fixTypos = {
    "&#x02bc;": "'",
    "shegeharu": "shigeharu",
    "kasamastu": "kasamatsu",
    "kunimasav": "kunimasa v",
    "ktasukawa": "katsukawa",
    "katuskawa": "katsukawa",
    "kumyiski": "kumyoshi",
    "hiroshgie": "hiroshige",
    "shunkwaku": "shunkaku",
    "yackhyo": "yachiyo"
};

// All the conceivable bad accents that people could use instead of the typical
// Romaji stress mark. The first character in each list has the proper accent.
var letterToAccents = {
    'a': 'āâáàăắặấåäǟãą',
    'e': 'ēêéèềěëėę',
    'i': 'īîíìïį',
    'o': 'ōôóòöőõȭȯȱøỏ',
    'u': 'ūûúùŭůüųűư'
};

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
        accent = accent.toUpperCase();
        accentToLetter[accent] = letter.toUpperCase();
        accentToASCII[accent] = letter.toUpperCase() + letter;
        accentToGoodAccent[accent] = goodAccent.toUpperCase();
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

// Cached settings
var defaultSettings = {
    fixedNames: {
        given: [],
        surname: []
    }
};

var settings = defaultSettings;

module.exports = {
    // Location of the default settings file
    settingsFile: __dirname + "/settings.json",

    init: function(extraSettings, callback) {
        if (arguments.length === 1) {
            callback = extraSettings;
            extraSettings = defaultSettings;
        }

        enamdict.init(function() {
            this.loadSettings(extraSettings, callback);
        }.bind(this));

        return this;
    },

    parseName: function(name, options) {
        // Fallback options object
        options = options || {};

        // Assume that we're re-parsing a name object
        if (typeof name === "object") {
            if (name.settings) {
                for (var prop in name.settings) {
                    if (!(prop in options)) {
                        options[prop] = name.settings[prop];
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
            nameObj.settings = options;
        }

        // Simplify the processing by starting in lowercase
        var cleaned = name.toLowerCase();

        // Fix up the punctuation and whitespace before processing
        cleaned = this.cleanWhitespace(cleaned);
        cleaned = this.fixTypos(cleaned);

        // Optionally remove everything enclosed in parentheses
        if (options.stripParens) {
            cleaned = this.stripParens(cleaned);
        }

        // Bail if it's an unknown artist
        cleaned = this.extractUnknown(cleaned, nameObj);

        // Remove other artists
        // TODO: Find a way to expose the other artist names
        cleaned = this.stripExtraNames(cleaned);

        // Extract extra information (unknown, kanji, generation, etc.)
        cleaned = this.extractAfter(cleaned, nameObj);
        cleaned = this.extractAttributed(cleaned, nameObj);
        cleaned = this.extractSchool(cleaned, nameObj);
        cleaned = this.extractKanji(cleaned, nameObj);
        cleaned = this.extractGeneration(cleaned, nameObj);

        // Clean up the string
        cleaned = this.repairName(cleaned);
        cleaned = this.stripParens(cleaned);
        cleaned = this.flipName(cleaned);
        cleaned = this.stripPunctuation(cleaned);
        cleaned = this.stripStopWords(cleaned);

        // Fix some other things we don't care about
        cleaned = cleaned.trim();

        var uncorrectedName = cleaned;

        // Fix lots of bad Romaji usage
        cleaned = this.correctAccents(cleaned);
        cleaned = this.stripAccentsToASCII(cleaned);
        cleaned = this.correctBadRomaji(cleaned);

        // Make sure that ASCII characters are left to convert!
        if (/([a-z][a-z'-]*)\s*([a-z' -]*)\s*/.test(cleaned)) {
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
            if ((surname && !this.toKana(surname) && surname.length > 1) ||
                    (given && !this.toKana(given) && given.length > 1)) {
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
                } else if (parts.length === 1) {
                    // If only one name is provided then it's likely the
                    // surname, which is more common in non-Japanese locales.
                    nameObj.surname = nameObj.given;
                    nameObj.given = "";
                }

                if (options.flipNonJa && nameObj.surname) {
                    var tmp = nameObj.given;
                    nameObj.given = nameObj.surname;
                    nameObj.surname = tmp;
                }

                // Use the built-in name fixes as a first list of defense
                if (settings.fixedNames.given.indexOf((nameObj.surname || "").toLowerCase()) >= 0 ||
                        settings.fixedNames.surname.indexOf(nameObj.given.toLowerCase()) >= 0) {
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

            // Use the built-in name fixes as a first list of defense
            } else if (settings.fixedNames.given.indexOf(surname) >= 0 ||
                    settings.fixedNames.surname.indexOf(given) >= 0) {
                var tmp = given;
                given = surname;
                surname = tmp;
            }

            var allowSwap = settings.fixedNames.given.indexOf(given) < 0 &&
                settings.fixedNames.surname.indexOf(surname) < 0;

            // Look up the two parts of the name in ENAMDICT
            var givenEntries = enamdict.find(given);
            var surnameEntries = enamdict.find(surname);

            if (nameObj.given_kanji || nameObj.surname_kanji) {
                allowSwap = false;

                // Assume that the Kanji version of the name is in the right
                // order. Make sure that the romaji name matches the Kanji.
                if (given && surname &&
                    (givenEntries &&
                    givenEntries.kanji().indexOf(nameObj.surname_kanji) >= 0 ||
                    surnameEntries &&
                    surnameEntries.kanji().indexOf(nameObj.given_kanji) >= 0)) {
                        var tmp = surnameEntries;
                        surnameEntries = givenEntries;
                        givenEntries = tmp;
                        tmp = surname;
                        surname = given;
                        given = tmp;
                }
            }

            if (given && surname && (givenEntries || surnameEntries)) {
                // Fix cases where only one of the two names was found
                if (allowSwap && (!givenEntries || !surnameEntries)) {
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
                } else if (allowSwap && (surnameEntries.type() === "given" ||
                        givenEntries.type() === "surname") &&
                        surnameEntries.type() !== givenEntries.type()) {
                    var tmp = surnameEntries;
                    surnameEntries = givenEntries;
                    givenEntries = tmp;
                }

                // Get the romaji names, if they exist in ENAMDICT
                // If not, fall back to what was provided
                var givenRomaji = this.correctBadRomaji(givenEntries ?
                    givenEntries.romaji() : given);
                var surnameRomaji = this.correctBadRomaji(surnameEntries ?
                    surnameEntries.romaji() : surname);

                // Generate our own kana using hepburn
                var givenKana = this.toKana(givenRomaji || "");
                var surnameKana = this.toKana(surnameRomaji || "");

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
            this.injectFullName(nameObj);

        // Otherwise we need to build the full kanji from the parts
        } else if (nameObj.given_kanji) {
            this.injectFullName(nameObj);
        }

        // Handle when there's no parseable name
        if (!nameObj.name && !nameObj.given && !nameObj.surname &&
                !nameObj.kanji) {
            nameObj.unknown = true;
        }

        delete nameObj.differs;

        return nameObj;
    },

    loadSettings: function(extraSettings, callback) {
        fs.readFile(this.settingsFile, function(err, data) {
            settings = JSON.parse(data.toString("utf8"));
            callback();
        });
    },

    splitKanjiByName: function(nameObj, givenEntries, surnameEntries) {
        // Figure out how the kanji name relates to which name part
        if (!nameObj.kanji || nameObj.given_kanji) {
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

        if ((nameObj.locale === "ja" ? nameObj.given : nameObj.surname) && name) {
            nameObj.name = name;
            if (nameObj.locale === "ja") {
                nameObj.ascii = this.genFullName({
                    locale: nameObj.locale,
                    given: this.stripAccentsToASCII(nameObj.given || ""),
                    surname: this.stripAccentsToASCII(nameObj.surname || ""),
                    middle: this.stripAccentsToASCII(nameObj.middle || ""),
                    generation: nameObj.generation
                });
            } else {
                nameObj.ascii = nameObj.name;
            }
            nameObj.plain = this.genFullName({
                locale: nameObj.locale,
                given: this.stripAccents(nameObj.given || ""),
                surname: this.stripAccents(nameObj.surname || ""),
                middle: this.stripAccents(nameObj.middle || ""),
                generation: nameObj.generation
            });
        }

        if (nameObj.given_kana) {
            nameObj.kana = (nameObj.surname_kana || "") + nameObj.given_kana;
        }

        var kanjiGeneration = (nameObj.generation ?
            " " +  nameObj.generation + "世" : "");

        if (nameObj.given_kanji) {
            nameObj.kanji = (nameObj.surname_kanji ?
                nameObj.surname_kanji + " " : "") +
                nameObj.given_kanji + kanjiGeneration;
        } else if (nameObj.kanji) {
            nameObj.kanji += kanjiGeneration;
        }

        return nameObj;
    },

    capitalizeNames: function(nameObj) {
        if (nameObj.given) {
            nameObj.given = this.capitalize(nameObj.given);
        }
        if (nameObj.middle) {
            nameObj.middle = this.capitalize(nameObj.middle);
        }
        if (nameObj.surname) {
            nameObj.surname = this.capitalize(nameObj.surname);
        }
    },

    capitalize: function(name) {
        return name.toLowerCase().replace(/(?:^|\s)./g, function(all) {
            return all.toUpperCase();
        });
    },

    cleanWhitespace: function(name) {
        return name.replace(/\r?\n/g, " ").trim();
    },

    fixTypos: function(name) {
        return bulkReplace(name, fixTypos);
    },

    flipName: function(name, split) {
        split = split || /,\s*/;
        return name.split(split).reverse().join(" ");
    },

    repairName: function(name) {
        // Placeholder characters that will be replaced in a name
        // This almost always happens on poorly formatted web sites.
        name = name.replace(/([aeiou])_/g, "$1$1");

        // This is definitely a hack but it seems to be the case
        // for many of these particular problems.
        return name.replace(/[?_]/g, "o");
    },

    stripStopWords: function(name) {
        return name.replace(stopRegex, "");
    },

    stripExtraNames: function(name) {
        return name.split(nameSplitRegex)[0];
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
        return hepburn.cleanRomaji(name).toLowerCase();
    },

    convertRepeatedVowel: function(name) {
        return bulkReplace(name, asciiToAccent);
    },

    stripParens: function(name) {
        // Start by removing parens and the contents inside of them
        return name.replace(/\s*[\(（][^\)）]*[\)）]\s*/g, " ")
            // Strip any remaining parens separately
            .replace(/[\(（\)）]/g, "");
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
        var self = this;

        name = name.replace(schoolRegex, function(all) {
            nameObj.school = true;
            if (RegExp.$1) {
                name = "";
                nameObj.surname = RegExp.$1;
                self.injectFullName(nameObj);
            }
            return "";
        });

        return name;
    },

    extractUnknown: function(name, nameObj) {
        if (unknownRegex.test(name)) {
            name = "";
            nameObj.unknown = true;
            nameObj.locale = "";
        }

        return name;
    },

    fixRepeatedKanji: function(name) {
        return name.replace(/(.)々/g, "$1$1");
    },

    extractKanji: function(name, nameObj) {
        var self = this;
        var kanji = "";

        name = name.replace(kanjiRegex, function(all) {
            if (!kanji) {
                kanji = self.stripParens(self.stripPunctuation(
                    self.fixRepeatedKanji(all))).trim();
            }
            return "";
        });

        if (kanji) {
            // Extract generation info from kanji if it exists
            kanji = this.extractGeneration(kanji, nameObj).trim();
            // Strip extraneous whitespace from the kanji
            kanji = kanji.replace(/\s+/g, " ").trim();

            var parts = kanji.split(/\s+/);

            // Surname and given name are already specified
            if (parts.length === 2) {
                // Handle case where there are multiple space-separated names
                if (parts[0].length >= 4 && parts[1].length >= 4) {
                    kanji = parts[0];

                    nameObj.kanji = kanji;
                } else {
                    nameObj.surname_kanji = parts[0];
                    nameObj.given_kanji = parts[1];
                }
            } else {
                nameObj.kanji = kanji;
            }
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
