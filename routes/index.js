const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = require('./docs/swagger.json');

router.use('/', swaggerUI.serve)

/* GET home page. */
router.get('/', swaggerUI.setup(swaggerDocument));

router.get("/rankings?", function (req, res, next) {

  const { year, country, ...remaining } = req.query

  if (Object.keys(remaining).length > 0) {
    res.status(400).json({ "error": true, "message": "Invalid query parameters. Only year and country are permitted." })
  }

  if (req.query.year && req.query.country) {
    if (req.query.year.match(/^\d{4}$/)) {
      if (req.query.country.match(/^[A-Za-z]+$/)) {
        req.db.from('rankings').select("rank", "country", "score", "year").where("year", "=", req.query.year).andWhere("country", "=", req.query.country).orderBy("year", 'desc')
          .then((rows) => {
            res.status(200).json(rows)
          })
          .catch((err) => {
            res.status(400).json({ "error": true, "message": "Invalid query parameters. Only year and country are permitted." })
          })
      } else {
        res.status(400).json({ "error": true, "message": 'Invalid country format. Country query parameter cannot contain numbers.' })
      }
    } else {
      res.status(400).json({ "error": true, "message": 'Invalid year format. Format must be yyyy' })
    }
  }
  else if (req.query.year) {
    if (req.query.year.match(/^\d{4}$/)) {
      req.db.from('rankings').select("rank", "country", "score", "year").where("year", "=", req.query.year).orderBy("year", 'desc')
        .then((rows) => {
          res.status(200).json(rows)
        })
        .catch((err) => {
          res.status(400).json({ "error": true, "message": "Invalid year format. Format must be yyyy" })
        })
    } else (
      res.status(400).json({ "error": true, "message": "Invalid query parameters. Only year and country are permitted." })
    )

  }
  else if (req.query.country) {
    if (req.query.country.match(/^[A-Za-z]+$/)) {
      req.db.from('rankings').select("rank", "country", "score", "year").where("country", "=", req.query.country).orderBy("year", 'desc')
        .then((rows) => {
          res.status(200).json(rows)
        })
        .catch((err) => {
          res.status(400).json({ "error": true, "message": "Invalid country format. Country query parameter cannot contain numbers." })
        })
    } else {
      res.status(400).json({ "error": true, "message": 'Invalid country format. Country query cannot contain numbers' })

    }
  }
  else {
    req.db.from('rankings').select("rank", "country", "score", "year").orderBy("year", 'desc')
      .then((rows) => {
        res.status(200).json(rows)
      })
      .catch((err) => {
        res.status(400).json({ "error": true, "message": "Invalid country format. Country query parameter cannot contain numbers." })
      })
  }
});

router.get("/countries", function (req, res, next) {
  req.db.from('rankings').select("country").groupBy("country").orderBy("country")
    .then((rows) => {
      let array = rows.map(element => {
        return element.country
      })
      res.status(200).json(array)
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({ "error": true, "message": "Invalid query parameters. Query parameters are not permitted." })
    })
});

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

    if (decoded.exp < Date.now()) {
      res.status(401).json({ "error": true, "message": "JWT token has expired" })
      return
    }

    // Permit user to advance to route
    next()
  } catch (error) {
    res.status(401).json({ "error": true, "message": "Invalid JWT token" })
  }

}

router.get("/factors/:year?", authorize, function (req, res, next) {

  const { year, limit, country, ...remaining } = req.query

  if (Object.keys(remaining).length > 0) {
    res.status(400).json({ "error": true, "message": "Invalid query parameters. Only year and country are permitted." })
  }

  if (req.params.year && req.query.country) {
    if (req.params.year.match(/^\d{4}$/)) {
      if (req.query.country.match(/^[A-Za-z]+$/)) {
        req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where("year", "=", req.params.year).andWhere("country", "=", req.query.country)
          .then((rows) => {
            res.status(200).json(rows)
          })
          .catch((err) => {
            res.json({ "error": true, "message": "Error in MySQL query" })
          })
      } else {
        res.status(400).json({ "error": true, "message": "Invalid country format. Country query parameter cannot contain numbers." })
      }
    } else {
      res.status(400).json({ "error": true, "message": "Invalid year format. Format must be yyyy." })
    }
  } else if (req.params.year && req.query.limit) {
    if (req.params.year.match(/^\d{4}$/)) {
      if (req.query.limit.match(/^\d*[1-9]\d*$/)) {
        req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where("year", "=", req.params.year).limit(req.query.limit)
          .then((rows) => {
            res.status(200).json(rows)
          })
          .catch((err) => {
            res.status(400).json({ "error": true, "message": "Invalid limit query. must be a positive number." })
          })
      } else {
        res.status(400).json({ "error": true, "message": "Invalid limit query. Limit must be a positive number." })
      }
    } else {
      res.status(400).json({ "error": true, "message": "Invalid year format. Format must be yyyy." })
    }
  } else {
    if (req.params.year.match(/^\d{4}$/)) {
      req.db.from('rankings').select("rank", "country", "score", "economy", "family", "health", "freedom", "generosity", "trust").where("year", "=", req.params.year)
        .then((rows) => {
          res.status(200).json(rows)
        })
        .catch((err) => {
          res.status(400).json({ "error": true, "message": "Invalid year format. Format must be yyyy." })
        })
    } else {
      res.status(400).json({ "error": true, "message": "Invalid year format. Format must be yyyy." })
    }
  }
});

module.exports = router;
