romaji-name
================

This is a utility primarily designed for consuming, parsing, and correcting Japanese names written in [rōmaji](https://en.wikipedia.org/wiki/Romanization_of_Japanese) using proper [Hepburn romanization](https://en.wikipedia.org/wiki/Hepburn_romanization) form.

Beyond fixing common problems with Japanese names written with rōmaji, it's also able to do a number of amazing things:

1. It's able to figure out which part of the name is the surname and which is the given name and correct the order, if need be (using the [enamdict](https://npmjs.org/package/enamdict) module).
2. It's able to fix names that are missing important punctuation or stress marks (such as missing long vowel marks, like **ō**, or `'` for splitting confusing n-vowel usage).
3. It's able to detect non-Japanese names and leave them intact for future processing.
4. It's able to provide the kana form of the Japanese name (using [Hiragana](https://en.wikipedia.org/wiki/Hiragana) and the [hepburn](https://npmjs.org/package/hepburn) module).
5. It's able to correctly split Japanese names, written with Kanji, into their proper given and surnames.
6. It can detect and properly handle the "generation" portion of the name, both in English and in Japanese (e.g. III, IV, etc.).

This utility was created to help consume all of the (extremely-poorly-written) Japanese names found when collecting data for the [Ukiyo-e Database and Search Engine](http://ukiyo-e.org/).

All code is written by [John Resig](http://ejohn.org/) and is released under an MIT license.

If you like this module this you may also be interested in two other modules that this module depends upon: [enamdict](https://npmjs.org/package/enamdict) and [hepburn](https://npmjs.org/package/hepburn).

Example
-------

```javascript
var romajiName = require("romaji-name");

// Wait for the module to completely load
// (loads the ENAMDICT dictionary)
romajiName.init(function() {
    console.log(romajiName.parseName("Kenichi Nakamura"));
    console.log(romajiName.parseName("Gakuryo Nakamura"));
    console.log(romajiName.parseName("Charles Bartlett"));
});
```

Which will log out objects that looks something like this:

```javascript
// Note the correction of the order of the given/surname
// Also note the correct kana generated and the injection
// of the missing '
{
    original: 'Kenichi Nakamura',
    locale: 'ja',
    given: 'Ken\'ichi',
    given_kana: 'けんいち',
    surname: 'Nakamura',
    surname_kana: 'なかむら',
    name: 'Nakamura Ken\'ichi',
    ascii: 'Nakamura Ken\'ichi',
    plain: 'Nakamura Ken\'ichi',
    kana: 'なかむらけんいち'
}
// Note the correction of the order of the given/surname
// Also note the correction of the missing ō
{
    original: 'Gakuryo Nakamura',
    locale: 'ja',
    given: 'Gakuryō',
    given_kana: 'がくりょう',
    surname: 'Nakamura',
    surname_kana: 'なかむら',
    name: 'Nakamura Gakuryō',
    ascii: 'Nakamura Gakuryoo',
    plain: 'Nakamura Gakuryo',
    kana: 'なかむらがくりょう'
}
// Note that it detects that this is likely not a Japanese name
// (and leaves the locale empty, accordingly)
{
    original: 'Charles Bartlett',
    locale: '',
    given: 'Charles',
    surname: 'Bartlett',
    name: 'Charles Bartlett',
    ascii: 'Charles Bartlett',
    plain: 'Charles Bartlett'
}
```

Installation
------------

This is available as a node module on npm. You can find it here: https://npmjs.org/package/romaji-name It can be installed by running the following:

    npm install romaji-name

Documentation
-------------

This library provides a large number of utility methods for working with names (especially Japanese names). That being said you'll probably only ever make use of just the few main methods:

### `init(Function)`

Loads the dependent modules (namely, loads the `enamdict` name database). If, for some reason, you don't need to do any surname/given name correction, or correction of stress marks, then you can skip this step (this would likely be a very abnormal usage of this library).

### `parseName(String [, Object])`

Parses a single string name and returns an object representing that name. Optionally you can specify some settings to modify how the name is parsed, see below for a list of all the settings.

The returned object will have some, or all, of the following properties:

* `original`: The original string that was passed in to `parseName`.
* `settings`: An object holding the settings that were passed in to the `parseName` method.
* `locale`: A guess at the locale of the name. Only two values exist: `"ja"` and `""`. Note that just because `"ja"` was returned it does not guarantee that the person is actually Japanese, just that the name looks to be Japanese-like (for example: Some Chinese names also return `"ja"`).
* `given`: A string of the Romaji form of the given name. (Will only exist if a Romaji form was originally provided.)
* `given_kana`: A string of the Kana form of the given name. (Will only exist if a Romaji form was originally provided and if the locale is `"ja"`.)
* `given_kanji`: A string of the Kanji form of the given name. (Will only exist if a Kanji form was originally provided.)
* `middle`:
* `surname`: A string of the Romaji form of the surname. (Will only exist if a Romaji form was originally provided.)
* `surname_kana`: A string of the Kana form of the surname. (Will only exist if a Romaji form was originally provided and if the locale is `"ja"`.)
* `surname_kanji`: A string of the Kanji form of the surname. (Will only exist if a Kanji form was originally provided.)
* `generation`: A number representing the generation of the name. For example "John Smith II" would have a generation of `2`.
* `name`: The full name, in properly-stressed romaji, including the generation. For example: `"Nakamura Gakuryō II"`.
* `ascii`: The full name, in ascii text, including the generation. This is a proper ascii representation of the name (with long vowels converted from "ō" into "oo", for example). Example: `"Nakamura Gakuryoo II"`.
* `plain`: The full name, in plain text, including the generation. This is the same as the `name` property but with all stress formatting stripped from it. This could be useful to use in the generation of a URL slug, or some such. It should never be displayed to an end-user as it will almost always be incorrect. Example: `"Nakamura Gakuryo II"`.
* `kana`: The full name, in kana, without the generation. For example: "なかむらがくりょう".
* `kanji`: The full name, in kanji, including the generation. For example: `"戯画堂芦幸 2世"`.
* `unknown`: If the name is a representation of an unknown individual (e.g. it's the string "Unknown", "Not known", or many of the other variations) then this property will exist and be `true`.
* `attributed`: If the name includes a prefix like "Attributed to" then this will be `true`.
* `after`: If the name includes some sort of "After" or "In the style of" or similar prefix then this will be `true`.
* `school`: If the name includes a prefix like "School of", "Pupil of", or similar then this will be `true`.

**Settings:**

The following are optional settings that change how the name parsing functions.

* `flipNonJa`: Names that don't have a "ja" locale should be flipped ("Smith John" becomes "John Smith").
* `stripParens`: Removes anything that's wrapped in parentheses. Normally this is left intact and any extra information is parsed from it.
* `givenFirst`: Assumes that the first name is always the given name.

### `parseName(Object)`

Same as the normal `parseName` method but accepts an object that's in the same form as the object returned from `parseName`. This is useful as you can take existing `romaji-name`-generated name objects and re-parse them again (to easily upgrade them when new changes are made to the `romaji-name` module).