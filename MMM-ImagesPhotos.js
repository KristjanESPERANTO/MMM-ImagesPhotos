/* global Module */

/* Magic Mirror
 * Module: MMM-ImagesPhotos
 *
 * By Rodrigo Ramírez Norambuena https://rodrigoramirez.com
 * MIT Licensed.
 */

Module.register("MMM-ImagesPhotos",{
	defaults: {
		opacity: 0.9,
		animationSpeed: 500,
		updateInterval: 5000,
		getInterval: 60000,
		maxWidth: "100%",
		maxHeight: "100%",
		retryDelay: 2500,
		path: "",
		debug: false,
		fill: false,
	},

	wrapper: null,
	suspended: false,

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		this.photos = [];
		this.loaded = false;
		this.lastPhotoIndex = -1;
		this.sendSocketNotification("CONFIG", this.config);
	},
	getStyles: function() {
		return ["MMM-ImagesPhotos.css"];
	},

	/*
   * getPhotos
   * Requests new data from api url helper
   *
   */
	getPhotos: function() {
		var urlApHelper = "/MMM-ImagesPhotos/photos";
		var self = this;
		var retry = true;

		var photosRequest = new XMLHttpRequest();
		photosRequest.open("GET", urlApHelper, true);
		photosRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processPhotos(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);
					Log.error(self.name, this.status);
					retry = false;
				} else {
					Log.error(self.name, "Could not load photos.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		photosRequest.send();
	},
	notificationReceived(notification,payload,sender){
		// hook to turn off messages about notiofications, clock once a second
	},

	socketNotificationReceived(notification, payload, source){
		if(notification == "READY") {
			let self = this;
			// Schedule update timer.
			this.getPhotos();
			setInterval(function() {
				if(self.suspended==false){
					self.updateDom(self.config.animationSpeed);
				}
			}, this.config.updateInterval);
		}
	},
	/* scheduleUpdate()
   * Schedule next update.
   *
   * argument delay number - Milliseconds before next update.
   *  If empty, this.config.updateInterval is used.
   */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.getInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad ;
		var self = this;
		setTimeout(function() {
			self.getPhotos();
		}, nextLoad);
	},

	/* randomIndex(photos)
   * Generate a random index for a list of photos.
   *
   * argument photos Array<String> - Array with photos.
   *
   * return Number - Random index.
   */
	randomIndex: function(photos) {
		if (photos.length === 1) {
			return 0;
		}

		var generate = function() {
			return Math.floor(Math.random() * photos.length);
		};

		var photoIndex = generate();
		this.lastPhotoIndex = photoIndex;

		return photoIndex;
	},

	/* complimentArray()
   * Retrieve a random photos.
   *
   * return photo Object - A photo.
   */
	randomPhoto: function() {
		var photos = this.photos;
		var index = this.randomIndex(photos);

		return photos[index];
	},

	ScaleImage: function(srcwidth, srcheight, targetwidth, targetheight, fLetterBox) {

		var result = { width: 0, height: 0, fScaleToTargetWidth: true };

		if ((srcwidth <= 0) || (srcheight <= 0) || (targetwidth <= 0) || (targetheight <= 0)) {
			return result;
		}

		// scale to the target width
		var scaleX1 = targetwidth;
		var scaleY1 = (srcheight * targetwidth) / srcwidth;

		// scale to the target height
		var scaleX2 = (srcwidth * targetheight) / srcheight;
		var scaleY2 = targetheight;

		// now figure out which one we should use
		var fScaleOnWidth = (scaleX2 > targetwidth);
		if (fScaleOnWidth) {
			fScaleOnWidth = fLetterBox;
		}
		else {
			fScaleOnWidth = !fLetterBox;
		}

		if (fScaleOnWidth) {
			result.width = Math.floor(scaleX1);
			result.height = Math.floor(scaleY1);
			result.fScaleToTargetWidth = true;
		}
		else {
			result.width = Math.floor(scaleX2);
			result.height = Math.floor(scaleY2);
			result.fScaleToTargetWidth = false;
		}
		result.targetleft = Math.floor((targetwidth - result.width) / 2);
		result.targettop = Math.floor((targetheight - result.height) / 2);

		return result;
	},

	suspend: function(){
		this.suspended=true;
	},
	resume: function(){
		this.suspended=false;
	},

	getDom: function() {

		// if wrapper div not yet created
		if(this.wrapper ==null)
		// create it once, try to reduce image flash on change
		{this.wrapper = document.createElement("div");}
		if(this.photos.length) {

			// get the size of the margin, if any, we want to be full screen
			var m = window.getComputedStyle(document.body,null).getPropertyValue("margin-top");
			// set the style for the containing div

			
			if(this.config.position==="fullscreen")
			{this.wrapper.style.class=this.config.position+".above";}

			this.wrapper.style.border = "none";
			this.wrapper.style.margin = "0px";
			
			if(this.config.fill== true)
				this.wrapper.class+="bg_image";
			else 
				this.wrapper.style.backgroundColor = this.config.backgroundColor;

			var photoImage = this.randomPhoto();
			var img = null;
			if (photoImage) {

				// create img tag element
				img = document.createElement("img");

				// set default position, corrected in onload handler
				img.style.left = 0+"px";
				img.style.top = document.body.clientHeight+(parseInt(m)*2);
				img.style.position="relative";

				img.src = photoImage.url;
				// make invisible
				img.style.opacity = 0;
				// append this image to the div
				this.wrapper.appendChild(img);

				// set the onload event handler
				// the loadurl request will happen when the html is returned to MM and inserted into the dom.
				img.onload= function (evt) {

					// get the image of the event
					var img = evt.currentTarget;
					Log.log("image loaded="+img.src+" size="+img.width+":"+img.height);

					// what's the size of this image and it's parent
					var w = img.width;
					var h = img.height;
					var tw = document.body.clientWidth+(parseInt(this.m)*2);
					var th = document.body.clientHeight+(parseInt(this.m)*2);

					// compute the new size and offsets
					var result = this.self.ScaleImage(w, h, tw, th, true);

					// adjust the image size
					img.width = result.width;
					img.height = result.height;

					Log.log("image setting size to "+result.width+":"+result.height);
					Log.log("image setting top to "+result.targetleft+":"+result.targettop);

					// adjust the image position
					img.style.left = result.targetleft+"px";
					img.style.top = result.targettop+"px";
					//img.style.opacity =	this.self.config.opacity;
					//img.style.transition = "opacity 1.25s";

					// if another image was already displayed
					let c = this.self.wrapper.childElementCount;
					if( c>1)
					{
						for( let i =0 ; i<c-1;i++){
							// hide it
							this.self.wrapper.firstChild.style.opacity=0;
							// remove the image element from the div
							this.self.wrapper.removeChild(this.self.wrapper.firstChild);
						}
					}
					this.self.wrapper.firstChild.style.opacity = this.self.config.opacity;
					this.self.wrapper.firstChild.style.transition = "opacity 1.25s";
					if(this.self.config.fill== true)
						this.self.wrapper.style.backgroundImage = "url("+this.self.wrapper.firstChild.src+")"


				}.bind({self: this, m:m});
			}
		}
		return this.wrapper;
	},

	getScripts: function() {
		return ["MMM-ImagesPhotos.css"];
	},

	processPhotos: function(data) {
		var self = this;
		this.photos = data;
		if (this.loaded === false) { if(this.suspended==false) {self.updateDom(self.config.animationSpeed) ;} }
		this.loaded = true;
	},

/*getTemplate: function() {
	Log.log("in getTemplate");
	return "";
},
getTemplateData: function (){
	Log.log("in getTemplateData");
	return "";
} */
});
