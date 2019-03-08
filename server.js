const bodyParser = require ("body-parser");
const fs = require ("fs");
const bcrypt = require ("bcrypt");
const express = require ("express");
const expressSession = require ("express-session");
const app = express();

const PORT = 5005;

class jsondb {
    constructor(file) {
        this.file = file;
        
        if (!fs.existsSync(this.file))
            fs.writeFileSync(this.file, JSON.stringify({users: []}));
    }   
        
    getUser(username) {
        let json = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        
        let found_user = undefined;
        json.users.some(function(user) {
            if (user.username === username)
                found_user = user;
            return found_user !== undefined;
        });
          
        return found_user;
    }

    addUser(user) {
        let json = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        json.users.push(user);
        JSON.stringify(json);
        fs.writeFileSync(this.file, JSON.stringify(json));
        
    }  

    getScores() {
        let json = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        let scores = [];
        json.users.forEach(function(user) {
            scores.push({username: user.username, score: user.score})
        });
        return scores;
    }

    setScore(username, score) {
        let json = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        let found_user = undefined;
        json.users.some(function(user) {
            if (user.username === username)
                found_user = user;
            return found_user !== undefined;
        });

        if (!found_user)
            return;

        found_user.score = score;
        fs.writeFileSync(this.file, JSON.stringify(json));
    }
} 

let db = new jsondb("db.json");

app.use(expressSession({
    name: "sid",
    resave: false,
    saveUninitialized: false,
    secret: "asecretword",
    rolling: true,
    cookie: {
        sameSite: true,
        secure: false,
    }
}));

app.use(bodyParser.urlencoded({extended: true }));

const loginRequired = (req, resp, next) => {
    if (!req.session.userId || !db.getUser(req.session.userId)) {
        resp.redirect("/");
    } else {
        next();
    }
}

app.get("/gamesettings.js", (req,resp) => {
    resp.sendFile(__dirname + "/gamesettings.js");
});

app.get("/", (req,resp) => {
    if (req.session.userId) {
        if (db.getUser(req.session.userId)) {
            resp.redirect("/home");
        } else {
            resp.redirect("/logout");
        }
        return;
    } 
    const data = {loginfailed, registered} = req.query;
    resp.render(__dirname + "/login.ejs", data);
});

app.get("/home", loginRequired, (req,resp,next) => {
    const data = { username: req.session.userId };
    resp.render(__dirname + "/home.ejs", data);
});

app.get("/leaderboard", (req,resp) => {
    const data = { scores: db.getScores() };
    resp.render(__dirname + "/scoreboard.ejs", data);
});

app.post("/score", loginRequired, (req, resp, next) => {
     if (!req.body.score)
        throw "ei helvetti score puuttuu";
    const user = db.getUser(req.session.userId);
    if (user.score < req.body.score)
        db.setScore(req.session.userId, req.body.score);
    resp.status(200).json('success');
});

app.post("/register", (req, resp) => {
    const {username, password} = req.body;
    if (db.getUser(username)) {
        resp.redirect("/?userexist=true");
        return;
    }
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) {
            throw err;
        }

        db.addUser({username: username, password: hash, score: 0})
        resp.redirect("/");
    });
});

app.post("/login", (req, resp) => {
    
    const { username, password } = req.body;
    const user = db.getUser(username);

    if (!user) {
        resp.redirect("/?loginfailed=true");
        return;
    }   

    bcrypt.compare(password, user.password, function(err, res) {
        if (!res) {
            resp.redirect("/?loginfailed=true");
            return;
        }
        req.session.userId = user.username;
        resp.redirect("/home");
    });
});

app.get("/logout", (req, resp) => {
    req.session.destroy(err => {
        if (err) return resp.redirect("/home");
        resp.clearCookie("sid");
        resp.redirect("/");
    });
})

app.listen(PORT, () => {
    console.log("Listening port " + PORT)
})