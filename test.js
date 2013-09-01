var romajiName = require("./romaji-name");

romajiName.init(function() {
    console.log(romajiName.parseName("Hiroshige Utagawa"));
    console.log(romajiName.parseName("Hiroshige Andō"));
    console.log(romajiName.parseName("Kunitsuru Utagawa"));
    console.log(romajiName.parseName("Toyoshige II, Utagawa"));
    console.log(romajiName.parseName("Utagawa Kunitomi I (国富)"));
    console.log(romajiName.parseName("Toyoshige II (国重　二代)"));
    console.log(romajiName.parseName("国重　二代"));
    console.log(romajiName.parseName("Shun'ei Katsukawa"));
    console.log(romajiName.parseName("Eishôsai Chōki"));
    console.log(romajiName.parseName("Choki Eishosai"));
    console.log(romajiName.parseName("Sharaku Toshusai"));
    console.log(romajiName.parseName("Shunei Katsukawa"));
    console.log(romajiName.parseName("Charles Bartlett"));
    console.log(romajiName.parseName("Ma ZHONGJUN"));
    console.log(romajiName.parseName("Mai Li"));
});