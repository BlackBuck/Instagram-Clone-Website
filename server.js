if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const database = require('./databaseq');
const path = require('path');

const mysql = require('mysql');
const pool = mysql.createPool({
    host: 'localhost',
    user: [USERNAME],
    password: [PASS],
    database: [DATABASE],
    connectionLimit: 10,
    port: '3306'
});

const multer = require('multer');
const url = require('url');
const methodOverride = require('method-override')
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

//setting up multer
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'views/images/posts');
    },
    filename: (req, file, callback) => {
        // console.log(file);
        callback(null, Date.now() + path.extname(file.originalname));
    }
});

// const multerfileFilter = (req, file, callback) => {
//     if (file.mimetype == 'image/png' || file.mimetype == 'image/gif' || file.mimetype == 'image/jpeg') {
//         callback(null, true);
//     } else {
//         callback(null, false);
//     }
// }

var upload = multer({ storage: storage });


app.use(express.static("./views"));


const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', req.user)
})

app.get('/account', checkAuthenticated, (req, res) => {
    const postsQuery = "select * from posts where posted_by='" + req.user.uname + "'";

    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from accounts as id: ", connection.threadId);
        connection.query(postsQuery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                const string = JSON.stringify(rows);
                const last = JSON.parse(string);

                req.user["posts"] = last;
                // console.log(res);
                const dat = {
                    name: req.user.name,
                    uname: req.user.uname,
                    posts: string,
                    description: req.user.description
                }
                res.render('account.ejs', dat);
            }
        });
    });
});

app.get("/accounts/:id", checkAuthenticated, (req, res) => {
    const username = url.parse(req.url).pathname.replace('/accounts/', "");
    var userquery = "select * from users where uname='" + username + "'";
    var user = {};
    pool.getConnection((err, connection) => {
        if (err) return;
        console.log("Database connected from Accounts as id: " + connection.threadId);
        pool.query(userquery, (err, result) => {
            console.log("query: " + userquery);
            if (err) return;
            connection.release;
            const string = JSON.stringify(result);
            const parsed = JSON.parse(string);
            console.log(parsed);
            if (parsed[0]) {
                user.name = parsed[0].name;
                user.uname = parsed[0].uname;
                user.description = parsed[0].description;
            }
            getPosts(req, user, res);
        })
    });
})

app.post('/follow', checkAuthenticated, (req, res) => {
    console.log("In follow");
    var followerquery = "select following from users where uname='" + req.user.uname + "'";
    var followingquery = "select followers from users where uname='" + req.body.uname + "'";

    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(followerquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                if (!last[0].following.includes(req.body.uname))
                    last[0].following = last[0].following.concat(req.body.uname).concat(";")
                var qry = "update users set following='" + last[0].following + "' where uname='" + req.user.uname + "'";
                database(qry);
            }
        });
    });
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(followingquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                console.log(last[0])
                if (!last[0].followers.includes(req.user.uname))
                    last[0].followers = last[0].followers.concat(req.user.uname).concat(";")
                var qry = "update users set followers='" + last[0].followers + "' where uname='" + req.body.uname + "'";
                database(qry);
            }
        });
    });
    var red = "/accounts/" + req.body.uname;
    res.redirect("/")
})


app.post('/unfollow', checkAuthenticated, (req, res) => {
    console.log("In unfollow");
    var followerquery = "select following from users where uname='" + req.user.uname + "'";
    var followingquery = "select followers from users where uname='" + req.body.uname + "'";

    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(followerquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                if (last[0].following.includes(req.body.uname))
                    last[0].following = last[0].following.replace(req.body.uname + ";", "");
                console.log("In unfollow last following = " + last[0].following);
                var qry = "update users set following='" + last[0].following + "' where uname='" + req.user.uname + "'";
                database(qry);
            }
        });
    });
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(followingquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                // console.log(last[0])
                if (last[0].followers.includes(req.user.uname))
                    last[0].followers = last[0].followers.replace(req.user.uname + ";", "");
                console.log("in unfollow last = " + last[0].followers);
                var qry = "update users set followers='" + last[0].followers + "' where uname='" + req.body.uname + "'";
                database(qry);
            }
        });
    });
    // var red = "/accounts/" + req.body.uname;
    res.redirect("/");
})


