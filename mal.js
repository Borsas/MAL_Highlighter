// ==UserScript==
// @name         MAL Highlighter
// @namespace    http://keittokilta.fi
// @version      2.1.0
// @description  Highlights MAL titles with different colors.
// @author       Borsas
// @match        https://myanimelist.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    class Highlighter {
        constructor(type, username){
            this.type = type;
            this.username = username;
        }

        // Get data from MAL's json handler or from sessionstorage, depending on which has it.
        async getData() {
            if (sessionStorage.getItem(this.type)){
                console.log('Loaded ' + this.type + ' from memory');
                return JSON.parse(sessionStorage.getItem(this.type));
            } else {
                let data = await (await fetch('https://myanimelist.net/' + this.type +'list/'+ this.username +'/load.json?status=7')).json();
                sessionStorage.setItem(this.type, JSON.stringify(data));
                console.log('Loaded ' + this.type +' from MAL API');
                return data;
            }
        }

        // Adds attributes to the correct elements
        addAttributes(id, element){
            if (this.statusType['watching'].includes(parseInt(id))){
                element.classList.add('HL-watching');
            } else if (this.statusType['completed'].includes(parseInt(id))){
                element.classList.add('HL-completed');
            } else if (this.statusType['onHold'].includes(parseInt(id))){
                element.classList.add('HL-onHold');
            } else if (this.statusType['dropped'].includes(parseInt(id))){
                element.classList.add('HL-dropped');
            } else if (this.statusType['planToWatch'].includes(parseInt(id))){
                element.classList.add('HL-planToWatch');
            }
        }

        // Change color on myanimelist.net/topanime.php
        colorTopAnime(){
            let tr = document.getElementsByClassName('ranking-list');

            for (let i = 0; i < tr.length; i++){
                let id = tr[i].getElementsByTagName('a')[0].getAttribute('href').split('/');
                if (id[3] == this.type) {
                    this.addAttributes(id[4], tr[i]);
                }
            }
        }

        // Change color on myanimelist.net/people/*/*
        colorPeoplePage(){
            let tr = document.getElementsByTagName('tr');

            // Count of garbage tr classes in the bottom that are not wanted
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

        // Change color on character pages
        colorCharacterPage(){
            let leftBox = document.getElementsByClassName("borderClass");
            let allShows = leftBox[0].getElementsByTagName("tr");

            for(let i = 0; i < allShows.length; i++){
                let url = allShows[i].getElementsByTagName("a")[0].getAttribute("href").split("/");
                if(url[3] == this.type){
                    this.addAttributes(url[4], allShows[i]);
                }
            }

        }

        // Change color on producer and season page.
        colorGenericPage(){
            let allShows = document.getElementsByClassName('seasonal-anime');

            for (let i = 0; i < allShows.length; i++){
                let id = allShows[i].getElementsByClassName('link-title')[0].getAttribute('href').split('/');
                if (id[3] === this.type) {
                    this.addAttributes(id[4], allShows[i]);
                }
            }
        }

        // Sorts all statuses from the json
        getStatusType(data){
            this.statusType = {watching: [], completed: [], onHold: [], dropped: [], planToWatch: []};
            let id = this.type + '_id';

            for (let property in data){
                switch (data[property].status) {
                    case 1:
                        this.statusType['watching'].push(data[property][id]);
                        break;
                    case 2:
                        this.statusType['completed'].push(data[property][id]);
                        break;
                    case 3:
                        this.statusType['onHold'].push(data[property][id]);
                        break;
                    case 4:
                        this.statusType['dropped'].push(data[property][id]);
                        break;
                    case 6:
                        this.statusType['planToWatch'].push(data[property][id]);
                }
            }
        }

        // Main function, this shit runs it all
        async main() {
            let data = await this.getData();
            this.getStatusType(data);


            let url = window.location.href;

            if (url.match(/^https?:\/\/myanimelist\.net\/top(manga|anime)\.php/)){
                this.colorTopAnime();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/people\/\d*\/.*/)){
                this.colorPeoplePage();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/(anime\/(season((\d*\/.*|$)|^\s*$)|producer\/*)|manga\/magazine\/*)/)){
                this.colorGenericPage();
            }else if(url.match(/^https?:\/\/myanimelist\.net\/character\/\d*\/.*/)){
                this.colorCharacterPage();
            }
        }
    }


    class Settings {
        constructor(){
            this.watching = "#34ce0f";
            this.completed = "#ccede4";
            this.onHold = "#f1c83e";
            this.dropped = "#f76265";
            this.planToWatch = "#dcc8aa";
            this.animeHL = "true";
            this.mangaHL = "true";
        }

        main(){
            this.loadSettings();
            let user = document.getElementsByClassName('header-profile-link')[0].text;

            // Because why not, easiest way to convert string to bool
            if(JSON.parse(this.animeHL)) new Highlighter('anime', user).main();
            if(JSON.parse(this.mangaHL)) new Highlighter('manga', user).main();
            
            this.injectCss();
            this.button();

        }

        loadSettings(){
            if(JSON.parse(localStorage.getItem("settings"))){
                let settings = JSON.parse(localStorage.getItem("settings"));

                this.watching = settings["watching"];
                this.completed = settings["completed"];
                this.onHold = settings["onHold"];
                this.dropped = settings["dropped"];
                this.planToWatch = settings["planToWatch"];
                this.animeHL = settings["animeHL"];
                this.mangaHL = settings["mangaHL"];
            }

        }

        setSettings(){
            let settings = {
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

        saveSettings(){
            this.watching = document.getElementById("watching").value;
            this.completed = document.getElementById("completed").value;
            this.onHold = document.getElementById("onHold").value;
            this.dropped = document.getElementById("dropped").value;
            this.planToWatch = document.getElementById("planToWatch").value;
            this.animeHL = document.getElementById("animeHL").value;
            this.mangaHL = document.getElementById("mangaHL").value;

            this.setSettings();
            location.reload();
        }

        // Inject CSS
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
                .information, .your-score .text {
                     color: #323232 !important;}
                .top-anime-rank-text.rank1, .top-anime-rank-text.rank2 {
                    color: #5d5c5c;}
                .top-ranking-table tr.ranking-list td {
                  background-color: transparent !important;}
                .HL-watching {
                    background-color: ` + this.watching + ` !important;}
                .HL-completed {
                    background-color: ` + this.completed + ` !important;}
                .HL-onHold {
                    background-color: ` + this.onHold + ` !important;}
                .HL-dropped {
                    background-color: ` + this.dropped + ` !important;}
                .HL-planToWatch {
                    background-color: ` + this.planToWatch + ` !important;}`
            ).appendTo('head');
        }  

        settingsMenu(){
            return `
            <h2>Settings for MAL Highlighter</h2>
            <div id="highlighters" class="h1">
                Anime Highligter
                <select id="animeHL">
                    <option value="true">Enable</option>
                    <option value="false">Disable</option>
                </select>
            </div>
            <div id="highlighters" class="h1">
                Manga Highligter
                <select id="mangaHL">
                    <option value="true">Enable</option>
                    <option value="false">Disable</option>
                </select>
            </div>

            <h2>Highlighter colors</h2>
            <div id="HLcolors">
                <p style="color:${this.watching}">Watching</p>
                <input id="watching" type="text" value="${this.watching}">
                <p style="color:${this.completed}">Completed</p>
                <input id="completed" type="text" value="${this.completed}">
                <p style="color:${this.onHold}">On hold</p>
                <input id="onHold" type="text" value="${this.onHold}">
                <p style="color:${this.dropped}">Dropped</p>
                <input id="dropped" type="text" value="${this.dropped}">
                <p style="color:${this.planToWatch}">Plan to watch</p>
                <input id="planToWatch" type="text" value="${this.planToWatch}">
                <br>
                <button value="submit" id="saveSettings">Save</button>
                <button value="submit" id="resetSettings">Reset</button>
            </div>
            `;
        }


        button(){
            var button = document.createElement("li");
            var linkButton = document.createElement("a");
            var self = this;

            linkButton.classList.add("non-link");
            linkButton.href = "#";
            linkButton.innerHTML = "Settings";
            linkButton.style = "color: orange;";

            linkButton.addEventListener("click", function(){
                self.openSettings();
            });

            button.append(linkButton);

            var position = document.getElementById("nav");
            position.appendChild(button);
        }


        openSettings(){
            var position = document.getElementsByClassName("page-common");
            var settingsBg = document.createElement("div");
            var settingsWindow = document.createElement("div");
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
        }

    }

    let start = new Settings();
    start.main();
})();
