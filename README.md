romaji-name
================

This is a utility primarily designed for consuming, parsing, and correcting Japanese names written in [rōmaji](https://en.wikipedia.org/wiki/Romanization_of_Japanese) using proper [Hepburn romanization](https://en.wikipedia.org/wiki/Hepburn_romanization) form.

Beyond fixing common problems with Japanese names written with rōmaji, it's also able to do four amazing things:

1. It's able to figure out which part of the name is the surname and which is the given name and correct the order, if need be (using the [enamdict](https://npmjs.org/package/enamdict) module).
2. It's able to fix names that are missing important punctuation or stress marks (such as missing long vowel marks, like **ō**, or `'` for splitting confusing n-vowel usage).
3. It's able to detect non-Japanese names and leave them intact for future processing.
4. It's able to provide the kana form of the Japanese name (using [Hiragana](https://en.wikipedia.org/wiki/Hiragana) and the [hepburn](https://npmjs.org/package/hepburn) module).

I created this utility for helping to consume all of the (extremely-poorly-written) Japanese names found when collecting data for the [Ukiyo-e Database and Search Engine](http://ukiyo-e.org/) I built.

All code is written by [John Resig](http://ejohn.org/) and is released under an MIT license.

If you like this module this you may also be interested in the two other modules that this module depends upon: [enamdict](https://npmjs.org/package/enamdict) and [hepburn](https://npmjs.org/package/hepburn).

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
    name_format: 'surname given generation',
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
    name_format: 'surname given generation',
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
    name_format: 'given surname generation',
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

### `parseName(String)`

### `mergeNames(Object, Object)`

### Utilities:

* `correctAccents(String)`
* `correctBadRomaji(String)`
* `extractKanji(String, Object)`
* `extractGeneration(String, Object)`
* `stripPunctuation(String)`
* `stripAccents(String)`
* `stripAccentsToASCII(String)`
* `stripRepeatedVowel(String)`
* `toKana(String)`
* `capitalize(String)`
* `flipName(String, RegExp?)`
