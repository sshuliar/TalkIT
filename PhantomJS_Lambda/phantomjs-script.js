var system = require('system');
var args = require('system').args; 

const startURL = system.env.START_URL || 'https://www.google.com/';

console.log('Start phantom script');
var WebPage = require('webpage');
page = WebPage.create();
page.onLoadFinished = function() {
   console.log('Page is loaded');
   page.render(args[1]);
   console.log('Screenshot is saved');
   phantom.exit();}
page.open(startURL);
