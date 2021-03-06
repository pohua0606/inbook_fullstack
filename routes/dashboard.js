var express = require('express');
var router = express.Router();
var firebaseAdmin_DB = require('../connections/firebase_admin');
var moment = require('moment');
var striptags = require('striptags');
var nodemailer = require('nodemailer');
var moment = require('moment');
var users_db = firebaseAdmin_DB.ref('users');
var responses_db = firebaseAdmin_DB.ref('responses');
var csrf = require('csurf');
var csrfProtection = csrf({ cookie: true });
var createError = require('http-errors');

// 新問題 unans
router.get('/unans', function (req, res, next) {

    let currentPage = Number.parseInt(req.query.page) || 1;

    users_db.once('value').then(function (snapshot) {
        return users_db.orderByChild('askTime').once('value');
    })
    .then(function (snapshot) {

            const question_list = [];
            snapshot.forEach(function (snapshot_child) {
                if ('no' === snapshot_child.val().answered) {
                    question_list.push(snapshot_child.val());
                }
            })
            // question_list.reverse();

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
        .catch(function (error) {
            console.log('Message : ', error.message);
            console.log('Stack : ', error.stack);
            res.redirect('/dashboard/unans');
        })

    // 把 users 物件，按照時間排序，然後用迴圈放到新的陣列裡面。
    // 到 ejs 上，將陣列用迴圈讀出呈現。
});

// 歷史回覆 historical

router.get('/historical', function (req, res, next) {

    let currentPage = Number.parseInt(req.query.page) || 1;
    const status = req.query.status || 'all';

    // 抓 route 的query 參數
    // 如果沒有 query 參數就把狀態參數命名成 all

    responses_db.once('value').then(function (snapshot) {
        return responses_db.orderByChild('responseTime').once('value');
    })
    .then(function (snapshot) {
        const response_list = [];
        snapshot.forEach(function (snapshot_child) {
            // 對應 query 抓的狀態參數與資料庫中每筆資料的 status
            if (snapshot_child.val().status === status) {
                response_list.push(snapshot_child.val());
            }
            // 如果沒有 query 參數就把狀態參數 all 
            // 把全部資料都丟到 list 中
            else if (status == 'all') {
                response_list.push(snapshot_child.val());
            }
        })

        response_list.reverse();

        // 分頁
        const totalResults = response_list.length;
        const perpage = 10;
        const totalPages = Math.ceil(totalResults / perpage);

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        // 這一頁中第一筆，這一頁中最後一頁   
        const minItem = (currentPage * perpage) - perpage + 1
        const maxItem = (currentPage * perpage);

        const page_response_list = [];

        response_list.forEach(function (item, i) {
            let itemNum = i + 1 // 因為預設是從 0 開始
            if (itemNum >= minItem && itemNum <= maxItem) {
                page_response_list.push(item);
            }
        })

        const page = {
            totalPages,
            currentPage,
            hasPre: currentPage > 1,
            hasNext: currentPage < totalPages
        }

        res.render('dashboard/historical_dashboard', {
            title: 'historical',
            active: 'historical',
            response_list: page_response_list,
            moment,
            page
        });
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/historical');
    })
});



// 預約查詢 reserved : 這邊只要把 status 是 reserved 的放到一個新的陣列就好
router.get('/reserved', function (req, res, next) {
    responses_db.once('value').then(function (snapshot) {
        return responses_db.orderByChild('responseTime').once('value');
    })
    .then(function (snapshot) {
        const reserved_response_list = [];
        snapshot.forEach(function (snapshot_child) {

            // deadline 逾期自動化 跳掉 canceled
            if (Math.floor((Date.now() / 1000)) > snapshot_child.val().reserved_deadline) {
                responses_db.child(snapshot_child.val().rid).update({
                    status: 'canceled'
                })
            }
            if ('reserved' === snapshot_child.val().status) {
                reserved_response_list.push(snapshot_child.val());
            }
        })
        reserved_response_list.reverse();
        const search_result = req.flash('search_result')[0];
        const search_error = req.flash('error')[0];

        res.render('dashboard/reserved_dashboard', {
            title: 'reserved',
            active: 'reserved',
            reserved_response_list,
            moment,
            search_result,
            search_error
        });
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/reserved');
    })
});


// Search in reserved
router.get('/reserved/search', function (req, res, next) {

    // if (!isNaN(req.query.Serial_number)) {
    // 先看 Search 輸入的是否是數值，如果是數值，才可以進行搜尋
    const Search_Serial_number = Number.parseInt(req.query.Serial_number);
    // 搜尋序號不能是 0 ，且輸入的數值型態必須是 number
    if (Search_Serial_number !== 0 && typeof Search_Serial_number == 'number') {
        // 還要增加如果這個序號沒有在資料庫中的錯誤，這個錯誤是不是不應該存在？
        firebaseAdmin_DB.ref('Serial_number').once('value')
            .then(function (snapshot) {
                // snapshot.val() 是資料庫中 Serial_number 的值
                // 輸入搜尋的值不可能大於資料庫中 Serial_number 
                if (snapshot.val() <= Search_Serial_number) {
                    req.flash('error', '序號搜尋錯誤呦！');
                    res.redirect('/dashboard/reserved');
                } else {
                    responses_db.orderByChild('Serial_number').equalTo(Search_Serial_number)
                        .once('value', function (snapshot) {
                            // 如果在 responses 資料庫中有存在這個值，才會去撈資料
                            if (snapshot.exists()) {
                                // 如果這個序號有 user 問題，但沒有老闆 response，會報錯
                                if ('reserved' === Object.values(snapshot.val())[0].status) {
                                    var search_result = Object.values(snapshot.val())[0];
                                }

                                if (search_result) {
                                    req.flash('search_result', search_result);
                                }
                                res.redirect('/dashboard/reserved')
                            } else {
                                req.flash('error', '序號搜尋錯誤呦！');
                                res.redirect('/dashboard/reserved');
                            }
                        })
                }
            })
            .catch(function (error) {
                console.log('Message : ', error.message);
                console.log('Stack : ', error.stack);
                req.flash('error', '序號搜尋錯誤呦！');
                res.redirect('/dashboard/reserved');
            })

        // Do i need to catch error here ???
    } else {
        req.flash('error', '序號搜尋錯誤呦！');
        res.redirect('/dashboard/reserved');
    }
    // } else {
    //     req.flash('error', '序號搜尋錯誤呦！');
    //     res.redirect('/dashboard/reserved');
    // }

    // flash 錯誤顯示與重新導向重複太多次，可以考慮寫成 function
})

// Modal sell to add price  
router.post('/reserved/:rid', function (req, res, next) {
    
    const rid = req.params.rid;
    var price = req.body.price;

    responses_db.child(rid).update({
        sold_time: Math.floor(Date.now() / 1000),
        price: price,
        status: 'sold'
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/reserved');
    })
    
    res.redirect('/dashboard/reserved')
})


// 銷售紀錄 sold
router.get('/sold', function (req, res, next) {
    let currentPage = Number.parseInt(req.query.page) || 1;
    responses_db.once('value').then(function (snapshot) {
        return responses_db.orderByChild('responseTime').once('value');
    })
    .then(function (snapshot) {
        const sold_response_list = [];
        snapshot.forEach(function (snapshot_child) {
            if ('sold' === snapshot_child.val().status) {
                sold_response_list.push(snapshot_child.val());
            }
        })
        sold_response_list.reverse();

        // 分頁
        const totalResults = sold_response_list.length;
        const perpage = 10;
        const totalPages = Math.ceil(totalResults / perpage);

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        // 這一頁中第一筆，這一頁中最後一頁   
        const minItem = (currentPage * perpage) - perpage + 1
        const maxItem = (currentPage * perpage);

        const page_response_list = [];

        sold_response_list.forEach(function (item, i) {
            let itemNum = i + 1 // 因為預設是從 0 開始
            if (itemNum >= minItem && itemNum <= maxItem) {
                page_response_list.push(item);
            }
        })

        const page = {
            totalPages,
            currentPage,
            hasPre: currentPage > 1,
            hasNext: currentPage < totalPages
        }

        res.render('dashboard/sell_dashboard', {
            title: 'sold',
            active: 'sold',
            sold_response_list: page_response_list,
            page,
            moment
        });
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/sold');
    })
});


// Get 老闆回覆 answer

// 先讓每一篇點 '回覆' 後的路徑把 id 跳上參數
// 所以在 get 的時候 依照路徑上的 id 去資料庫撈出對應的那筆資料 child()
// 然後把這筆資料傳到 answer 頁面上

router.get('/answer/:uid', csrfProtection, function (req, res, next) {
    const uid = req.params.uid;
    users_db.once('value').then(function (snapshot) {
        return users_db.child(uid).once('value');
    })
    .then(function (snapshot) {
        const each_question = snapshot.val();
        res.render('dashboard/answer', {
            title: 'answer',
            each_question,
            moment,
            csrfToken: req.csrfToken()
        });
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/answer/:uid');
    })
});


// Post 老闆回覆
router.post('/answer/:uid', csrfProtection, function (req, res, next) {

    const uid = req.params.uid;
    var each_response = responses_db.push();
    var response_key = each_response.key;

    users_db.child(uid).update({
        answered: 'yes'
    })

    firebaseAdmin_DB.ref('users/' + uid).once('value').then(snapshot => {
        const text_question = snapshot.val().text_question;
        const Serial_number = snapshot.val().Serial_number;
        const user_email = snapshot.val().email;

        each_response.set({
            rid: response_key,
            uid: uid,
            text_question: text_question,
            text_answer: req.body.text_answer,
            book: req.body.book,
            status: 'no',
            answerTime: Math.floor(Date.now() / 1000),
            reserved_deadline: Math.floor((Date.now() / 1000) + (86400 * 3)),
            Serial_number: Serial_number
        })

        var transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'inbookinbook@gmail.com',
                pass: 'KenJerryAaronJimmy'
            }
        });
        var reserved_deadline_email = moment().add(3, 'days').format('YYYY / MM / DD');
        var boss_answer = req.body.text_answer;
        var default_answer =
            '<br><br>謝謝你願意傾聽自己，將自己的想法書寫下來，<br>在面對生活的難題時，能真正解決問題的，<br>不是書裡，而是梳理。<br>我們準備了一本好書給你，期待陪你踏上這趟旅程。<br>'
        var full_answer = boss_answer + '<br>' + default_answer + '<br>';

        var mailOptions = {
            from: '書裡 | inbook <inbookinbook>',
            to: user_email,
            subject: '書裡回覆你的問題了',
            html: `<p>${full_answer}你的序號為：${Serial_number} <br> 請點擊：<a href="https://inbookinbook.herokuapp.com/users/confirm/${response_key}"> 確認預約本書 </a> ，在${reserved_deadline_email}前來，開啟這趟自我探索的旅途。</p>`
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            }
        })
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/unans');
    })

    res.redirect('/dashboard/unans');
});


// 問題查看 qanda

router.get('/qanda/:rid', function (req, res, next) {
    const rid = req.params.rid;
    responses_db.once('value').then(function (snapshot) {
        return responses_db.child(rid).once('value');
    })
    .then(function (snapshot) {
        const each_qanda = snapshot.val();

        res.render('dashboard/q_and_a', {
            title: 'qanda',
            each_qanda,
            moment
        });
    })
    .catch(function (error) {
        console.log('Message : ', error.message);
        console.log('Stack : ', error.stack);
        res.redirect('/dashboard/unans');
    })
});


router.use(function (req, res, next) {
    next(createError(404));
});

router.use(function (err, req, res, next) {

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error_dashboard', {
        title: 'error'
    });
});

module.exports = router;
