var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var moment = require('moment');
var striptags = require('striptags');

var users_db = firebaseAdmin_DB.ref('users');
var responses_db = firebaseAdmin_DB.ref('responses');

// 新問題 unans
router.get('/unans', function (req, res, next) {

    let currentPage = Number.parseInt(req.query.page) || 1;

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


        // 分頁
        const totalResults = question_list.length;
        const perpage = 3;
        const totalPages = Math.ceil(totalResults / perpage);

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        // 這一頁中第一筆，這一頁中最後一頁   
        const minItem = (currentPage * perpage) - perpage + 1
        const maxItem = (currentPage * perpage);

        const page_question_list = [];

        question_list.forEach(function (item, i) {
            let itemNum = i + 1 // 因為預設是從 0 開始
            if (itemNum >= minItem && itemNum <= maxItem) {
                page_question_list.push(item);
            }
        })

        const page = {
            totalPages,
            currentPage,
            hasPre: currentPage > 1,
            hasNext: currentPage < totalPages
        }


        res.render('dashboard/unans_dashboard', {
            title: 'unans',
            active: 'unans',
            question_list: page_question_list,
            page,
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

router.get('/answer/:uid', function (req, res, next) {
    const uid = req.params.uid;
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

router.post('/answer/:uid', function (req, res, next) {
    
    const uid = req.params.uid;
    var each_response = responses_db.push();
    var response_key = each_response.key;
    
    users_db.child(uid).update({
        answered : 'yes'
    })
    
    firebaseAdmin_DB.ref('users/' + uid).once('value').then(snapshot => {
        const text_question = snapshot.val().text_question;
        each_response.set({
            rid: response_key,
            uid: uid,
            text_question: text_question,
            text_answer: req.body.text_answer,
            book: req.body.book,
            status: 'no',
            answerTime: Math.floor(Date.now() / 1000)
        })
    })

    res.redirect('/dashboard/unans');
});

// 問題查看 qanda
router.get('/qanda/:rid', function (req, res, next) {
    const rid = req.params.rid;
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
