// ==UserScript==
// @name         MAL Highlighter
// @namespace    http://keittokilta.fi
// @version      1.3
// @description  Highlights MAL titles with different colors.
// @author       Borsas
// @match        https://myanimelist.net/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Get data from MALs json handler or from sessionstorage, depending which has it.
  async function getData(username){

    if(sessionStorage.getItem("animeData")){
      console.log("Loaded data from memory");
      return JSON.parse(sessionStorage.getItem("animeData"));

    } else {  
    let response =  await fetch('https://myanimelist.net/animelist/'+ username +'/load.json?status=7');
    let data = await response.json();

    sessionStorage.setItem("animeData", JSON.stringify(data));
    console.log("Loaded data from MAL API");
    return data;
    }
  }


  // Adds attributes to the correct elements
  function addAttributes(statusTypes, id, element){
   if (statusTypes["watching"].includes(parseInt(id))){
      element.classList.add("HL-watching");

    }else if (statusTypes["completed"].includes(parseInt(id))){
      element.classList.add("HL-completed");

    }else if (statusTypes["onHold"].includes(parseInt(id))){
      element.classList.add("HL-onHold");

    }else if (statusTypes["dropped"].includes(parseInt(id))){
      element.classList.add("HL-dropped");

    }else if (statusTypes["planToWatch"].includes(parseInt(id))){
      element.classList.add("HL-planToWatch");
    }
  }

  // Change color on myanimelist.net/topanime.php
  function colorTopAnime(statusTypes){
    var tr = document.getElementsByClassName("ranking-list");

    for (var i = 0; i < tr.length; i++){
      var id = tr[i].getElementsByTagName("a")[0].getAttribute("href").split("/")[4];
      addAttributes(statusTypes, id, tr[i]);
    }
  }

  // Change color on myanimelist.net/people/*/*
  function colorPeoplePage(statusTypes){
    var tr = document.getElementsByTagName("tr");

    // Count of garbage tr classes in the bottom that are not wanted
    // people-comment classes are also added to this if there are any
    // and manga are also added to this because it will color them with anime colors
    var bottom = 6;

    if(document.getElementsByClassName("people-comment")){
       bottom += document.getElementsByClassName("people-comment").length;
       }

     if(document.getElementsByTagName("tbody")[4].getElementsByTagName("tr")){
       bottom += document.getElementsByTagName("tbody")[4].getElementsByTagName("tr").length;
       }

    for (var i = 4; i < tr.length - bottom; i++){
     var series = tr[i].getElementsByTagName("a")[1];
     var url = series.getAttribute("href").split("/")

     if (url.length == 6){var id = url[4]}
      addAttributes(statusTypes, id, tr[i]);
    }
  }

  // Change color on producer and season page.
  function colorGenericPage(statusTypes){
    var allShows = document.getElementsByClassName("seasonal-anime");

    for (var i = 0; i < allShows.length; i++){
      var id = allShows[i].getElementsByClassName("link-title")[0].getAttribute("href").split("/")[4];
      addAttributes(statusTypes, id, allShows[i]);
    }
  }

  //Sorts all statuses from the json
  function getStatusTypes(data){
    var statusTypes = {watching: [], completed: [], onHold:[], dropped:[], planToWatch: []};

    for(var property in data){
      if (data[property].status === 1){
        statusTypes["watching"].push(data[property].anime_id);

      }else if (data[property].status === 2){
        statusTypes["completed"].push(data[property].anime_id);

      }else if (data[property].status === 3){
        statusTypes["onHold"].push(data[property].anime_id);
      }
      else if (data[property].status === 4){
        statusTypes["dropped"].push(data[property].anime_id);
      }
      else if (data[property].status === 6){
        statusTypes["planToWatch"].push(data[property].anime_id);
      }
    }
    return statusTypes
  }

  // Get username
  var user = document.getElementsByClassName('header-profile-link')[0].text;

  //if(document.getElementsByClassName("btn-user-status-add-list")){
    //document.getElementsByClassName("btn-user-status-add-list")[0].setAttribute('onclick', 'sessionStorage.clear(); return false;');
    //console.log("clear button");
  //}

  // Inject CSS
  $('<style type="text/css" />').html(
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

  // Main function, this shit runs it all
  async function main(){
    var data = await getData(user);
    var statusTypes = getStatusTypes(data);
    var url = window.location.href;

    if (url.match(/^https?:\/\/myanimelist\.net\/topanime\.php/)){
      colorTopAnime(statusTypes);
    } else if(url.match(/^https?:\/\/myanimelist\.net\/people\/\d*\/.*/)){
      colorPeoplePage(statusTypes);
    }else if (url.match(/^https?:\/\/myanimelist\.net\/anime\/(season((\d*\/.*|$)|^\s*$)|producer\/*)/)){
      colorGenericPage(statusTypes);
    }
  }

  main();
  })();