var getPosts = (req, usr, res) => {
    let user = usr;
    var followquery = "select followers from users where uname='" + user.uname + "'";

    pool.getConnection((err, connection) => {
        if (err) return;
        console.log("Database connected from getFollowers as id: ", connection.threadId);
        connection.query(followquery, (err, result) => {
            if (err) throw err;
            var str = JSON.stringify(result);
            // console.log("str :" + str);
            var last = JSON.parse(str);
            if (last[0].followers.includes(req.user.uname))
                user["follows"] = true;
            else
                user["follows"] = false;

            connection.release;
        })
    });


    var postquery = "select * from posts where posted_by='" + usr.uname + "'";
    pool.getConnection((err, connection) => {
        if (err) return;
        console.log("Database connected from getPosts as id: ", connection.threadId);
        pool.query(postquery, (err, result) => {
            var str = JSON.stringify(result);
            user.posts = str;
            console.log(user);
            connection.release;
            res.render('useraccount.ejs', user);
        })
    });
}

app.post('/upload', upload.single('image'), (req, res, next) => {
    console.log(req.file);
    var urlString = "./images/posts/" + req.file.filename;
    var uploadquery = "insert into posts values('" + Date.now() + "','" + req.user.uname + "','" + urlString + "'," + 0 + ",'0')";
    database(uploadquery);
    res.redirect('/account');
});


app.get('/search', checkAuthenticated, (req, res) => {
    const user = req.query.user;
    let searchquery = ""
    if (user === "")
        return;
    else
        searchquery = "select * from users where uname like '%" + user + "%'";
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(searchquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                const string = JSON.stringify(rows);
                const last = JSON.parse(string);

                res.send({ users: last });
            }
        });
    });

})


app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.get('/messages', checkAuthenticated, (req, res) => {
    const msgquery = "select * from messages where sender='" + req.user.uname + "' or receiver='" + req.user.uname + "' order by id desc";

    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(msgquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                const string = JSON.stringify(rows);
                const last = JSON.parse(string);

                const retresult = {
                    name: JSON.stringify(req.user.name),
                    uname: JSON.stringify(req.user.uname),
                    followers: JSON.stringify(req.user.followers),
                    following: JSON.stringify(req.user.following),
                    messages: string
                };
                res.render('messages.ejs', retresult);
            }
        });
    });

});

app.post('/sendmsg', (req, res) => {
    const sendmsg = "insert into messages values('" + req.body.sender + "','" + req.body.receiver + "','" + req.body.message + "','" + Date.now().toString() + "')";
    database(sendmsg);
    const msgquery = "select * from messages where sender='" + req.body.sender + "' or receiver='" + req.body.sender + "' order by id desc"
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(msgquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                var ret = {
                    uname: JSON.stringify(req.body.sender),
                    following: JSON.stringify(req.user.following),
                    followers: JSON.stringify(req.user.followers),
                    messages: string
                };
                res.redirect('/messages');
            }
        });
    });
})

app.post('/deleteconv', (req, res) => {
    const deletemsg = "delete from messages where sender='" + req.body.sender + "' or receiver='" + req.body.sender + "'";
    database(deletemsg);
    const msgquery = "select * from messages where sender='" + req.body.sender + "' or receiver='" + req.body.sender + "' order by id desc"
    pool.getConnection((err, connection) => {
        if (err) throw err;
        console.log("Database connected from login as id: ", connection.threadId);
        connection.query(msgquery, (err, rows) => {
            if (err) throw err;
            connection.release;
            if (rows) {
                var string = JSON.stringify(rows);
                var last = JSON.parse(string);

                var retdel = {
                    uname: JSON.stringify(req.body.sender),
                    messages: string
                };
                res.render('messages.ejs', retdel);
            }
        });
    });
})


app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async(req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        })
        const query = "insert into users values('" + Date.now().toString() + "','" + req.body.name + "','" + req.body.uname + "','" + req.body.email + "','" + hashedPassword + "','Description')"; //change later to use hashedPassword
        database(query);
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
})

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

app.listen(3000)
