var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var moment = require('moment');
var striptags = require('striptags');

var users_db = firebaseAdmin_DB.ref('users');

// 新問題 unans
router.get('/unans', function (req, res, next) {
    let currentPage = Number.parseInt(req.query.page) || 1 ;
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
        const maxItem = (currentPage * perpage) ;
        
        const page_question_list = [];

        question_list.forEach(function(item, i){
            let itemNum = i + 1 // 因為預設是從 0 開始
            if (itemNum >= minItem && itemNum <= maxItem){
                page_question_list.push(item);
            }
        })

        const page = {
            totalPages,
            currentPage,
            hasPre: currentPage > 1 ,
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
    res.render('dashboard/historical_dashboard', {
        title: 'historical',
        active: 'historical'
    });
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
router.get('/qanda', function (req, res, next) {
    res.render('dashboard/q_and_a', {
        title: 'qanda',
        moment
    });
});



module.exports = router;