const createError = require("http-errors");
const express = require("express");
const furmlyEngine = require("../lib/setup_furmly_engine");

function setup(_root) {
  if (process.env.NODE_ENV !== "production") {
    const tern = express.Router();
    tern.post("/:context", (req, res) => {
      furmlyEngine.addDocToTern(
        req.params.context || "processor",
        req.body._id,
        req.body.text
      );
      res.send();
    });
    tern.delete("/:context", (req, res) => {
      furmlyEngine.delDocFromTern(
        req.params.context || "processor",
        req.body._id
      );
      res.send();
    });
    tern.post("/request/:context", (req, res, next) => {
      furmlyEngine.requestForTern(
        req.params.context || "processor",
        req.body,
        (er, response) => {
          if (er)
            return next(
              createError(
                500,
                "An error occurred while fetching the processor",
                er
              )
            );
          res.send(response);
        }
      );
    });
    _root.use("/api/tern", [tern]);
  }
}

module.exports = setup;
