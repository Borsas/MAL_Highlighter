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
            let bottom = 6;

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

        // Inject CSS
        injectCss(){
            $('<style type="text/css"/>').html(
                `.information, .your-score .text {
                     color: #323232 !important;}
                .top-anime-rank-text.rank1, .top-anime-rank-text.rank2 {
                    color: #5d5c5c;}
                .top-ranking-table tr.ranking-list td {
                  background-color: transparent !important;}
                .HL-watching {
                    background-color: #34ce0f !important;}
                .HL-completed {
                    background-color: #ccede4 !important;}
                .HL-onHold {
                    background-color: #f1c83e !important;}
                .HL-dropped {
                    background-color: #f76265 !important;}
                .HL-planToWatch {
                    background-color: #dcc8aa !important;}`
            ).appendTo('head');
        }

        // Main function, this shit runs it all
        async main() {
            let data = await this.getData();
            this.injectCss();

            this.getStatusType(data);


            let url = window.location.href;

            if (url.match(/^https?:\/\/myanimelist\.net\/(topmanga|topanime)\.php/)){
                this.colorTopAnime();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/people\/\d*\/.*/)){
                this.colorPeoplePage();
            } else if (url.match(/^https?:\/\/myanimelist\.net\/(anime\/(season((\d*\/.*|$)|^\s*$)|producer\/*)|manga\/magazine\/*)/)){
                this.colorGenericPage();
            }
        }
    }
    let user = document.getElementsByClassName('header-profile-link')[0].text;

    const animeHL = new Highlighter('anime', user);
    animeHL.main();
    const mangaHL = new Highlighter('manga', user);
    mangaHL.main();
})();
