const createError = require("http-errors");
const furmlyEngine = require("../lib/setup_fumly_engine");

function setup(_root) {
  if (process.env.NODE_ENV !== "production") {
    _root.post("/api/tern/:context", (req, res) => {
      furmlyEngine.addDoc(
        req.params.context || "processor",
        req.body._id,
        req.body.text
      );
      res.send();
    });
    _root.delete("/api/tern/:context", (req, res) => {
      furmlyEngine.delDoc(req.params.context || "processor", req.body._id);
      res.send();
    });
    _root.post("/api/tern/request/:context", (req, res, next) => {
      furmlyEngine.request(
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
  }
}

module.exports = setup;
