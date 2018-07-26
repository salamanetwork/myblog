const express = require('express');
const dn = require('date-time');
const path = require("path");
const bp = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const { check, validationResult } = require('express-validator/check');
const flash = require('express-flash-notification');
const session = require('express-session');

var db = require('knex')({
  client: 'mysql',
  version: '5.7',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'mysql',
    database: 'myblog'
  }
});

global.USER_ID = 0;
global.USER_LOGGED = false;
global.USER_FULL_NAME = "";

const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(bp.urlencoded({extended: true}));
app.use(bp.json());

app.use(session({
  name: 'myBlogNodeJS',
  secret: 'myBlogNodeJS',
  resave: false,
  saveUninitialized: true,
  cookie: {
    path: '/',
    httpOnly: true,
    secure: false,
    expires: new Date('Monday, 18 January 2028')
  },
}));

app.use(flash(app));

app.set("views", "./views");
app.set("view engine", "ejs");

// Flash message
app.get('/layout', (req, res) => res.render('layout', {title: "My Blog - Error layout Page"}));

// Home page
app.get("/", function(req, res) {

  db.from('posts').innerJoin('users', 'posts.user_id', 'users.user_id').orderBy('posts.post_id', 'desc').then(rows => {
    res.render("pages/index", {
      rows: rows,
      title: "My Blog - Home Page"
    })
  });
});

// About page
app.get("/about", function(req, res) {
  res.render("pages/about", {title: "My Blog - About Page"});
});

// Register page
app.get("/register", function(req, res) {

  if (USER_LOGGED === true && USER_ID !== 0) {
    res.redirect("/");
  } else {
    res.render("pages/register", {title: "My Blog - Register A New User Page"});
  }
});

app.post("/register", [
  check('username', "Username must be more the 5 and less than 30 characters").isLength({ min: 5, max: 30 }),
  check('password', "Password must be more the 5 and less than 30 characters").isLength({ min: 5, max: 30 }),
  check('email', "Email is not valid").isEmail()
], (req, res) => {
  const fullname = req.body.fullname;
  const username = req.body.username;
  const email =  req.body.email;
  const password = bcrypt.hashSync(req.body.password);
  const description = req.body.description;
  let joineddate = dn();

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    req.flash('Error', errors.array().map(xErr => "<br />" + xErr['msg'] + " ") , "/layout");
  } else {
    db('users').insert({user_name: username, user_password: password, user_email: email, user_full_name: fullname, user_joined_date: joineddate, user_description: description}).then(user => {
      if (user) {
        console.log("User Added");
        res.redirect("/login");
      } else {
        console.log("ERROR ADDING USER");
      }
    });
  }
});

// Profile Page
app.get("/profile/:id", function(req, res) {

  let uid = req.params.id;
  let countUserPosts = 0;

  db('users').where({user_id: uid}).select('*').then(rows => {
    db('posts').where({user_id: uid}).count("*").then( count => {
      countUserPosts = count[0]['count(*)'];
      res.render("pages/profile", {
        rows: rows,
        countOfPosts: countUserPosts,
        title: "My Blog - Edit A Post Page"
      });
    });
  });
});

// Login Page
app.get("/login", function(req, res) {
  res.render("pages/login", {title: "My Blog - Login Page"});
});

app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  db('users').where({user_name: username}).select('*').then(user => {
    if (user.length > 0) {
      if(bcrypt.compareSync(password, user[0].user_password)) {
        USER_LOGGED = true;
        USER_ID = user[0].user_id;
        USER_FULL_NAME = user[0].user_full_name;
        console.log("logged");
        res.redirect("/");
      }
    } else {
      console.log("error");
    }
  });

});

// Logou Page
app.get("/logout", function(req, res) {

  USER_LOGGED = false;
  USER_ID = 0;
  USER_FULL_NAME = "";

  res.redirect("/");

});

// Add Post page
app.get("/post/add", function(req, res) {

  if (USER_LOGGED === true && USER_ID !== 0) {
    res.render("pages/addpost", {title: "My Blog - Add A New Post Page"});
  } else {
    res.render("pages/login", {title: "My Blog - Login Page"});
  }
});

app.post("/post/add", (req, res) => {
  const posttitle = req.body.postTitle;
  const posttext = req.body.postText;
  let postdate = dn();

  db('posts').insert({post_title: posttitle, post_text: posttext, user_id: USER_ID, post_date: postdate}).then(post => {
    if (post) {
      console.log("Post Added");
      res.redirect("/");
    } else {
      console.log("ERROR ADDING POST");
    }
  });
});

// Edit Post Page
app.get("/post/edit/:id", function(req, res) {

  let pid = req.params.id;

  if (USER_LOGGED === true && USER_ID !== 0) {

    db('posts').where({post_id: pid}).select('*').then(rows => {
      res.render("pages/editpost", {
        rows: rows,
        title: "My Blog - Edit A Post Page"
      });
    });
  } else {
    res.render("pages/login", {title: "My Blog - Login Page"});
  }
});

app.post("/post/edit", (req, res) => {
  const postid = req.body.postID;
  const posttitle = req.body.postTitle;
  const posttext = req.body.postText;
  let postdate = dn();

  db('posts').where({post_id: postid}).update({post_title: posttitle, post_text: posttext, post_date: postdate}).then(post => {
    if (post) {
      console.log("Post Edited");
      res.redirect("/");
    } else {
      console.log("ERROR Editing POST");
    }
  });
});



app.listen(3000, console.log("SERVER RUNNING ON PORT: 3000 ON TIME: " + dn()));
