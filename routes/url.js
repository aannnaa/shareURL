var express = require('express')
var router = express.Router()
var url = require('url')
var cheerio = require('cheerio')
var request = require('request')

var MetadataModel = require('../models/metadata')
var Promise = require('bluebird')

router.get('/', function (req, res, next) {
  var purl = url.parse(req.url, true)
  var qurl = purl.query.q;
  if (!qurl) {
    return res.json({status: 'error', message: 'q is empty.'})
  }
  var renderObj = {}
  renderObj.url = qurl;
  renderObj.domain = url.parse(qurl, true).hostname;

  findOneAsync({ url: qurl }).then( urlData => {
    if(urlData)
      return res.json({status: 'ok', meta: urlData })

    return getHTML(qurl).then( chtml => {
      return getMetaData(chtml).then( meta => {
        renderObj.meta = meta
        return saveDB(renderObj).then( data => {
          return res.json({status: 'ok', meta: data })
        })
      })
    })
  }).catch(err => {
    next(err)
  })
})

var getHTML = function(qurl){
  return new Promise((resolve, reject) => {
    request({
        method: 'GET',
        url: qurl
    }, function(err, response, body) {
        if (err) return reject(err)
        return resolve(cheerio.load(response.body))
    })
  })
}

var getSocialData = function(chtml, neededMetaTags){
  return new Promise((resolve, reject) => {
    var metaTags = chtml('meta')

    if (Object.keys(metaTags).length === 0) {
      return reject('No general metadata found in page');
    }
    var element
    var namespace = ['og','fb', 'twitter'];
    var meta = {};
    var subElements = {
      'image' : ['width', 'height'],
    }

    metaTags.each(function() {
      element = chtml(this);
      propertyValue = element.attr('property');

      if (!propertyValue){
        return;
      }

      propertyValue = propertyValue.toLowerCase().split(':');
      if (namespace.indexOf(propertyValue[0]) < 0){
        return;
      }

      var content = element.attr('content');
      if (propertyValue.length === 2) {
  		  property = propertyValue[1];
        var indexOfMeta = neededMetaTags.indexOf(property)
        if(indexOfMeta == -1){
	        return;
        }
        neededMetaTags.splice(indexOfMeta, 1)
        meta[property] = content;
        if(property in subElements){
          subElements[property].forEach(function(val){
            meta[val] = chtml('img[src^="'+content+'"]').attr(val) || 0
        	});
          meta['aspect_ratio'] = meta['width'] / meta['height'] || 1
        }

	    } else {
        return;
      }
    })

    return resolve(meta)
  })
}

var getGenMetaData = function(chtml, neededMetaTags, _meta){
  return new Promise((resolve, reject) => {
    var subElements = {
      'image' : ['width', 'height'],
    }

  	var possibleMetas = {
      title: chtml('title').first().text(),
  		description: chtml('meta[name=description i]').attr('content'),
  		image: chtml('img[src$=".png"],img[src$=".jpg"],img[src$=".gif"]').attr('src'),
  	};

  	var meta = {};
  	var value;
  	Object.keys(possibleMetas).forEach(function(key){
      if(neededMetaTags.indexOf(key) != -1){
        value = possibleMetas[key];
        if (value){
          _meta[key] = value;
          if(value in subElements){
            subElements[value].forEach(function(val){
              _meta[val] = chtml('img[src^="'+value+'"]').attr(val) || 0
          	});
            _meta['aspect_ratio'] = _meta['width'] / _meta['height'] || 1
          }
        }
      }
  	});

  	return resolve(_meta);
  })
}

var getMetaData = function(chtml){
  var neededMetaTags = [
      'title',
      'description',
      'image',
      'type'
  ]
  var meta

  return getSocialData(chtml, neededMetaTags).then(socialMeta => {
    meta = socialMeta
    if (neededMetaTags.length !== 0) {
      return getGenMetaData(chtml, neededMetaTags, meta)
    }

    meta.is_video = meta.type && meta.type == 'video'?  true : false;
    return meta
  })
}

var findOneAsync = function (where) {
  return new Promise((resolve, reject) => {
    MetadataModel.findOne({ url: where.url }, '-_id', function (err, urlData) {
      if (err) return reject(err)
      return resolve(urlData)
    })
  })
}

var findMaxIdAsync = function () {
  return new Promise((resolve, reject) => {
    MetadataModel.findOne({}).sort('-date_add').exec(function (err, data) {
      if (err) return reject(err)
      return resolve(data.id || 0)
   })
  })
}

var saveDB  = function (data) {
  return findMaxIdAsync().then( maxID => {
    var dataToSave = new MetadataModel({
      id: (maxID + 1),
      url: data.url,
      domain: data.domain,
      title: data.meta.title,
      description: data.meta.description,
      media_id: data.meta.media_id,
      original_image_url: data.meta.image,
      width: data.meta.width,
      height: data.meta.height,
      is_video: data.meta.is_video,
      aspect_ratio: data.meta.aspect_ratio,
    });
    return dataToSave.save()
  }).then(function(savedData) {
      return MetadataModel.findById(savedData._id).populate('-_id')
  })
}

module.exports = router
