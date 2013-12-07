var assert = require("assert");
var romajiName = require("./romaji-name");

romajiName.init(function() {
    var tests = [
        { original: 'Ike no Taiga (池大雅)',
          locale: 'ja',
          kanji: '池大雅',
          middle: 'no',
          given: 'Taiga',
          given_kana: 'たいが',
          surname: 'Ike',
          surname_kana: 'いけ',
          given_kanji: '大雅',
          surname_kanji: '池',
          name: 'Ike no Taiga',
          ascii: 'Ike no Taiga',
          plain: 'Ike no Taiga',
          kana: 'いけたいが' },
        { original: 'Romeo V. Tabuena',
          locale: '',
          given: 'Romeo',
          surname: 'Tabuena',
          middle: 'V.',
          name: 'Romeo V. Tabuena',
          ascii: 'Romeo V. Tabuena',
          plain: 'Romeo V. Tabuena' },
        { original: 'Oskar J. A. V. RIESENTHAL',
          locale: '',
          given: 'Oskar',
          surname: 'Riesenthal',
          middle: 'J. A. V.',
          name: 'Oskar J. A. V. Riesenthal',
          ascii: 'Oskar J. A. V. Riesenthal',
          plain: 'Oskar J. A. V. Riesenthal' },
        { original: 'Oskar J. A. RIESENTHAL',
          locale: '',
          given: 'Oskar',
          surname: 'Riesenthal',
          middle: 'J. A.',
          name: 'Oskar J. A. Riesenthal',
          ascii: 'Oskar J. A. Riesenthal',
          plain: 'Oskar J. A. Riesenthal' },
        { original: 'Juliette May Fraser',
          locale: '',
          given: 'Juliette',
          surname: 'Fraser',
          middle: 'May',
          name: 'Juliette May Fraser',
          ascii: 'Juliette May Fraser',
          plain: 'Juliette May Fraser' },
        { original: 'Shun-ei Katsukawa',
          locale: 'ja',
          given: 'Shun-ei',
          given_kana: 'しゅねい',
          surname: 'Katsukawa',
          surname_kana: 'かつかわ',
          name: 'Katsukawa Shun-ei',
          ascii: 'Katsukawa Shun-ei',
          plain: 'Katsukawa Shun-ei',
          kana: 'かつかわしゅねい' },
        { original: 'Tori-jo',
          locale: 'ja',
          given: 'Tori-jo',
          given_kana: 'とりじょ',
          name: 'Tori-jo',
          ascii: 'Tori-jo',
          plain: 'Tori-jo',
          kana: 'とりじょ' },
        { original: 'Hachisuka Kuniaki (国明二代)',
          locale: 'ja',
          generation: 2,
          kanji: '国明',
          given: 'Kuniaki',
          given_kana: 'くにあき',
          surname: 'Hachisuka',
          surname_kana: 'はちすか',
          given_kanji: '国明',
          name: 'Hachisuka Kuniaki II',
          ascii: 'Hachisuka Kuniaki II',
          plain: 'Hachisuka Kuniaki II',
          kana: 'はちすかくにあき' },
        { original: 'Sakamoto Hanjiro (坂本繁二郎)',
          locale: 'ja',
          kanji: '坂本繁二郎',
          given: 'Hanjirō',
          given_kana: 'はんじろう',
          surname: 'Sakamoto',
          surname_kana: 'さかもと',
          given_kanji: '繁二郎',
          surname_kanji: '坂本',
          name: 'Sakamoto Hanjirō',
          ascii: 'Sakamoto Hanjiroo',
          plain: 'Sakamoto Hanjiro',
          kana: 'さかもとはんじろう' },
        { original: 'Utagawa Kunisada II (二代歌川国貞)',
          locale: 'ja',
          kanji: '歌川国貞',
          generation: 2,
          given: 'Kunisada',
          given_kana: 'くにさだ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          given_kanji: '国貞',
          surname_kanji: '歌川',
          name: 'Utagawa Kunisada II',
          ascii: 'Utagawa Kunisada II',
          plain: 'Utagawa Kunisada II',
          kana: 'うたがわくにさだ' },
        { original: 'Asano Takeji (浅野竹二)',
          locale: 'ja',
          kanji: '浅野竹二',
          given: 'Takeji',
          given_kana: 'たけじ',
          surname: 'Asano',
          surname_kana: 'あさの',
          surname_kanji: '浅野',
          given_kanji: '竹二',
          name: 'Asano Takeji',
          ascii: 'Asano Takeji',
          plain: 'Asano Takeji',
          kana: 'あさのたけじ' },
        { original: 'Tokuu',
          locale: 'ja',
          given: 'Tokū',
          given_kana: 'とくう',
          name: 'Tokū',
          ascii: 'Tokuu',
          plain: 'Toku',
          kana: 'とくう' },
        { original: 'Ryûkôsai',
          locale: 'ja',
          given: 'Ryūkōsai',
          given_kana: 'りゅうこおさい',
          name: 'Ryūkōsai',
          ascii: 'Ryuukoosai',
          plain: 'Ryukosai',
          kana: 'りゅうこおさい' },
        { original: 'Utagawa Kunitomi (国富 Toyokuni II)',
          locale: 'ja',
          kanji: '国富',
          given: 'Kunitomi',
          given_kana: 'くにとみ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          given_kanji: '国富',
          name: 'Utagawa Kunitomi',
          ascii: 'Utagawa Kunitomi',
          plain: 'Utagawa Kunitomi',
          kana: 'うたがわくにとみ' },
        { original: 'Kunisada IV Utagawa',
          locale: 'ja',
          generation: 4,
          given: 'Kunisada',
          given_kana: 'くにさだ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Kunisada IV',
          ascii: 'Utagawa Kunisada IV',
          plain: 'Utagawa Kunisada IV',
          kana: 'うたがわくにさだ' },
        { original: 'Utagawa Kunisada IV (1800-1900)',
          locale: 'ja',
          generation: 4,
          given: 'Kunisada',
          given_kana: 'くにさだ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Kunisada IV',
          ascii: 'Utagawa Kunisada IV',
          plain: 'Utagawa Kunisada IV',
          kana: 'うたがわくにさだ' },
        { original: 'Utagawa Kuniyoshi (歌川国芳) (Kuniyoshi, Utagawa)',
          locale: 'ja',
          options: { stripParens: true },
          given: 'Kuniyoshi',
          given_kana: 'くによし',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Kuniyoshi',
          ascii: 'Utagawa Kuniyoshi',
          plain: 'Utagawa Kuniyoshi',
          kana: 'うたがわくによし' },
        { original: 'Hiroshige',
          locale: 'ja',
          options: { givenFirst: true },
          given: 'Hiroshige',
          given_kana: 'ひろしげ',
          name: 'Hiroshige',
          ascii: 'Hiroshige',
          plain: 'Hiroshige',
          kana: 'ひろしげ' },
        // Fo is not valid!
        { original: 'Tsuguharu Foujita',
          locale: '',
          given: 'Tsuguharu',
          surname: 'Foujita',
          name: 'Tsuguharu Foujita',
          ascii: 'Tsuguharu Foujita',
          plain: 'Tsuguharu Foujita' },
        { original: 'Shibata Zeshin (柴田是眞)',
          locale: 'ja',
          kanji: '柴田是眞',
          given: 'Zeshin',
          given_kana: 'ぜしん',
          surname: 'Shibata',
          surname_kana: 'しばた',
          surname_kanji: '柴田',
          given_kanji: '是眞',
          name: 'Shibata Zeshin',
          ascii: 'Shibata Zeshin',
          plain: 'Shibata Zeshin',
          kana: 'しばたぜしん' },
        { original: 'FUKAZAWA Gunji',
          locale: 'ja',
          given: 'Gunji',
          given_kana: 'ぐんじ',
          surname: 'Fukazawa',
          surname_kana: 'ふかざわ',
          name: 'Fukazawa Gunji',
          ascii: 'Fukazawa Gunji',
          plain: 'Fukazawa Gunji',
          kana: 'ふかざわぐんじ' },
        { original: 'Torii Kiyonaga',
          locale: 'ja',
          given: 'Kiyonaga',
          given_kana: 'きよなが',
          surname: 'Torii',
          surname_kana: 'とりい',
          name: 'Torii Kiyonaga',
          ascii: 'Torii Kiyonaga',
          plain: 'Torii Kiyonaga',
          kana: 'とりいきよなが' },
        { original: 'Toyokuni UTAGAWA',
          locale: 'ja',
          options: { givenFirst: true },
          given: 'Toyokuni',
          given_kana: 'とよくに',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Toyokuni',
          ascii: 'Utagawa Toyokuni',
          plain: 'Utagawa Toyokuni',
          kana: 'うたがわとよくに' },
        { original: 'Toyokuni UTAGAWA',
          locale: 'ja',
          given: 'Utagawa',
          given_kana: 'うたがわ',
          surname: 'Toyokuni',
          surname_kana: 'とよくに',
          name: 'Toyokuni Utagawa',
          ascii: 'Toyokuni Utagawa',
          plain: 'Toyokuni Utagawa',
          kana: 'とよくにうたがわ' },
        { original: 'Charles W Bartlett',
          locale: '',
          given: 'Charles',
          surname: 'Bartlett',
          middle: 'W.',
          name: 'Charles W. Bartlett',
          ascii: 'Charles W. Bartlett',
          plain: 'Charles W. Bartlett' },
        { original: 'Toyokuni IV',
          locale: 'ja',
          generation: 4,
          given: 'Toyokuni',
          given_kana: 'とよくに',
          name: 'Toyokuni IV',
          ascii: 'Toyokuni IV',
          plain: 'Toyokuni IV',
          kana: 'とよくに' },
        { original: 'Hiroshige Utagawa',
          locale: 'ja',
          given: 'Hiroshige',
          given_kana: 'ひろしげ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Hiroshige',
          ascii: 'Utagawa Hiroshige',
          plain: 'Utagawa Hiroshige',
          kana: 'うたがわひろしげ' },
        { original: 'Hiroshige Andō',
          locale: 'ja',
          given: 'Hiroshige',
          given_kana: 'ひろしげ',
          surname: 'Andō',
          surname_kana: 'あんどう',
          name: 'Andō Hiroshige',
          ascii: 'Andoo Hiroshige',
          plain: 'Ando Hiroshige',
          kana: 'あんどうひろしげ' },
        { original: 'Kunitsuru Utagawa',
          locale: 'ja',
          given: 'Kunitsuru',
          given_kana: 'くにつる',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Kunitsuru',
          ascii: 'Utagawa Kunitsuru',
          plain: 'Utagawa Kunitsuru',
          kana: 'うたがわくにつる' },
        { original: 'Toyoshige II, Utagawa',
          locale: 'ja',
          generation: 2,
          given: 'Toyoshige',
          given_kana: 'とよしげ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Toyoshige II',
          ascii: 'Utagawa Toyoshige II',
          plain: 'Utagawa Toyoshige II',
          kana: 'うたがわとよしげ' },
        { original: 'Utagawa Kunitomi I (国富)',
          locale: 'ja',
          kanji: '国富',
          generation: 1,
          given: 'Kunitomi',
          given_kana: 'くにとみ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          given_kanji: '国富',
          name: 'Utagawa Kunitomi',
          ascii: 'Utagawa Kunitomi',
          plain: 'Utagawa Kunitomi',
          kana: 'うたがわくにとみ' },
        { original: 'Kiyonobu II (清信　二代)',
          locale: 'ja',
          generation: 2,
          kanji: '清信',
          given: 'Kiyonobu',
          given_kana: 'きよのぶ',
          given_kanji: '清信',
          name: 'Kiyonobu II',
          ascii: 'Kiyonobu II',
          plain: 'Kiyonobu II',
          kana: 'きよのぶ' },
        { original: '清信　二代',
          locale: 'ja',
          generation: 2,
          kanji: '清信',
          given_kanji: '清信' },
        { original: 'Shun\'ei Katsukawa',
          locale: 'ja',
          given: 'Shun\'ei',
          given_kana: 'しゅんえい',
          surname: 'Katsukawa',
          surname_kana: 'かつかわ',
          name: 'Katsukawa Shun\'ei',
          ascii: 'Katsukawa Shun\'ei',
          plain: 'Katsukawa Shun\'ei',
          kana: 'かつかわしゅんえい' },
        { original: 'Eishôsai Chōki',
          locale: 'ja',
          given: 'Chōki',
          given_kana: 'ちょうき',
          surname: 'Eishōsai',
          surname_kana: 'えいしょうさい',
          name: 'Eishōsai Chōki',
          ascii: 'Eishoosai Chooki',
          plain: 'Eishosai Choki',
          kana: 'えいしょうさいちょうき' },
        { original: 'Choki Eishosai',
          locale: 'ja',
          given: 'Chōki',
          given_kana: 'ちょうき',
          surname: 'Eishōsai',
          surname_kana: 'えいしょうさい',
          name: 'Eishōsai Chōki',
          ascii: 'Eishoosai Chooki',
          plain: 'Eishosai Choki',
          kana: 'えいしょうさいちょうき' },
        { original: 'Sharaku Toshusai',
          locale: 'ja',
          given: 'Sharaku',
          given_kana: 'しゃらく',
          surname: 'Tōshūsai',
          surname_kana: 'とうしゅうさい',
          name: 'Tōshūsai Sharaku',
          ascii: 'Tooshuusai Sharaku',
          plain: 'Toshusai Sharaku',
          kana: 'とうしゅうさいしゃらく' },
        { original: 'Shunei Katsukawa',
          locale: 'ja',
          given: 'Shun\'ei',
          given_kana: 'しゅんえい',
          surname: 'Katsukawa',
          surname_kana: 'かつかわ',
          name: 'Katsukawa Shun\'ei',
          ascii: 'Katsukawa Shun\'ei',
          plain: 'Katsukawa Shun\'ei',
          kana: 'かつかわしゅんえい' },
        { original: 'Charles Bartlett',
          locale: '',
          given: 'Charles',
          surname: 'Bartlett',
          name: 'Charles Bartlett',
          ascii: 'Charles Bartlett',
          plain: 'Charles Bartlett' },
        { original: 'Ma ZHONGJUN',
          locale: '',
          given: 'Ma',
          surname: 'Zhongjun',
          name: 'Ma Zhongjun',
          ascii: 'Ma Zhongjun',
          plain: 'Ma Zhongjun' },
        { original: 'Mai Li',
          locale: '',
          given: 'Mai',
          surname: 'Li',
          name: 'Mai Li',
          ascii: 'Mai Li',
          plain: 'Mai Li' },
        { original: 'Shokosai Hanbei (松好斎半兵衛)',
          locale: 'ja',
          kanji: '松好斎半兵衛',
          given: 'Hanbei',
          given_kana: 'はんべい',
          surname: 'Shōkosai',
          surname_kana: 'しょうこさい',
          given_kanji: '半兵衛',
          surname_kanji: '松好斎',
          name: 'Shōkosai Hanbei',
          ascii: 'Shookosai Hanbei',
          plain: 'Shokosai Hanbei',
          kana: 'しょうこさいはんべい' },
        { original: '(松好斎半兵衛)',
          locale: 'ja',
          kanji: '松好斎半兵衛',
          surname_kanji: '松好斎',
          given_kanji: '半兵衛' },
        { original: '歌川広重',
          locale: 'ja',
          kanji: '歌川広重',
          surname_kanji: '歌川',
          given_kanji: '広重' },
        { original: '歌川 国郷',
          locale: 'ja',
          kanji: '歌川国郷',
          surname_kanji: '歌川',
          given_kanji: '国郷' },
        { original: '柴田是眞',
          locale: 'ja',
          kanji: '柴田是眞',
          surname_kanji: '柴田',
          given_kanji: '是眞' },
        { original: '風折有丈',
          locale: 'ja',
          kanji: '風折有丈',
          surname_kanji: '風折',
          given_kanji: '有丈' }
    ];

    tests.forEach(function(expected) {
        var actual = romajiName.parseName(expected);
        try {
            assert.deepEqual(actual, expected);
        } catch(e) {
            console.log("Actual:", actual);
            console.log("Expected:", expected);
            throw e;
        }
    });

    (function() {
        var expected = { original: 'Toyokuni UTAGAWA',
          locale: 'ja',
          options: { givenFirst: false },
          given: 'Toyokuni',
          given_kana: 'とよくに',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          name: 'Utagawa Toyokuni',
          ascii: 'Utagawa Toyokuni',
          plain: 'Utagawa Toyokuni',
          kana: 'うたがわとよくに' };
        var actual = romajiName.parseName(expected, {
            givenFirst: true
        });
        expected.options.givenFirst = true;
        assert.deepEqual(actual, expected);
    })();

    (function() {
        var expected = { original: 'Toyoshige II (国重　二代)',
          locale: 'ja',
          given: 'Toyoshige',
          given_kana: 'とよしげ',
          surname: 'Utagawa',
          surname_kana: 'うたがわ',
          given_kanji: '国重',
          name: 'Utagawa Toyoshige II',
          ascii: 'Utagawa Toyoshige II',
          plain: 'Utagawa Toyoshige II',
          kana: 'うたがわとよしげ',
          generation: 2,
          kanji: '国重' };
        var actual = romajiName.mergeNames(
            romajiName.parseName("Utagawa Kunitomi I (国富)"),
            romajiName.parseName("Toyoshige II (国重　二代)")
        );
        assert.deepEqual(actual, expected);
    })();
});
