const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

const mysql = require('mysql');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'anil',
    password: 'anil',
    database: 'users_website',
    connectionLimit: 10,
    port: '3306'
});

const database = require('./databaseq')

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async(email, password, done) => {
        const userQuery = "select * from users where uname ='" + email + "'";


        //manually quering the database without the function
        pool.getConnection((err, connection) => {
            // if (err) throw err;
            // console.log("Database connected from login as id: ", connection.threadId);
            connection.query(userQuery, (err, rows) => {
                // if (err) throw err;
                connection.release;
                // console.log("Rows :", rows[0]);
                if (rows) {

                    const string = JSON.stringify(rows);
                    // console.log("String =>" + string);

                    const user = JSON.parse(string);

                    // console.log("User data: " + user[0].id);

                    if (user == null) {
                        return done(null, false, { message: 'No user with that email' })
                    }

                    try {
                        if (password) { //change later
                            return done(null, user[0])
                        } else {
                            return done(null, false, { message: 'Password incorrect' })
                        }
                    } catch (e) {
                        return done(e)
                    } //end of try-catch


                } //end of if(rows)
            });
        });


        // console.log("User id" + user[0].id);
        // console.log("password" + password)
        // console.log("Password required : " + user[0].password);


    }

    passport.use(new LocalStrategy({ usernameField: 'uname', passwordField: 'password' }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id))
    passport.deserializeUser((id, done) => {
        const idQuery = "select * from users where id ='" + id + "'";
        // console.log("ID query:" + database(idQuery)[0]);
        pool.getConnection((err, connection) => {
                // if (err) throw err;
                // console.log("Database connected from login as id: ", connection.threadId);
                connection.query(idQuery, (err, rows) => {
                    // if (err) throw err;
                    connection.release;
                    // console.log("Rows :", rows[0]);
                    if (rows) {
                        const string = JSON.stringify(rows);
                        // console.log("String =>" + string);
                        const last = JSON.parse(string);


                        //the done function
                        return done(null, last[0]);


                    }
                });
            })
            // console.log("Deserialiszed User:" + idlast);
    })
}

module.exports = initialize