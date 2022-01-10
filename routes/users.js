var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require("jsonwebtoken");

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});


router.post("/register", function (req, res, next) {
  // 1. Retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)


  // verify body
  if (!email || !password) {
    res.status(400).json({
      "error": true,
      "message": "Request body incomplete, both email and password are required"
    })
    return;
  }

  // 2. Determine if user already exists in table
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        res.status(409).json({
          "error": true,
          "message": "User already exists"
        });
        return
      }

      // 2.1 if user does not exist, insert into table 
      const saltRounds = 10
      const hash = bcrypt.hashSync(password, saltRounds)
      req.db.from("users").insert({ email, hash })
        .then(() => {
          res.status(201).json({ "message": "User created" })
        })
        .catch((error) => {
          res.status(401).json({
            "error": true,
            "message": "User already exists"
          });
        })
    })
})

router.post("/login", function (req, res, next) {
  // 1. Retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password

  // Verify body
  if (!email || !password) {
    res.status(400).json({
      "error": true,
      "message": "Request body incomplete, both email and password are required"
    })
    return
  }

  // 2. Determine if user already exists in table 
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        res.status(401).json({ "error": true, "message": "Incorrect email or password" })
        return;
      }
      // 2.1 If user does exist, verify i passwords match
      // Compare password hashes
      const user = users[0]
      return bcrypt.compare(password, user.hash)
    })
    // 2.1.2 if passwords do not match, return error response
    .then((match) => {
      if (!match) {
        res.status(401).json({ "error": true, "message": "Incorrect email or password" })
        return
      }
      // Create and return JWT token
      const secretKey = "secretKey"
      const expires_in = 60 * 60 * 24 // 1 day
      const exp = Date.now() + expires_in * 1000
      const token = jwt.sign({ email, exp }, secretKey)
      res.status(200).json({ token, "token_type": "Bearer", expires_in })
    })
})

const authorize = (req, res, next) => {
  const authorization = req.headers.authorization
  let token = null;
  const secretKey = "secretKey";

  // Retrieve token 
  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
  } else {
    res.status(401).json({ "error": true, "message": "Authorization header ('Bearer token') not found" })
    return
  }


  // Verify JWT and check expiration date
  try {
    const decoded = jwt.verify(token, secretKey)

    if (decoded.email != req.params.email) {
      res.status(403).json({ "error": true, "message": "Forbidden" })
    }

    if (decoded.exp < Date.now()) {
      res.status(401).json({ "error": true, "message": "JWT token has expired" })
      return
    }

    // Permit user to advance to route
    next()
  } catch (error) {
    console.log(error)
    res.status(401).json({ "error": true, "message": "Invalid JWT token" })
  }
}

router.get("/:email/profile", function (req, res, next) {
  const email = req.params.email
  const queryUsers = req.db.from('users').select("email", "firstName", "lastName").where("email", "=", email)
  const authorization = req.headers.authorization

  if (authorization) {
    req.db.from('users').select("email", "firstName", "lastName", "dob", "address").where("email", "=", email)
      .then((users) => {
        if (users.length === 0) {
          res.status(401).json({ "errror": true, "message": "Users do not exist" })
          return;
        }
        res.status(200).json(users)
      })
      .catch((err) => {
        res.json({ "error": true, "message": err })
      })
  } else {
    queryUsers
      .then((users) => {
        if (users.length === 0) {
          res.status(401).json({ "errror": true, "message": "Users do not exist" })
          return;
        }
        res.status(200).json(users)
      }).catch((e) => {
        res.json({ "error": true, "message": err })
      })
  }
})




router.put("/:email/profile", authorize, function (req, res, next) {
  // 1. Retrieve email and user info
  const email = req.params.email
  const firstName = req.body.firstName
  const lastName = req.body.lastName
  const dob = req.body.dob
  const address = req.body.address
  const queryUsers = req.db.from("users").select("email", "firstName", "lastName", "dob", "address").update({ firstName, lastName, dob, address }).where("email", "=", email)
  var dateformat = /^\d{4}-\d{2}-\d{2}$/;
  var letters = /^[A-Za-z]+$/;
  var addressform = /^[0-9a-zA-Z\s,]*$/;
  var now = new Date().toISOString().split('T')[0];

  // verify body
  if (!email || !firstName || !lastName || !dob || !address) {
    res.status(400).json({
      "error": true,
      "message": "Request body incomplete: firstName, lastName, dob and address are required."
    })
    return;
  }

  if (!(dob < now)) {
    res.status(400).json({ "error": true, "message": "Invalid input: dob must be a date in the past." })
    return;
  }

  if (!dob.match(dateformat)) {
    res.status(400).json({ "error": true, "message": "Invalid input: dob must be a real date in format YYYY-MM-DD." })
    return;
  }

  if (!firstName.match(letters) || !lastName.match(letters)) {
    if (!address.match(addressform)) {
      res.status(400).json({ "error": true, "message": "Request body invalid, firstName, lastName and address must be strings only." })
      return;
    }
    res.status(400).json({ "error": true, "message": "Request body invalid, firstName, lastName and address must be strings only." })
    return;
  }

  queryUsers
    .then((users) => {
      req.db.from("users").select("firstName", "lastName", "dob", "address").where("email", "=", email)
        .then((users) => {
          if (users.length === 0) {
            res.status(401).json({ "error": true, "message": "User does not exist" })
            return;
          }
          res.status(200).json(users)

        }).catch((error) => {
          res.status(400).json({
            "error": true,
            "message": error
          })
        })
    })
})

module.exports = router;
