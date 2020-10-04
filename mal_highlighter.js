// ==UserScript==
// @name         MAL Highlighter
// @namespace    http://keittokilta.fi
// @version      2.2.3
// @description  Highlights MAL titles with different colors.
// @author       Borsas
// @match        https://myanimelist.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /** Main functionality of the script */
    class Highlighter {
        /**
         * What type of data and from which user.
         * @param {string} type - Either 'anime' or 'manga'
         * @param {string} username - MAL username
         */
        constructor(type, username){
            this.type = type;
            this.username = username;
        }

        /**
         * Gets the data from MAL's JSON handler every 10800000ms (3h) or if the session storage is empty.
         * Otherwise from the session storage.
         * @returns {JSON} User data (anime, manga)
         */
        async getData() {
            const timestamp = new TimeStamp();
            const sessionStorageItem = sessionStorage.getItem(this.type);

            if (sessionStorageItem && Date.now() < (timestamp.getTimeStamp() + 10800000)){
                console.log(`Loaded ${this.type} from memory`);
                timestamp.setTimeStamp()
                return JSON.parse(sessionStorageItem);
            } else {
                let dataCombined = await (
                    await fetch(`https://myanimelist.net/${this.type}list/${this.username}/load.json?status=7`)
                ).json();

                // When getting the data from MAL's JSON handler,
                // it has to pull it in batches using offset as MAL only gives 300 objects per request.
                let offset = 300;
                while (true) {
                    const data = await (
                        await fetch(`https://myanimelist.net/${this.type}list/${this.username}/load.json?offset=${offset}&status=7`)
                    ).json()

                    offset = offset * 2
                    if (data.length === 0) break;
                    dataCombined = dataCombined.concat(data)
                }

                sessionStorage.setItem(this.type, JSON.stringify(dataCombined));
                console.log(`Loaded ${this.type} from MAL API`);
                timestamp.setTimeStamp()
                return dataCombined;
            }
        }

        /**
         * Adds attributes to the correct elements.
         * @param {string} id - A numerical id
         * @param {string} element - HTML element
         */
        addAttributes(id, element){
            if (this.statusType.watching.includes(parseInt(id))){
                element.classList.add('HL-watching');
            } else if (this.statusType.completed.includes(parseInt(id))){
                element.classList.add('HL-completed');
            } else if (this.statusType.onHold.includes(parseInt(id))){
                element.classList.add('HL-onHold');
            } else if (this.statusType.dropped.includes(parseInt(id))){
                element.classList.add('HL-dropped');
            } else if (this.statusType.planToWatch.includes(parseInt(id))){
                element.classList.add('HL-planToWatch');
            }
        }

        /** Changes colors on myanimelist.net/topanime.php */
        colorTopAnime(){
            let tr = document.getElementsByClassName('ranking-list');

            for (let i = 0; i < tr.length; i++){
                let id = tr[i].getElementsByTagName('a')[0].getAttribute('href').split('/');
                if (id[3] == this.type) {
                    this.addAttributes(id[4], tr[i]);
                }
            }
        }

        // Changes colors on myanimelist.net/people/*/*
        colorPeoplePage(){
            let tr = document.getElementsByTagName('tr');

            // Count of garbage tr classes at the bottom that are not wanted
            // people-comment classes are also added to this if there are any
            let bottom = 0;

            if (document.getElementsByClassName('people-comment')) {
                bottom += document.getElementsByClassName('people-comment').length;
            }

            for (let i = 4; i < tr.length - bottom; i++) {
                let series = tr[i].getElementsByTagName('a')[1];
                let url = series.getAttribute('href').split('/');

                if (url.length === 6) {
                    let id = url[4];
                    if (url[3] === this.type) {
                        this.addAttributes(id, tr[i]);
                    }
                }
            }
        }

        /** Changes colors on character pages */
        colorCharacterPage(){
            let leftBox = document.getElementsByClassName("borderClass");
            let allShows = leftBox[0].getElementsByTagName("tr");

            for (let i = 0; i < allShows.length; i++){
                let url = allShows[i].getElementsByTagName("a")[0].getAttribute("href").split("/");
                if (url[3] == this.type){
                    this.addAttributes(url[4], allShows[i]);
                }
            }
        }

        /** Changes colors on producer and season page */
        colorGenericPage(){
            let allShows = document.getElementsByClassName('seasonal-anime');

            for (let i = 0; i < allShows.length; i++){
                let id = allShows[i].getElementsByClassName('link-title')[0].getAttribute('href').split('/');
                if (id[3] === this.type) {
                    this.addAttributes(id[4], allShows[i]);
                }
            }
        }

        /**
         * Sorts all statuses from the JSON.
         * @param {JSON} data - User data (anime, manga)
         */
        getStatusType(data){
            this.statusType = {watching: [], completed: [], onHold: [], dropped: [], planToWatch: []};
            let id = this.type + '_id';

            for (let property in data){
                switch (data[property].status) {
                    case 1:
                        this.statusType.watching.push(data[property][id]);
                        break;
                    case 2:
                        this.statusType.completed.push(data[property][id]);
                        break;
                    case 3:
                        this.statusType.onHold.push(data[property][id]);
                        break;
                    case 4:
                        this.statusType.dropped.push(data[property][id]);
                        break;
                    case 6:
                        this.statusType.planToWatch.push(data[property][id]);
                }
            }
        }

        /**
         * Main function of Highlighter.
         * Matches pages and applies colors on them.
         */
        async main() {
            const data = await this.getData();
            this.getStatusType(data);

            const url = window.location.href;

            if (url.match(/^https?:\/\/myanimelist\.net\/top(manga|anime)\.php/)){
                this.colorTopAnime();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/people\/\d*\/.*/)){
                this.colorPeoplePage();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/(anime\/(season((\d*\/.*|$)|^\s*$)|producer\/*)|manga\/magazine\/*)/)){
                this.colorGenericPage();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/character\/\d*\/.*/)){
                this.colorCharacterPage();
            }
        }
    }


    /** Class used for handling the timestamp of the previous request on MAL's JSON handler. */
    class TimeStamp {
        /**
         * Saves timestamp (UNIX time in ms) to the browser's local storage as JSON string.
         */
        setTimeStamp(){
            const timestamp = {
                "JSONLoaded": Date.now().toString()
            }

            localStorage.setItem("timestamp", JSON.stringify(timestamp));
            console.log("Timestamp set for MAL's JSON handler call.")
        }

        /**
         * Gets the timestamp from the local storage as integer.
         */
        getTimeStamp(){
            const timestamp = JSON.parse(localStorage.getItem("timestamp"))
            if (timestamp) {
                return parseInt(timestamp.JSONLoaded, 10)
            } else {
                return 0
            }
        }
    }

    /** Class used for handling the user settings of the script, such as custom colors. */
    class Settings {
        /** Default user settings */
        constructor(){
            this.watching = "#34ce0f";
            this.completed = "#ccede4";
            this.onHold = "#f1c83e";
            this.dropped = "#f76265";
            this.planToWatch = "#dcc8aa";
            this.animeHL = "true";
            this.mangaHL = "true";
            this.whenLoadedJSON = "0";
        }

        /** Loads settings from local storage as JSON and sets them to variables */
        loadSettings(){
            const settings = JSON.parse(localStorage.getItem("settings"));
            if (settings) {
                this.watching = settings.watching;
                this.completed = settings.completed;
                this.onHold = settings.onHold;
                this.dropped = settings.dropped;
                this.planToWatch = settings.planToWatch;
                this.animeHL = settings.animeHL;
                this.mangaHL = settings.mangaHL;
            }
        }

        /** Converts settings to JSON */
        setSettings(){
            const settings = {
                "watching": this.watching,
                "completed": this.completed,
                "onHold": this.onHold,
                "dropped": this.dropped,
                "planToWatch": this.planToWatch,
                "animeHL": this.animeHL,
                "mangaHL": this.mangaHL
            }

            localStorage.setItem("settings", JSON.stringify(settings));
        }

        /** Saves settings to local storage as JSON */
        saveSettings(){
            this.watching = document.getElementById("watching").value;
            this.completed = document.getElementById("completed").value;
            this.onHold = document.getElementById("onHold").value;
            this.dropped = document.getElementById("dropped").value;
            this.planToWatch = document.getElementById("planToWatch").value;
            this.animeHL = document.getElementById("animeHL").checked ? "true" : "false";
            this.mangaHL = document.getElementById("mangaHL").checked ? "true" : "false";

            this.setSettings();
            location.reload();
        }

        /** Injects custom CSS */
        injectCss(){
            $('<style type="text/css"/>').html(
                `.settingsWindow {
                    opacity: 1 !important;
                    width: 450px;
                    height: 600px;
                    position: fixed !important;
                    top: 20% !important;
                    left: 35% !important;
                    display: block !important;
                    background-color: white;
                    border-style: solid;
                    border-width: 0 2px 1px;
                    border-color: #d9d9d9;
                    font-size: 15px;
                }
                #HLcolors {
                    padding: 2px;
                    text-align: left;
                }
                #hl-controls {
                    margin-top: 20px;
                    text-align: left;
                    position: absolute;
                    bottom: 20px;
                }
                #hl-controls button {
                    background-color: #2e51a2;
                    border-radius: 4px;
                    color: #fff;
                    font-family: Avenir,lucida grande,tahoma,verdana,arial,sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    height: 30px;
                    padding: 0 6px;
                    text-align: center;
                    text-decoration: none;
                    text-shadow: #323232 -1px -1px 0;
                    transition-duration: .3s;
                    transition-property: all;
                    transition-timing-function: ease-in-out;
                    vertical-align: middle;
                    width: 85px;
                    cursor: pointer;
                }
                #hl-color-pickers {
                    display: flex;
                }
                .hl-color-picker {
                    flex-basis: 20%;
                    flex-grow: 0;
                    text-align: center;
                }
                .hl-color-picker input[type=color] {
                    width: 90%;
                    height: 50px;
                }
                .highlighter {
                    display: flex;
                    justify-content: space-between;
                }
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 45px;
                    height: 25px;
                    align-self: flex-end;
                }
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #aaa;
                    transition: .1s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 19px;
                    width: 19px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .1s;
                    border-radius: 50%;
                }
                input:checked + .slider {
                    background-color: #39C16C;
                }
                input:focus + .slider {
                    box-shadow: 0 0 1px #39C16C;
                }
                input:checked + .slider:before {
                    transform: translateX(20px);
                }
                .information, .your-score .text {
                     color: #323232 !important;}
                .top-anime-rank-text.rank1, .top-anime-rank-text.rank2 {
                    color: #5d5c5c;}
                .top-ranking-table tr.ranking-list td {
                  background-color: transparent !important;}
                .HL-watching {
                    background-color: ${this.watching} !important;}
                .HL-completed {
                    background-color: ${this.completed} !important;}
                .HL-onHold {
                    background-color: ${this.onHold} !important;}
                .HL-dropped {
                    background-color: ${this.dropped} !important;}
                .HL-planToWatch {
                    background-color: ${this.planToWatch} !important;}`
            ).appendTo('head');
        }

        /** Custom HTML */
        settingsMenu(){
            return `
            <h2>Settings for MAL Highlighter</h2>
            <div class="highlighter h1">
                <div>
                    Anime Highlighter
                </div>
                <label class="switch">
                    <input type="checkbox" id="animeHL">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="highlighter h1">
                <div>
                    Manga Highlighter
                </div>
                <label class="switch">
                    <input type="checkbox" id="mangaHL">
                    <span class="slider"></span>
                </label>
            </div>

            <h2>Highlighter colors</h2>
            <div id="HLcolors">
                <div id="hl-color-pickers">
                    <div class="hl-color-picker">
                        <p style="color:${this.watching}">Watching</p>
                        <input id="watching" type="color" value="${this.watching}">
                    </div>
                    <div class="hl-color-picker">
                        <p style="color:${this.completed}">Completed</p>
                        <input id="completed" type="color" value="${this.completed}">
                    </div>
                    <div class="hl-color-picker">
                        <p style="color:${this.onHold}">On hold</p>
                        <input id="onHold" type="color" value="${this.onHold}">
                    </div>
                    <div class="hl-color-picker">
                        <p style="color:${this.dropped}">Dropped</p>
                        <input id="dropped" type="color" value="${this.dropped}">
                    </div>
                    <div class="hl-color-picker">
                        <p style="color:${this.planToWatch}">Planned</p>
                        <input id="planToWatch" type="color" value="${this.planToWatch}">
                    </div>    
                </div>
            </div>
            <div id="hl-controls">
                <button value="submit" id="saveSettings">Save</button>
                <button value="submit" id="resetSettings">Reset</button>
            </div>
            `;
        }

        /** Button used to open settings */
        button(){
            let button = document.createElement("li");
            button.classList.add("small2");
            let linkButton = document.createElement("a");
            let self = this;

            linkButton.classList.add("non-link");
            linkButton.href = "#";
            linkButton.innerHTML = "Settings";
            linkButton.style = "color: orange;";

            linkButton.addEventListener("click", function(){
                self.openSettings();
            });

            button.append(linkButton);

            let position = document.getElementById("nav");
            position.appendChild(button);
        }

        /** Opens settings menu */
        openSettings(){
            let position = document.getElementsByClassName("page-common");
            let settingsBg = document.createElement("div");
            let settingsWindow = document.createElement("div");
            let self = this;

            settingsBg.id = "fancybox-overlay";
            settingsBg.style = "background-color: rgb(102, 102, 102); opacity: 0.3; display: block;";
            position[0].append(settingsBg);

            settingsWindow.id = "fancybox-wrap";
            settingsWindow.classList.add("settingsWindow");

            settingsWindow.innerHTML = this.settingsMenu();
            settingsBg.addEventListener("click", function(){
                position[0].removeChild(settingsWindow);
                position[0].removeChild(settingsBg);
            });
            position[0].append(settingsWindow);

            document.getElementById("saveSettings").addEventListener("click", function(){
                self.saveSettings();
            })

            document.getElementById("resetSettings").addEventListener("click", function(){
                localStorage.clear("settings");
                location.reload();
            })

            document.getElementById("animeHL").checked = this.animeHL === "true";
            document.getElementById("mangaHL").checked = this.mangaHL === "true";
        }
    }

    /** Runs the script */
    class StartScript {
        run(){
            const settings = new Settings();
            settings.loadSettings();

            const profile = document.getElementsByClassName('header-profile-link')[0];

            if (profile){
                const user = profile.text;
                // Because why not, easiest way to convert string to bool
                if (JSON.parse(settings.animeHL)) new Highlighter('anime', user).main();
                if (JSON.parse(settings.mangaHL)) new Highlighter('manga', user).main();
            }
            settings.injectCss();
            settings.button();
        }
    }

    const script = new StartScript();
    script.run();
})();
