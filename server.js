const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
var bodyParser = require('body-parser')
const mySecret = process.env['uri']

require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

mongoose.connect(mySecret, {useNewUrlParser: true, useUnifiedTopology: true})

//Create user model
let exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
})

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSchema]
})

let User = mongoose.model('User', userSchema)
let Exercise = mongoose.model('Exercise', exerciseSchema)


//Create users
app.post('/api/users', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let newUser = new User({username: req.body.username})
  newUser.save((error, savedUser) => {
    if(!error) {
      res.json({username: savedUser.username, _id: savedUser.id})
    }
  })
})

//Get all users
app.get('/api/users', (req, res) => {
  User.find({}, (error, arrayOfUsers) => {
    if(!error) {
      res.json(arrayOfUsers)
    }
  })
})

//post description, duration to user || add exercise session
app.post('/api/users/:_id/exercises', bodyParser.urlencoded({ extended: false }), (req, res) => {

  console.log(req.body)


  let newExerciseItem = new Exercise({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })

  if(newExerciseItem.date === ''){
    newExerciseItem.date = new Date().toISOString().substring(0, 10)
  }

  User.findByIdAndUpdate(
    req.params._id,
    {$push: {log: newExerciseItem}},
    {new: true},
    (error, updatedUser) => {
      if(!error){
        let resObj = {}
        resObj['_id'] = updatedUser._id
        resObj['username'] = updatedUser.username
        resObj['description'] = newExerciseItem.description
        resObj['duration'] = newExerciseItem.duration
        resObj['date'] = new Date(newExerciseItem.date).toDateString()
        
        res.json(resObj)
      }
    }
  )
})

//make a Get request to /api/users/:_id/logs
app.get('/api/users/:_id/logs', (req, res) => {
  User.findById(req.params._id, (error, result) => {
    if(!error){
      let resObj = result

      if(req.query.from || req.query.to) {
        let fromDate = new Date(0)
        let toDate = new Date()

        if(req.query.from){
          fromDate = new Date(req.query.from)
        }
        if(req.query.to){
          toDate = new Date(req.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        resObj.log = resObj.log.filter((session) => {
          let sessionDate = new Date(session.date).getTime()

          return sessionDate >= fromDate && sessionDate <= toDate
        })
      }

      if(req.query.limit){
        resObj.log = resObj.log.slice(0, req.query.limit)
      }

      resObj = resObj.toJSON()
      resObj['count'] = result.log.length
      res.json(resObj)
    }
  })
})
