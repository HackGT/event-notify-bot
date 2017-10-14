var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var calendar = google.calendar('v3');
var request = require('request');
var moment = require('moment');

var key = require(process.env.SETTINGS_FILE);
var sent = {};

var jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/calendar'], // an array of auth scopes
  null
);
function makeMessage(event) {

    var text = {
        "text": "<!channel> Activity starting in 15 minutes:",
        "attachments": [
            {
                "color":"good",
                "ts": Math.floor(moment().valueOf()/1000)
            }
        ]
    }
    
    var date = moment(event.start.dateTime).format("h:mm A");
    var end = moment(event.end.dateTime).format("h:mm A");
    
    text["attachments"][0]["title"] = event["summary"];
    text["attachments"][0]["text"] = `${date} - ${end} in ${event.location}`;
    if (event["description"]) {
        text["attachments"][0]["text"] += `\n${event.description}`
    }
    return text;
}

function run() {
    console.log("Checking for events to send...");
    jwtClient.authorize(function (err, tokens) {
    if (err) {
        console.log(err);
        return;
    }
    calendar.events.list({
        auth: jwtClient,
        calendarId: "kkej52h638a33vnog1qf5m8hfo@group.calendar.google.com"
    }, function(err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            for (var event of response.items) {
                var data = JSON.stringify(makeMessage(event));
                var start = moment(event.start.dateTime);  
                if (moment().diff(start, 'minutes') > -15 && moment().diff(start, 'minutes') < 0  && !sent[event.summary]) {
                    console.log('Sending', event["summary"]);
                    var response = request.post(
                        {
                            url: process.env.SLACK_HOOK, 
                            body: data, 
                            headers: {"Content-type": "application/json"}
                        }, 
                        function (err, response, body) {
                            console.log(err, body);
                    });
                    sent[event.summary] = true;
                }
            }
        });
    });
}
setInterval(run, 15000);
