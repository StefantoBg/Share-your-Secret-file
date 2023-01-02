//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const app = express();
var session = require('express-session');
var passport = require('passport');
var findOrCreate = require('mongoose-findorcreate');
const passportlocalMongoose = require("passport-local-mongoose");
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
mongoose.set('strictQuery', true);
const GoogleStrategy = require('passport-google-oauth20').Strategy;

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

var userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportlocalMongoose);
userSchema.plugin(findOrCreate);

var User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
app.get("/", function(req,res){
  res.render("home");
});
app.get("/auth/google",
  passport.authenticate("google",{scope: ["profile"]} )
);
app.get("/auth/google/secrets",
  passport.authenticate("google",{failureRedirect: "/login"}),
  function(req,res){
    res.redirect("/secrets");
  }
);
app.get("/login", function(req,res){
    res.render("login");
  });
app.get("/register", function(req,res){
    
  res.render("register");
}); 
app.get("/secrets", function(req,res){
   User.find({"secret": {$ne:null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", {userWithSecrets: foundUsers});
      }
    }
   });
}); 
app.get("/submit", function(req,res){
  if (req.isAuthenticated()){
 res.render("submit");
  } else {
    res.redirect("/login");
  }
}); 

app.post("/submit", function(req, res){
  const submittedSecret= req.body.secret;
   console.log(submittedSecret);
  User.findById(req.user, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  })
  
}); 

app.get("/logout", function(req,res){
  req.logout(function(err){
    if (err){
      console.log(err);
    }
  });
  res.redirect("/");
});

app.post("/register", function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req,res, function(){
        res.redirect("secrets");
        console.log("Just register new account")
      });
    }
  }); 
}); 

app.post("/login", function(req,res){
  
  const user = new User({
    username: req.body.username,
    passport: req.body.password
  });
  
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("google")(req,res, function(){
        res.redirect("secrets");
      });
    }
  });
}); 

app.listen(3000,function(err){
    console.log("server start on 3000")
});