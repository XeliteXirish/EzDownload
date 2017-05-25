//META{"name":"EzDownload"}*//

'use strict';

var EzDownload = function () {
};

var fs = require('fs');

EzDownload.prototype.getAuthor = function () {
    return "XeliteXirish";
};
EzDownload.prototype.getName = function () {
    return "EzDownload";
};
EzDownload.prototype.getDescription = function () {
    return "Lets you easily download your images!";
};
EzDownload.prototype.getVersion = function () {
    return "0.1";
};

EzDownload.prototype.load = function () {};
EzDownload.prototype.unload = function () {};
EzDownload.prototype.onMessage = function () {};
EzDownload.prototype.onSwitch = function () {};
EzDownload.prototype.stop = function () {}

EzDownload.prototype.start = function () {

    this.namingMethod = function (plugin, settings, url, dir) {

        let filename_original = url.split('/').slice(-1)[0].split('?')[0];
        let temp = filename_original.split('.');
        let filetype_original = '.' + temp.pop();
        filename_original = temp.join('.');

        let filename = filename_original + filetype_original;

        let num = 2;
        let loops = 2048;
        while (plugin.accessSync(dir + filename) && loops--) {
            filename = filename_original + ` (${num})` + filetype_original;
            num++;
        }

        if (loops == -1) {
            console.error('Unable to find a free filename, make sure you have permissions and that no images exist with the same name!');
            return null;
        }

        return filename;
    };

};

EzDownload.prototype.accessSync = function (dir) {
    try {
        fs.accessSync(dir, fs.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};


EzDownload.prototype.observer = function (e) {

    var settings = this.loadSettings();

    if (e.addedNodes.length > 0 && e.addedNodes[0].className == 'callout-backdrop') {
        var element = document.getElementsByClassName('modal-image')[0];
        if (!element) return;

        var button = document.createElement('a');


        fs.access(settings.direcotry, fs.W_OK, err => {
            if (err) {
                button.id = "ez_button";

                button.className = "download-button";
                button.innerHTML = "Unable to download, invalid save directory!";

            } else {
                button.id = "ez_button";
                button.href = "#";
                button.onclick = this.saveCurrentImage.bind(this);
                button.className = "download-button";
                button.innerHTML = "Download & Save";
            }
            element.appendChild(button);
        });
    }
};
EzDownload.prototype.saveSettings = function (button) {
    var settings = this.loadSettings();
    var dir = document.getElementById('ez_directory').value;

    var plugin = BdApi.getPlugin('EzDownload');
    var err = document.getElementById('ez_err');

    if (dir.slice(-1) != '/') dir += '/';

    if (plugin.accessSync(dir)) {


        settings.direcotry = dir;

        bdPluginStorage.set(this.getName(), 'config', JSON.stringify(settings));

        plugin.stop();
        plugin.start();

        err.innerHTML = "";
        button.innerHTML = "Saved and applied!";
    } else {
        err.innerHTML = "Error: Invalid directory!";
        return;
    }
    setTimeout(function () {
        button.innerHTML = "Save and apply";
    }, 1000);
};

EzDownload.prototype.settingsVersion = 6;
EzDownload.prototype.defaultSettings = function () {
    return {
        version: this.settingsVersion,
        direcotry: "Not set"
    };
};

EzDownload.prototype.resetSettings = function (button) {
    var settings = this.defaultSettings();
    bdPluginStorage.set(this.getName(), 'config', JSON.stringify(settings));
    this.stop();
    this.start();
    button.innerHTML = "Settings successfully reset!";
    setTimeout(function () {
        button.innerHTML = "Reset settings";
    }, 1000);
};

EzDownload.prototype.loadSettings = function () {

    var settings = (bdPluginStorage.get(this.getName(), 'config')) ? JSON.parse(bdPluginStorage.get(this.getName(), 'config')) : {version: "0"};
    if (settings.version != this.settingsVersion) {
        console.log('[' + this.getName() + '] Settings were outdated/invalid/nonexistent. Using default settings.');
        settings = this.defaultSettings();
        bdPluginStorage.set(this.getName(), 'config', JSON.stringify(settings));
    }
    return settings;
};

EzDownload.prototype.import = function (string) {
    bdPluginStorage.set(this.getName(), 'config', string);
    this.stop();
    this.start();
};

EzDownload.prototype.getSettingsPanel = function () {
    var settings = this.loadSettings();

    var html = "<h3 style='color: blue;'>Ez Settings Panel</h3><br><br>";
    html += "&bull;&nbsp;Download directory path:<br>";
    html += "<small>~ Full path to the directory is required.</small><br><br>";
    html += "<input id='ez_directory' type='text' value=" + (settings.direcotry) + " placeholder='C:\Users\XeliteXirish\Desktop' style='width:100% !important;'> <br><br>";

    html += "<br><br>";

    html += "<br><button onclick=BdApi.getPlugin('" + this.getName() + "').saveSettings(this)>Save and apply</button>&nbsp;&nbsp;&nbsp;";
    html += "<button onclick=BdApi.getPlugin('" + this.getName() + "').resetSettings(this)>Reset settings</button> <br><br>";

    html += "<p style='color:red' id='ez_err'></p>";

    html += "Help!<br>";
    html += "&bull;&nbsp;If you have any questions, just send me a message on my <a href='https://twitter.com/XeliteXirish'><u>Twitter</u></a><br>";

    return html;
};

EzDownload.prototype.saveCurrentImage = function () {
    var button = document.getElementById('ez_button');
    button.innerHTML = "Downloading...";
    var plugin = BdApi.getPlugin('EzDownload');
    var settings = plugin.loadSettings();

    var dir = settings.direcotry;
    var url = document.getElementsByClassName('modal-image')[0].childNodes[1].attributes[0].nodeValue;
    var twitterFix = new RegExp(":large$");
    if (twitterFix.test(url)) {
        url = url.replace(twitterFix, '');
    }
    var http = (url.split('//')[0] == 'https:') ? require('https') : require('http');


    var filename = plugin.namingMethod(plugin, settings, url, dir);

    if (filename == null) {
        button.innerHTML = 'Error while trying to find a free filename! Check console for more details.';
        return;
    }

    var dest = dir + filename;
    console.info(`Saving to directory... ${dest}`);

    var file = fs.createWriteStream(dest);

    http.get(url, response => {
        response.pipe(file);
        file.on('finish', function () {
            console.log("Finished");
            button.innerHTML = "Download finished";
            file.close();
        });

    }).on('error', err => {
        fs.unlink(dest);
        if (document.getElementById('ez_button')) {
            button.innerHTML = "Error: " + err.message;
        } else {
            BdApi.getCore().alert('Download Error', 'Failed to download file ' + url + '\nError: ' + err.message);
        }

        console.log(err.stack);
        file.close();
    });
};
