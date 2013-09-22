var romajiName = require("./romaji-name");

var search = function() {
    console.time("find");
    var name;
    for (var i = 0; i < 10; i++) {
        name = romajiName.parseName("Utagawa Hiroshige");
        name = romajiName.parseName("Hiroshige Ando");
    }
    console.timeEnd("find");
    if (name) {
        console.log(name.name);
    } else {
        console.log("ERROR: Name not found.");
    }
};

romajiName.init(function() {
    search();
});
