/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js web application for Bluemix to recognize facial expression
//------------------------------------------------------------------------------


// global includes face, age_min, age_max, gender, age_score, gender_score, emotion, emotion_score

// This application uses express as its web server
var express = require('express');
var multer = require('multer');
var cfenv = require('cfenv');
var events = require('events');
var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');


// adopt the express framework
var app = express();


var uploading = multer({
    storage: multer.memoryStorage()
});


var response_to_emotion = function (result, response) {
    // find emotions and response

    // re pattern
    var re_emotion = /"class": "(.*?)"/;
    var re_emotion_score = /"score": (0.[\d]+)/;

    // find emotions and its score
    var emotion = re_emotion.exec(result)[1];
    var emotion_score = re_emotion_score.exec(result)[1];

    var text = 'You are ' + emotion + '. ';
    console.log(text);
    console.log('The accuracy of emotion is ' + emotion_score);

    global.text2 = text;
    global.emotion = emotion;
    global.emotion_score = emotion_score;

    if (emotion === 'Happy') {
        response.redirect("/text.html");
    } else if (emotion === 'Sad') {
        response.redirect("/upset.html");
    } else if (emotion === 'Angry') {
        response.redirect("/angry.html");
    } else if (emotion === 'Afraid') {
        response.redirect("/afraid.html");
    } else if (emotion === 'Surprise') {
        response.redirect("/surprise.html");
    } else if (emotion === 'Disgust') {
        response.redirect("/disgust.html");
    } else if (emotion === 'Neutral') {
        response.redirect("/neutual.html");
    } else {
        response.redirect("/404.html");
    }

};


var response_to_faces = function (result, response) {
    // find faces and response

    // re pattern
    var re_face = /"faces": \[\],/;
    var re_age_min = /"min": (.*?),/;
    var re_age_max = /"max": (.*?),/;
    var re_gender = /"gender": "(.*?)"/;
    var re_age_score = /"age": (.|\n)*?"score": (0.[\d]+)/;
    var re_gender_score = /"gender": (.|\n)*?"score": (0.[\d]+)/;

    // justify faces    
    var face = re_face.test(result);
    if (face) {
        response.redirect("/alert.html");
        global.face = false;
        return false;
    } else {
        // find age and sex
        var age_min = re_age_min.exec(result)[1];
        var age_max = re_age_max.exec(result)[1];
        var gender = re_gender.exec(result)[1];
        var age_score = re_age_score.exec(result)[2];
        var gender_score = re_gender_score.exec(result)[2];

        var text = 'Your age is between ' + age_min + ' to ' + age_max + ', and you are a ' + gender + '.';

        console.log(text);
        console.log('The accuracy of age is ' + age_score);
        console.log('The accuracy of gender is ' + gender_score);

        global.face = true;
        global.text1 = text;
        global.age_min = age_min;
        global.age_max = age_max;
        global.gender = gender;
        global.age_score = age_score;
        global.gender_score = gender_score;

        return text;
    }
};


var invoke_Watson_API = function (params_fd, params_fec, response) {
    // invoke the IBM Watson API

    var emitter = new events.EventEmitter();

    // detect face
    var detect_face = function () {
        visualRecognition.detectFaces(params_fd, function (error, result) {
            if (error) {
                console.log('Oops, faces Detecting in IBM goes wrong!');
                console.log(error);

                response.redirect('/500.html');
            } else {
                var result_json_fd = JSON.stringify(result, null, '  ');
                global.text = response_to_faces(result_json_fd, response);

                if (! global.text) {
                    console.log('Oops, there is no face!');
                } else {
                    console.log('Face Detection Process is Finished');
                    emitter.emit('emotion'); 
                }
            
            }
        });
    };

    // recognize emotion
    var recognize_emotion = function () {
        visualRecognition.classify(params_fec, function (error, result) {
            if (error) {
                console.log('Oops, emotion recognization in IBM goes wrong!');
                console.log(error);

                response.redirect('/500.html');
            } else {
                var result_json_fec = JSON.stringify(result, null, '  ');
                response_to_emotion(result_json_fec, response);

                console.log('Expression Recognition Process is Finished');

                // // face, age_min, age_max, gender, age_score, gender_score, emotion, emotion_score
                // console.log(global);
            }
        });
    };

    emitter.on('face', detect_face);
    emitter.on('emotion', recognize_emotion);

    emitter.emit('face');
};


var justify_file = function (request, response) {
    // justify the type of uploading file, only allowing .jpg or .png 

    try {
        var file_name = request.file.originalname;
        var name_array = file_name.split('');
        var name_mime = [];
        var l = name_array.pop();
    
        name_mime.unshift(l);
    
        while (name_array.length != 0 && l != '.') {
            l = name_array.pop();
            name_mime.unshift(l);
        }
    
        var mime = name_mime.join('');
        console.log(mime);
    
        if (mime === '.JPEG' || mime === '.jpeg' || mime === '.JPG' || mime === '.jpg' || mime === '.PNG' || mime === '.png') {
            return true;
        } else {
            return false;
        }
    } catch (err) {
        response.redirect("/404.html");
    }

};


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// configure the IBM Watson API
var visualRecognition = new VisualRecognitionV3({
    url: 'https://gateway.watsonplatform.net/visual-recognition/api',
    version: '2018-03-19',
    iam_apikey: 'aAJ7i8BpXfQKhYbFIrn2mDt6bER_IDtujtpM5iyVSjqV'
});

var classifier_ids_fec = ["DefaultCustomModel_1376623796"];
var classifier_ids_fd = ["detect_faces"];
var threshold = 0.6;

var params_fec = {
    classifier_ids: classifier_ids_fec,
    threshold: threshold
};
var params_fd = {
    classifier_ids: classifier_ids_fd,
    threshold: threshold
};


// serve the files out of ./public and /public/error as our main files
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/error'));

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function () {

    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
});

app.set('json spaces', 4);

app.post('/upload', uploading.single('file'), function (request, response) {
    // upload a image and analyse it

    console.log("image is uploading...");

    if (justify_file(request, response)) {
        params_fec.images_file = request.file.buffer;
        params_fd.images_file = request.file.buffer;

        // invoke the IBM Watson API
        invoke_Watson_API(params_fd, params_fec, response);
    } else {
        response.redirect("/404.html");
    }
});


//---Deployment Tracker---------------------------------------------------------
require('cf-deployment-tracker-client').track();

