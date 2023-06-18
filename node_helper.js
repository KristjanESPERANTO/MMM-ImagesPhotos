/* Magic Mirror
 * Node Helper: MMM-ImagesPhotos
 *
 * By Rodrigo Ramìrez Norambuena https://rodrigoramirez.com
 * MIT Licensed.
 */

const express = require("express");
const NodeHelper = require("node_helper");
const request = require("request");
const url = require("url");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");

module.exports = NodeHelper.create({
  // Override start method.
  start() {
    const self = this;
    console.log(`Starting node helper for: ${this.name}`);
  },

  setConfig() {
    this.path_images = path.resolve(
      `${global.root_path}/modules/MMM-ImagesPhotos/uploads${this.config.path}`
    );
    if (this.config.debug) {
      console.log(`path for : ${this.name}= ${this.path_images}`);
    }
  },

  // Override socketNotificationReceived method.
  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.setConfig();
      this.extraRoutes();
      this.sendSocketNotification("READY");
    }
  },

  // create routes for module manager.
  // recive request and send response
  extraRoutes() {
    const self = this;

    this.expressApp.get("/MMM-ImagesPhotos/photos", function (req, res) {
      self.getPhotosImages(req, res);
    });

    this.expressApp.use(
      "/MMM-ImagesPhotos/photo",
      express.static(self.path_images)
    );
  },

  // return photos-images by response in JSON format.
  getPhotosImages(req, res) {
    directoryImages = this.path_images;
    const imagesPhotos = this.getImages(this.getFiles(directoryImages)).map(
      function (img) {
        if (this.config.debug) {
          console.log(`have image=${img}`);
        }
        return { url: `/MMM-ImagesPhotos/photo/${img}` };
      }
    );
    res.send(imagesPhotos);
  },

  // return array with only images
  getImages(files) {
    const images = [];
    const enabledTypes = ["image/jpeg", "image/png", "image/gif"];
    for (idx in files) {
      type = mime.lookup(files[idx]);
      if (enabledTypes.indexOf(type) >= 0 && type !== false) {
        images.push(files[idx]);
      }
    }

    return images;
  },

  getFiles(path) {
    let files = [];
    try {
      files = fs.readdirSync(path).filter(function (file) {
        if (!fs.statSync(`${path}/${file}`).isDirectory()) {
          return file;
        }
      });
    } catch (exception) {
      console.log("getfiles unable to access source folder, will retry");
    }
    return files;
  }
});
