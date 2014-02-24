var fs = require('fs');
var system = require('system');
var confess = {
    
    run: function() {
        
        var usage = "snitch.js: URL [--delimiter DELIM] [--screenshot IMAGEPATH(.png)] [--userAgent AGENT] [--help print this message]";
        if (system.args.length < 2){
            console.log(usage);
            phantom.exit();
        }

        var url = system.args[1]
        var agent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11";
        var config = {'userAgent': agent, 'url': url, 'wait': 0, 
                      'screenshot': null, 'filmstrip': null, 'delimiter': ' '}

        for(var i=2; i < system.args.length; ++i){
            var flag = system.args[i];
            
            if(flag === '--screenshot'){
                config.screenshot = system.args[i+1];
                i++;
            } else if(flag === '--userAgent'){
                config.userAgent = system.args[i+1];
                i++;
            } else if(flag === '--delimiter'){
                config.delimiter = system.args[i+1];
                i++;
            } else if(flag === '--help'){
                console.log(usage);
                phantom.exit();
            } else {
                console.log('Unrecognized option: '+flag);
                phantom.exit();
            }
        
        }

        this.load(config, this.performance, this); //
    },

    performance: {
        resources: [],
        evalConsole : {},
        evalConsoleErrors: [],

        onInitialized: function(page, config) {

            var pageeval = page.evaluate(function(startTime) {
                var now = new Date().getTime();
                //check the readystate within the page being eoaded

                //Returns "loading" while the document is loading
                var _timer3 = setInterval(function(){
                    if(/loading/.test(document.readyState)){
                        console.log('loading-' + (new Date().getTime() - startTime));
                        //don't clear the interval until we get last measurement
                    }
                }, 5);

                // "interactive" once it is finished parsing but still loading sub-resources
                var _timer1 = setInterval(function(){
                    if(/interactive/.test(document.readyState)){
                        console.log('interactive-' + (new Date().getTime() - startTime));
                        clearInterval(_timer1);
                        //clear loading interval
                        clearInterval(_timer3);
                    }
                }, 5);

                //The DOMContentLoaded event is fired when the document has been completely
                //loaded and parsed, without waiting for stylesheets, images, and subframes
                //to finish loading
                document.addEventListener("DOMContentLoaded", function() {
                    console.log('DOMContentLoaded-' + (new Date().getTime() - startTime));
                }, false);

                //detect a fully-loaded page
                window.addEventListener("load", function() {
                    console.log('onload-' + (new Date().getTime() - startTime));
                }, false);

            }, this.performance.start);
        },

        onLoadStarted: function (page, config) {
            //This callback is invoked when the page starts the loading
            if (!this.performance.start) {
                this.performance.start = new Date().getTime();
            }
        },

        onResourceRequested: function (page, config, request) {
            //This callback is invoked when the page requests a resource
            //Should only be invoked once per resource
            var now = new Date().getTime();
            this.performance.resources[request.id] = {
                id: request.id,
                url: request.url,
                request: request,
                responses: {},
                duration: '-',
                times: {
                    request: now
                }
            };
            if (!this.performance.start || now < this.performance.start) {
                this.performance.start = now;
            }
        },

        onResourceReceived: function (page, config, response) {
            //This callback is invoked when the a resource requested by the page is received
            //If the resource is large and sent by the server in multiple chunks
            var now = new Date().getTime(),
            resource = this.performance.resources[response.id];
            resource.responses[response.stage] = response;
            if (!resource.times[response.stage]) {
                resource.times[response.stage] = now;
                resource.duration = now - resource.times.request;
            }

            /*
            if (response.bodySize) {
                resource.size = response.bodySize;
            } else if (!resource.size) {
                response.headers.forEach(function (header) {
                    if (header.name.toLowerCase()=='content-length') {
                        resource.size = parseInt(header.value);
                    }
                });
            }*/
            
            /*
            * There is currently a bug in PhantomJS which prevents 
            * response.bodySize from returning the correct size.
            * We defer to content-length first if it is available.
            */
            response.headers.forEach(function (header) {
                if (header.name.toLowerCase()=='content-length') {
                    resource.size = parseInt(header.value);
                }
            });
            if (!resource.size) {
                resource.size = response.bodySize;
            }

        },

        onLoadFinished: function (page, config, status) {
            //This callback is invoked when the page finishes the loading
            var start = this.performance.start,
                finish =  new Date().getTime(),
                resources = this.performance.resources,
                slowest, fastest, totalDuration = 0,
                largest, smallest, totalSize = 0,
                missingSize = false,
                onload = this.performance.evalConsole.onload,
                loading = this.performance.evalConsole.loading,
                interactive = this.performance.evalConsole.interactive,
                elapsed = finish - start;

            resources.forEach(function (resource) {
                if (!resource.times.start) {
                    resource.times.start = resource.times.end;
                }
                if (!slowest || resource.duration > slowest.duration) {
                    slowest = resource;
                }
                if (!fastest || resource.duration < fastest.duration) {
                    fastest = resource;
                }
                totalDuration += resource.duration;

                if (resource.size) {
                    if (!largest || resource.size > largest.size) {
                        largest = resource;
                    }
                    if (!smallest || resource.size < smallest.size) {
                        smallest = resource;
                    }
                    totalSize += resource.size;
                } else {
                    resource.size = '-';
                    missingSize = true;
                }
            });

            console.log('Loadtime' + config.delimiter + elapsed + config.delimiter +
                        'numresources' + config.delimiter + (resources.length-1) + config.delimiter +
                        'totalresourcebytes' + config.delimiter + totalSize + config.delimiter +
                        'loading' + config.delimiter + loading + config.delimiter +
                        'interactive' + config.delimiter + interactive + config.delimiter +
                        'onload' + config.delimiter + onload);

            resources.forEach(function (resource) {
                console.log(
                    resource.id + config.delimiter +
                    (resource.times.request - start) + config.delimiter +
                    (resource.times.start - resource.times.request) + config.delimiter +
                    resource.duration + config.delimiter +
                    resource.size + config.delimiter +
                    resource.url
                );
            });
       
            if(config.screenshot) { 
                page.render(config.screenshot);
            }
 
        }
    },

    getFinalUrl: function (page) {
        return page.evaluate(function () {
            return document.location.toString();
        });
    },

    getResourceUrls: function (page) {
        return page.evaluate(function () {
            var
                // resources referenced in DOM
                // notable exceptions: iframes, rss, links
                selectors = [
                    ['script', 'src'],
                    ['img', 'src'],
                    ['link[rel="stylesheet"]', 'href']
                ],

                resources = {},
                baseScheme = document.location.toString().split("//")[0],
                tallyResource = function (url) {
                    if (url && url.substr(0,5)!='data:') {
                        if (url.substr(0, 2)=='//') {
                            url = baseScheme + url;
                        }
                        if (!resources[url]) {
                            resources[url] = 0;
                        }
                        resources[url]++;
                    }
                },

                elements, elementsLength, e,
                stylesheets, stylesheetsLength, ss,
                rules, rulesLength, r,
                style, styleLength, s,
                computed, computedLength, c,
                value;

            // attributes in DOM
            selectors.forEach(function (selectorPair) {
                elements = document.querySelectorAll(selectorPair[0]);
                for (e = 0, elementsLength = elements.length; e < elementsLength; e++) {
                    tallyResource(elements[e].getAttribute(selectorPair[1]));
                };
            });

            // URLs in stylesheets
            stylesheets = document.styleSheets;
            for (ss = 0, stylesheetsLength = stylesheets.length; ss < stylesheetsLength; ss++) {
                rules = stylesheets[ss].rules;
                if (!rules) { continue; }
                for (r = 0, rulesLength = rules.length; r < rulesLength; r++) {
                    if (!rules[r]['style']) { continue; }
                    style = rules[r].style;
                    for (s = 0, styleLength = style.length; s < styleLength; s++) {
                        value = style.getPropertyCSSValue(style[s]);
                        if (value && value.primitiveType == CSSPrimitiveValue.CSS_URI) {
                            tallyResource(value.getStringValue());
                        }
                    }
                };
            };

            // URLs in styles on DOM
            elements = document.querySelectorAll('*');
            for (e = 0, elementsLength = elements.length; e < elementsLength; e++) {
                computed = elements[e].ownerDocument.defaultView.getComputedStyle(elements[e], '');
                for (c = 0, computedLength = computed.length; c < computedLength; c++) {
                    value = computed.getPropertyCSSValue(computed[c]);
                    if (value && value.primitiveType == CSSPrimitiveValue.CSS_URI) {
                        tallyResource(value.getStringValue());
                    }
                }
            };

            return resources;
        });
    },

    getCssProperties: function (page) {
        return page.evaluate(function () {
            var properties = {},
                tallyProperty = function (property) {
                    if (!properties[property]) {
                        properties[property] = 0;
                    }
                    properties[property]++;
                },
                stylesheets, stylesheetsLength, ss,
                rules, rulesLength, r,
                style, styleLength, s,
                property;

            // properties in stylesheets
            stylesheets = document.styleSheets;
            for (ss = 0, stylesheetsLength = stylesheets.length; ss < stylesheetsLength; ss++) {
                rules = stylesheets[ss].rules;
                if (!rules) { continue; }
                for (r = 0, rulesLength = rules.length; r < rulesLength; r++) {
                    if (!rules[r]['style']) { continue; }
                    style = rules[r].style;
                    for (s = 0, styleLength = style.length; s < styleLength; s++) {
                        tallyProperty(style[s]);
                    }
                }
            }

            // properties in styles on DOM
            elements = document.querySelectorAll('*');
            for (e = 0, elementsLength = elements.length; e < elementsLength; e++) {
                rules = elements[e].ownerDocument.defaultView.getMatchedCSSRules(elements[e], '');
                if (!rules) { continue; }
                for (r = 0, rulesLength = rules.length; r < rulesLength; r++) {
                    if (!rules[r]['style']) { continue; }
                    style = rules[r].style;
                    for (s = 0, styleLength = style.length; s < styleLength; s++) {
                        tallyProperty(style[s]);
                    }
                }
            }
            return properties;
        });
    },

    load: function (config, task, scope) {
        var page = new WebPage(), event;
        
        page.settings.userAgent = config.userAgent;        

        ['onInitialized', 'onLoadStarted', 'onResourceRequested', 'onResourceReceived']
        .forEach(function (event) {
            if (task[event]) {
                page[event] = function () {
                    var args = [page, config], a, aL;
                    for (a = 0, aL = arguments.length; a < aL; a++) {
                        args.push(arguments[a]);
                    }
                    task[event].apply(scope, args);
                };
            }
        });
        if (task.onLoadFinished) {
            page.onLoadFinished = function (status) {
                if (config.wait) {
                    setTimeout(
                        function () {
                            task.onLoadFinished.call(scope, page, config, status);
                            phantom.exit();
                        },
                        config.wait
                    );
                } else {
                    task.onLoadFinished.call(scope, page, config, status);
                    phantom.exit();
                }
            };
        } else {
            page.onLoadFinished = function (status) {
                phantom.exit();
            }
        }

        page.settings.localToRemoteUrlAccessEnabled = true;
        page.settings.webSecurityEnabled = false;
        page.onConsoleMessage = function (msg) {
            //console.log(msg)
            if (msg.indexOf('jserror-') >= 0){
                confess.performance.evalConsoleErrors.push(msg.substring('jserror-'.length, msg.length));
            } else{
                if (msg.indexOf('loading-') >= 0){
                    confess.performance.evalConsole.loading = msg.substring('loading-'.length, msg.length);
                } else if (msg.indexOf('interactive-') >= 0){
                    confess.performance.evalConsole.interactive = msg.substring('interactive-'.length, msg.length);
                } else if (msg.indexOf('onload-') >= 0){
                    confess.performance.evalConsole.onload = msg.substring('onload-'.length, msg.length);
                }
            }
        };

        page.open(config.url);
    },
    
}

confess.run();
