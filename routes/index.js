var express = require('express');
var router = express.Router();
var passport = require("passport");
var postModel = require('./post');
var userModel = require('./users');
var localStrategy = require("passport-local");
var upload = require('./multer')

passport.use(new localStrategy(userModel.authenticate()));

function isLogedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.post('/update',upload.single('image'), async function(req, res) {
  const user = await userModel.findOneAndUpdate(
    {username : req.session.passport.user},
    {username : req.body.username, name : req.body.name, bio : req.body.bio},
    {new : true});

    if(req.file){
      user.profileImage = req.file.filename;
      }

    await user.save();
    res.redirect('/profile');
});

router.get('/login',function(req, res) {
  res.render('login', {footer: false});
});

router.get('/like/post/:id', isLogedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });

  // if already liked, remove like; if not liked, add like
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }

  await post.save();
  res.redirect("/feed");
});


router.get("/username/:username", isLogedIn, async function (req, res) {
  const regex = new RegExp(`^${req.params.username}`, 'i');
  const users = await userModel.find({ username: regex });
  res.json(users);
});


router.post("/upload",isLogedIn,upload.single('image'), async function(req,res){
  const user = await userModel.findOne({
    username: req.session.passport.user 
  })
  const  post = await postModel.create({
    picture : req.file.filename,
    user : user._id, 
    caption : req.body.caption
  })

  user.posts.push(post._id);
  await user.save();
  res.redirect("/feed");
})

router.get('/feed', isLogedIn,async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user })
  const posts = await postModel.find().populate("user");
  res.render('feed', {footer: true, posts, user});
});

router.get('/profile', isLogedIn,async function(req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user 
  }).populate("posts");
  res.render('profile', {footer: true, user});
});

router.get('/search', isLogedIn, function(req, res) {
  res.render('search', {footer: true});
});

router.get('/edit', isLogedIn,async function(req, res) {
  const user = await userModel.findOne({
    username: req.session.passport.user 
  })
  res.render('edit', {footer: true, user});
});

router.get('/upload', isLogedIn, function(req, res) {
  res.render('upload', {footer: true});
});

router.post('/logout', function(req, res) {
  try {
    req.logout();
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



router.post('/login', passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function(req, res) {});

router.post("/register", function(req, res) {
  let newuser = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email
  });


  userModel.register(newuser, req.body.password)
    .then(function() {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/profile");
      });
    });
});

module.exports = router;
