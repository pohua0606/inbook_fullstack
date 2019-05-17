var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var csrfProtection = require("../connections/csurf");
var users_db = firebaseAdmin_DB.ref('users');
var responses_db = firebaseAdmin_DB.ref('responses');
var moment = require('moment');

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

// user - inbook
router.get('/inbook',csrfProtection,function (req, res, next) {
  res.render('users/user',{ csrfToken: req.csrfToken() });
});

// user - feedback
router.get('/feedback', function (req, res, next) {
  res.render('users/feedback');
});


// user - confirm to reserve
router.get('/confirm/:rid', function (req, res, next) {

  const rid = req.params.rid;

  responses_db.child(rid).update({
    status: 'reserved'
  })

  responses_db.child(rid).once('value').then(function (snapshot) {
    const reserved_deadline = snapshot.val().reserved_deadline;
    res.render('users/confirm', {
      reserved_deadline,
      moment
    });
  })
});



// user 表單 POST : user - inbook
router.post('/question/create',csrfProtection, function (req, res, next) {

  // 開啟 firebase
  firebaseAdmin_DB.ref('Serial_number').once('value').then((snapshot) => {

    var Serial_number = snapshot.val();

    // firebaseAdmin_DB  
    var each_question = users_db.push();
    var key = each_question.key;

    // Form post
    var text_question = req.body.text_question;
    var user_email = req.body.user_email;

    // Set data from form to db
    each_question.set({
      text_question: text_question,
      email: user_email,
      uid: key,
      answered: 'no',
      askTime: Math.floor(Date.now() / 1000),
      Serial_number: Serial_number
    })

    // 序號 + 1
    Serial_number = Serial_number + 1;

    // 序號回傳回去
    firebaseAdmin_DB.ref('Serial_number').set(Serial_number);

    // 應該要另外寫一個 script 以創建流水號
    res.redirect('/users/inbook');
  })

})

module.exports = router;
