const keys = require('./keys');


// Express APP Setup

const express = require("express");

const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());


// POSTGRE client setup

const { Pool } = require("pg");

const pgClient = new Pool({
    host: keys.pgHost,
    database: keys.pgDatabase,
    port: keys.pgPort,
    user: keys.pgUser,
    password: keys.pgPassword
});

pgClient.on("error", () => console.log("Lost connection to Postgre"));


pgClient
    .query("Create table if not exists values(number int)")
    .catch((err) => console.log("error while creating ", err));

// Redis client Setup

const redis = require('redis');


const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();


// Express route handlers

app.get("/", (req, res) => {
    res.send("Hi there");
});

app.get("/values/all", async (req, res) => {
    const values = await pgClient.query("select * from values");
    res.send(values.rows);
});


app.get("/values/current", async (req, res) => {

    redisClient.hgetall("values", (err, values) => {
        res.send(values);
    });
});


app.post("/values", async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.sendStatus(422).send("Index value is too high");
    }

    redisClient.hset("values", index, "Nothing yet!");
    redisPublisher.publish('insert', index);

    pgClient.query("insert into values(number) values($1)", [index]);

    res.send({
        working: true
    });

});

app.listen(5000, err => {
    console.log("Now app is running ");
});


