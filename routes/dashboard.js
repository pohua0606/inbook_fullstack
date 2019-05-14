var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var moment = require('moment');
var striptags = require('striptags');

var users_db = firebaseAdmin_DB.ref('users');
var responses_db = firebaseAdmin_DB.ref('responses');

// 新問題 unans
router.get('/unans', function (req, res, next) {
    users_db.once('value').then(function (snapshot) {
        return users_db.orderByChild('askTime').once('value');
    }).then(function (snapshot) {
        const question_list = [];
        snapshot.forEach(function (snapshot_child) {
            if ('no' === snapshot_child.val().answered) {
                question_list.push(snapshot_child.val());
            }
        })
        question_list.reverse();
        res.render('dashboard/unans_dashboard', {
            title: 'unans',
            active: 'unans',
            question_list,
            moment,
            striptags
        });
    })
    
    // 把 users 物件，按照時間排序，然後用迴圈放到新的陣列裡面。
    // 到 ejs 上，將陣列用迴圈讀出呈現。

});

// 歷史回覆 historical
router.get('/historical', function (req, res, next) {
    responses_db.once('value').then(function (snapshot) {
        return responses_db.orderByChild('responseTime').once('value');
    }).then(function (snapshot) {
        const response_list = [];
        snapshot.forEach(function (snapshot_child) {
            response_list.push(snapshot_child.val());
        })
        response_list.reverse();
        console.log(response_list);
        res.render('dashboard/historical_dashboard', {
            title: 'historical',
            active: 'historical',
            response_list,
            moment
        });
    })
});

// 預約查詢 reserved
router.get('/reserved', function (req, res, next) {
    res.render('dashboard/reserved_dashboard', {
        title: 'reserved',
        active: 'reserved'
    });
});

// 銷售紀錄 sell
router.get('/sell', function (req, res, next) {
    res.render('dashboard/sell_dashboard', {
        title: 'sell',
        active: 'sell'
    });
});

// 回覆 answer

// 先讓每一篇點 '回覆' 後的路徑把 id 跳上參數
// 所以在 get 的時候 依照路徑上的 id 去資料庫撈出對應的那筆資料 child()
// 然後把這筆資料傳到 answer 頁面上

router.get('/answer/:id', function (req, res, next) {
    const uid = req.params.id;
    users_db.once('value').then(function (snapshot) {
        return users_db.child(uid).once('value');
    }).then(function (snapshot) {
        const each_question = snapshot.val();
        res.render('dashboard/answer', {
            title: 'answer',
            each_question,
            moment
        });
    })

});

// 問題查看 qanda
router.get('/qanda/:id', function (req, res, next) {
    const rid = req.params.id;
    responses_db.once('value').then(function (snapshot) {
        return responses_db.child(rid).once('value');
    }).then(function (snapshot) {
        const each_qanda = snapshot.val();
        console.log(each_qanda);
        res.render('dashboard/q_and_a', {
            title: 'qanda',
            each_qanda,
            moment
        });
    })
});



module.exports = router;
