const debug = require("debug")("furmly-server:upload-route");
const express = require("express");
const multer = require("multer");
const createError = require("http-errors");
const verify = require("./middlewares/verify");
const utils = require("./utils");
const fileParser = require("../lib/services/parser");
const fileUpload = require("../lib/uploader");
const config = require("../config");

function setup(app) {
  const uploadRouter = express.Router();
  // const config = options.config;
  const VerificationOverride = utils.VerificationOverride;
  const upload = multer({
    dest: config.get("fileUpload.tempDir") || "/temp"
  });
  uploadRouter.post("/", [
    upload.single("file"),
    function(req, res, next) {
      debug("new file uploaded...");
      fileUpload.upload(req.user, req.file, req.body, function(er, result) {
        if (er)
          return (
            debug("an error occurred during upload"), next(createError(400, er))
          );
        debug("upload successful");
        res.send(result);
      });
    }
  ]);

  uploadRouter.get("/preview/:id", function(req, res, next) {
    fileUpload.readFile(req.params.id, req.user, function(
      er,
      data,
      description
    ) {
      if (er)
        return (
          debug(`an error occurred while trying to preview ${req.params.id}`),
          next(createError(400, er))
        );

      fileParser.parse(description, data, res, req);
    });
  });
  app.use("/api/upload", [
    //check if user is logged in. If he's not still let him pass.
    verify.bind(new VerificationOverride((req, res, next) => next())),
    uploadRouter
  ]);
}
module.exports = setup;
