// ==UserScript==
// @name         Development MAL Highlighter
// @namespace    http://keittokilta.fi
// @version      R1.0, D1.1
// @description  Highlights MAL titles with different font colors. This is the Development version. Only works locally for me.
// @author       Borsas
// @match        https://myanimelist.net/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Get data from MALs json handler
  function getData(username){
    return fetch('https://myanimelist.net/animelist/'+ username +'/load.json?status=7')
    .then(response => response.json())
    .catch(error => console.log(error));
  }

  // Adds attributes to the correct elements
  function addAttributes(statusTypes, id, element){
   if (statusTypes["watching"].includes(parseInt(id))){
      element.setAttribute("class", "HL-watching");

    }else if (statusTypes["completed"].includes(parseInt(id))){
      element.setAttribute("class", "HL-completed");

    }else if (statusTypes["onHold"].includes(parseInt(id))){
      element.setAttribute("class", "HL-onHold");

    }else if (statusTypes["dropped"].includes(parseInt(id))){
      element.setAttribute("class", "HL-dropped");

    }else if (statusTypes["planToWatch"].includes(parseInt(id))){
      element.setAttribute("class", "HL-planToWatch");
    }
  }

  // Change font color on myanimelist.net/topanime.php
  function colorTopAnime(statusTypes){
    var table = document.getElementsByClassName("hoverinfo_trigger fl-l fs14 fw-b");
    var tr = document.getElementsByTagName("tr");

    for (var i = 0; i < table.length; i++){
      var id = table[i].getAttribute("href").split("/")[4];
      addAttributes(statusTypes, id, tr[i + 1]);
    }
  }

  // Change font color on myanimelist.net/people/*/*
  function colorPeoplePage(statusTypes){
    var table = document.getElementsByTagName("tr");

    for (var i = 0; i < table.length; i++){
     var series = table[i].getElementsByTagName("a")[1];
     var url = series.getAttribute("href").split("/")

     if (url.length == 6){var id = url[4]}
      addAttributes(statusTypes, id, table[i]);
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
  var user = $('.header-profile-link').text();

  // Inject CSS
  $('<style type="text/css" />').html(
    ".information, .your-score .text { color: #323232 !important;}" +
    ".status.watching {border: #4f74c8 1px solid !important;}" +

    ".HL-watching {background-color: #34ce0f !important;}" +
    ".HL-completed {background-color: #ccede4 !important;}" +
    ".HL-onHold {background-color: #f1c83e !important;}" +
    ".HL-dropped {background-color: #f76265 !important;}" + 
    ".HL-planToWatch {background-color: #dcc8aa !important;}" 

    ).appendTo('head');

  // "main" function, keeps the stuff running and i dont know what else to do :XD:
  getData(user).then(data => {

    var statusTypes = getStatusTypes(data)
    var url = window.location.href;

    if (url.match(/^https?:\/\/myanimelist\.net\/topanime\.php/)){
      colorTopAnime(statusTypes);
    } else if(url.match(/^https?:\/\/myanimelist\.net\/people\/\d*\/.*/)){
      colorPeoplePage(statusTypes);
    }

  });
})();