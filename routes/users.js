var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var users_db = firebaseAdmin_DB.ref('users'); 


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// user - inbook
router.get('/inbook', function(req, res, next) {
  res.render('users/user');
});

// user - feedback
router.get('/feedback', function(req, res, next) {
  res.render('users/feedback');
});


// user 表單 POST : user - inbook
router.post('/question/create', function(req, res, next){
  
  // 開啟 firebase
  firebaseAdmin_DB.ref('Serial_number').once('value').then((snapshot) => {
    var Serial_number = snapshot.val();
    // firebaseAdmin_DB  
    var each_question = users_db.push();
    var key = each_question.key;

    // Form post
    var text_question = req.body.text_question;
    var user_email = req.body.user_email;

    // 
    req.body.id = key;

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
