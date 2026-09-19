const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const {corsOrigin} = require("./config/env");
const {notFound, errorHandler} = require("./middleware/error.middleware");

const app = express();
const allowedOrigins =
  corsOrigin === "*"
    ? "*"
    : corsOrigin.split(",").map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins === "*" ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
