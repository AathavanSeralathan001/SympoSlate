const express = require('express');
const path = require('path');
const app = express()
const passport = require('passport');
const LocalStrategy = require('passport-local')
const ejsMate = require("ejs-mate")
const mongoose = require("mongoose")
const Event = require("./model/event")
const methodOverride = require("method-override")
const { validateUser, validateEvent, isLoggedIn } = require('./middleware')
const ExpressError = require('./utils/ExpressError');
const catchAsync = require('./utils/catchAsync')
const flash = require('connect-flash');
const MongoStore = require('connect-mongo')
const db = 'mongodb://localhost:27017/SympoSlate'
const session = require('express-session')
const secret = 'nope'
const User = require('./model/user')
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connection open")
    }).catch(err => {
        console.log("OOPS !! ERROR")
    })


app.engine('ejs', ejsMate)
app.set("view engine", 'ejs')
app.use(flash());
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'))


const store = new MongoStore({
    mongoUrl: db,
    secret,
    ttl: 24 * 60 * 60
})
store.on('error', (e) => {
    console.log("Session store error")
})
const sessionConfig = {
    store,
    secret,
    name: 'SYMPOSLATE',
    resave: false,
  saveUnitialized: true,
    cookie: {
        httpOnly: true,
        // secure:true,
        expires: Date.now() + 1000 * 60 * 60 * 32 * 7,
        maxAge: 1000 * 60 * 60 * 32 * 7,
    }
}

const day = ["Jan", "Feb","Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep","Oct", "Nov", "Dec"]
app.use(session(sessionConfig))
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use((req, res, next) => {
    res.locals.currentUser = req.user
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

app.get('/', (req, res) => {
    res.redirect("/login")
})


//EVENTS

app.get('/events', async (req, res) => {
    const events = await Event.find({})
    if (events.length == 0) {
        return res.redirect("/events/no")
    }
    
    let upcoming = []
    let past = []
    let date = new Date()
    for (e of events) {
        if (e.eventDate >= date) {
            upcoming.push(e)
        } else {
            past.push(e)
        }
    }

    res.render('events.ejs', { past, upcoming, day,date })
})

app.get('/events/new', (req, res) => {
    res.render("addEvent.ejs")
})



app.post("/events", (req, res) => {
    const { name, description, eventDate, sTime, eTime, eventUrl } = req.body;
    let startTime = new Date()
    let endTime = new Date()
    let startHrs = sTime.slice(0, 2)
    let startMinutes = sTime.slice(3)
    let endHrs = eTime.slice(0, 2)
    let endMinutes = eTime.slice(3)

    startTime.setHours(startHrs, startMinutes)
    endTime.setHours(endHrs, endMinutes)
    const event = new Event({ name, description, eventDate, startTime, endTime, eventUrl })
    event.save()
    res.redirect("/events")
})



app.get('/events/no', (req, res) => {
    res.render("noevent.ejs")
})

app.get('/events/:id', async (req, res) => {
    const { id } = req.params
    const event = await Event.findById(id)
    let date = event.eventDate.toJSON().slice(0, 10)
    let sTime = event.startTime
    let eTime = event.endTime
    let startTime = `${sTime.getHours() <= 9 ? '0' : ''}${sTime.getHours()}:${sTime.getMinutes()}`
    let endTime = `${eTime.getHours() <= 9 ? '0' : ''}${eTime.getHours()}:${eTime.getMinutes()}`
    res.render("eventedit.ejs", { event, date, startTime, endTime })
})

app.put('/events/:id/edit', async (req, res) => {
    const { id } = req.params
    const { name, description, eventDate, sTime, eTime, eventUrl } = req.body;
    let startTime = new Date()
    let endTime = new Date()
    let startHrs = sTime.slice(0, 2)
    let startMinutes = sTime.slice(3)
    let endHrs = eTime.slice(0, 2)
    let endMinutes = eTime.slice(3)
    startTime.setHours(startHrs, startMinutes)
    endTime.setHours(endHrs, endMinutes)
    const event = await Event.findByIdAndUpdate(id, { name, description, eventDate, startTime, endTime, eventUrl })
    event.save()
    res.redirect('/events')

})

app.delete('/events/:id', async (req, res) => {
    const { id } = req.params
    const event = await Event.findByIdAndDelete(id)
    res.redirect('/events')
})


//CALENDAR

app.get('/calendar', isLoggedIn, async (req, res) => {
    const id = req.user._id
    const userEvents = await User.findById(id).populate('calendar')
    const events = await Event.find({})
    if (!events.length) return res.redirect('/calendar/events/no')
    register = []
    upcoming = []
    past = []
    let date = new Date()
    for (e of events) {
        if (e.eventDate.toISOString >= date.toISOString) {
            upcoming.push(e)
        } else {
            past.push(e)
        }
    }

    for(let e of userEvents.calendar){
        register.push(e._id)
    }
   
    res.render('calendar.ejs', { upcoming, past, day, register })
})

app.get('/calendar/events/no', (req, res) => {
    res.render("nouserevents.ejs")
})

app.get('/calender/:id', isLoggedIn, async (req, res) => {
    const userId = req.user._id
    const { id } = req.params
    const user = await User.findById(userId).populate('calendar')
    let register = []
    for (let e of user.calendar) {
        let date = e.eventDate
        let sTime = e.startTime
        let eTime = e.endTime
        let dict = { "date": date, "start": sTime, "end": eTime }
        register.push(dict)
    }

    const event = await Event.findById(id)
    if (register.length) {
        for (let r of register) {
            if (event.eventDate.toISOString == r["date"].toISOString)
                if (event.startTime.toISOString >= r["start"].toISOString && event.endTime.toISOString <= r["end"].toISOString) {
                   // req.flash('error', 'Already a event is there')
                } else {
                    user.calendar.push(event)
                }
        }
    } else {
        user.calendar.push(event)
    }
    user.save()
    res.redirect('/calendar')

})

app.get('/mycalendar', isLoggedIn, async (req, res) => {
    const id = req.user._id
    const event = await User.findById(id).populate('calendar')
    if (!event.calendar.length) {
        return res.redirect('calendar/no')
    }
    let date=new Date()
    upcoming=[]
    past=[]
    for (let e of event.calendar) {
        if (e.eventDate.toISOString >= date.toISOString ){
            upcoming.push(e)
        }else{
            past.push(e)
        }
    }
    res.render('mycalendar.ejs', { upcoming,past, day })
})

app.get('/calendar/no', (req, res) => {
    res.render("nocalendar.ejs")
})
app.get('/mycalendar/:id', isLoggedIn, async (req, res) => {
    const userId = req.user._id
    const { id } = req.params
    const user = await User.findById(userId).populate('calendar')
    user.calendar.remove(id)
    user.save()
    res.redirect("/mycalendar")
})







//USER 

app.get('/login', (req, res) => {
    res.render("login.ejs")
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    res.redirect('/events');
})
app.post('/register', async (req, res) => {
    try {
        const { name, username, register, email, password } = req.body;
        const user = new User({ name, username, register, email })
        const newUser = await User.register(user, password);
        req.login(newUser, err => {
            if (err) return next(err);
            return res.redirect('/events');
        })
    } catch (e) {
        console.log(e.message)
        res.redirect('/')
    }
})

app.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
})

app.listen(3000, (req, res) => {
    console.log("server is listening on port 3000")
})