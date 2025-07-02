/**
 * Enhanced Compatibility layer for older browsers
 * Supports: IE8+, Firefox 16+, early Chrome versions
 */

// Utility function to sanitize URLs
function sanitizeUrl(url) {
    try {
        var parsedUrl = new URL(url, window.location.origin);
        return encodeURIComponent(parsedUrl.pathname) + 
               encodeURIComponent(parsedUrl.search) + 
               encodeURIComponent(parsedUrl.hash);
    } catch (e) {
        console.error('Invalid URL:', url);
        return '';
    }
}

// Polyfill for console (IE8 crashes when console is undefined and DevTools not open)
if (!window.console) {
    window.console = {
        log: function() {},
        error: function() {},
        warn: function() {},
        info: function() {}
    };
}

// JSON Error handling - Fix for "Unterminated string in JSON" errors
(function() {
    // Save reference to original JSON.parse
    var originalJSONParse = window.JSON && window.JSON.parse;
    
    // If JSON.parse exists, create a safer version
    if (originalJSONParse) {
        window.JSON.parse = function(text, reviver) {
            try {
                return originalJSONParse(text, reviver);
            } catch (e) {
                console.error("JSON Parse Error:", e.message);
                
                // Try to fix common JSON errors
                var fixedText = text;
                
                // Fix for unterminated strings
                fixedText = fixedText.replace(/:\s*"([^"]*)(?=[,}])/g, ':"$1"');
                
                // Fix for missing quotes around property names
                fixedText = fixedText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
                
                // Fix trailing commas
                fixedText = fixedText.replace(/,\s*([}\]])/g, '$1');
                
                try {
                    return originalJSONParse(fixedText, reviver);
                } catch (e2) {
                    console.error("Unable to fix JSON:", e2.message);
                    // Return empty object as fallback
                    return {};
                }
            }
        };
    } else {
        // Simple JSON parser for browsers without native JSON support
        window.JSON = {
            parse: function(text) {
                // WARNING: This is not a full JSON parser and should only be used as a last resort
                try {
                    // Use Function as a last resort fallback (less secure)
                    return (new Function('return ' + text))();
                } catch (e) {
                    console.error("JSON Fallback Parse Error:", e.message);
                    return {};
                }
            },
            stringify: function(obj) {
                // Very basic stringify implementation
                if (obj === null || obj === undefined) return 'null';
                if (typeof obj === 'string') return '"' + obj.replace(/["\\]/g, function(match) {
                    return match === '"' ? '\\"' : '\\\\';
                }) + '"';
                if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
                if (Array.isArray(obj)) {
                    return '[' + obj.map(function(item) {
                        return window.JSON.stringify(item);
                    }).join(',') + ']';
                }
                if (typeof obj === 'object') {
                    var pairs = [];
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            pairs.push('"' + key + '":' + window.JSON.stringify(obj[key]));
                        }
                    }
                    return '{' + pairs.join(',') + '}';
                }
                return '{}';
            }
        };
    }
})();

// Polyfill for getElementsByClassName (IE8)
if (!document.getElementsByClassName) {
    document.getElementsByClassName = function(className) {
        return document.querySelectorAll("." + className);
    };
}

// Polyfill for trim (IE8)
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}

// Polyfill for Array methods
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback, thisArg) {
        var T, k;
        if (this == null) {
            throw new TypeError('this is null or not defined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        if (arguments.length > 1) {
            T = thisArg;
        }
        k = 0;
        while (k < len) {
            var kValue;
            if (k in O) {
                kValue = O[k];
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
}

if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        var k;
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = +fromIndex || 0;
        if (Math.abs(n) === Infinity) {
            n = 0;
        }
        if (n >= len) {
            return -1;
        }
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (k in O && O[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}

// Polyfill for addEventListener (IE8)
if (!Element.prototype.addEventListener) {
    Element.prototype.addEventListener = function(event, callback) {
        var element = this;
        this.attachEvent('on' + event, function() {
            callback.call(element);
        });
    };
}

// Polyfill for localStorage with cookie fallback
(function() {
    if (!window.localStorage) {
        window.localStorage = {
            getItem: function(key) {
                var matches = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
                return matches ? decodeURIComponent(matches[2]) : null;
            },
            setItem: function(key, value) {
                document.cookie = key + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000';
            },
            removeItem: function(key) {
                document.cookie = key + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        };
    }
})();

// Dark mode support for older browsers
function getDarkModePreference() {
    try {
        return localStorage.getItem('darkMode');
    } catch (e) {
        // Fallback to cookies if localStorage fails
        var match = document.cookie.match(/darkMode=(enabled|disabled)/);
        return match ? match[1] : null;
    }
}

// Fix for classList which is not supported in IE9 and below
(function() {
    if (!("classList" in document.documentElement)) {
        Object.defineProperty(HTMLElement.prototype, 'classList', {
            get: function() {
                var self = this;
                
                function update(fn) {
                    return function(value) {
                        var classes = self.className.split(/\s+/);
                        var index = classes.indexOf(value);
                        fn(classes, index, value);
                        self.className = classes.join(" ");
                        return self;
                    };
                }
                
                return {
                    add: update(function(classes, index, value) {
                        if (!~index) classes.push(value);
                    }),
                    remove: update(function(classes, index) {
                        if (~index) classes.splice(index, 1);
                    }),
                    toggle: update(function(classes, index, value) {
                        if (~index) { classes.splice(index, 1); } 
                        else { classes.push(value); }
                    }),
                    contains: function(value) {
                        return !!~self.className.split(/\s+/).indexOf(value);
                    }
                };
            }
        });
    }
})();

// Basic event helper functions
function addEvent(el, type, handler) {
    if (el.addEventListener) {
        el.addEventListener(type, handler, false);
    } else if (el.attachEvent) {
        el.attachEvent('on' + type, handler);
    } else {
        el['on' + type] = handler;
    }
}

function removeEvent(el, type, handler) {
    if (el.removeEventListener) {
        el.removeEventListener(type, handler, false);
    } else if (el.detachEvent) {
        el.detachEvent('on' + type, handler);
    } else {
        el['on' + type] = null;
    }
}

// Browser detection
var BrowserDetect = {
    init: function() {
        this.browser = this.searchString(this.dataBrowser) || "Unknown Browser";
        this.version = this.searchVersion(navigator.userAgent) || 
                       this.searchVersion(navigator.appVersion) || 
                       "Unknown Version";
        this.OS = this.searchString(this.dataOS) || "Unknown OS";
        
        // Add class for browser to html element
        var htmlEl = document.getElementsByTagName("html")[0];
        if (htmlEl) {
            htmlEl.className += " " + this.browser.toLowerCase() + " " + 
                                this.browser.toLowerCase() + this.version;
        }
    },
    isIE8orLower: function() {
        return this.browser === "Explorer" && this.version <= 8;
    },
    isLegacyBrowser: function() {
        return (this.browser === "Explorer" && this.version <= 9) ||
               (this.browser === "Firefox" && this.version <= 16) ||
               (this.browser === "Chrome" && this.version <= 10);
    },
    searchString: function(data) {
        for (var i = 0; i < data.length; i++) {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1) {
                    return data[i].identity;
                }
            } else if (dataProp) {
                return data[i].identity;
            }
        }
    },
    searchVersion: function(dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },
    dataBrowser: [
        {string: navigator.userAgent, subString: "Chrome", identity: "Chrome"},
        {string: navigator.userAgent, subString: "MSIE", identity: "Explorer", versionSearch: "MSIE"},
        {string: navigator.userAgent, subString: "Trident/7.0", identity: "Explorer", versionSearch: "rv"},
        {string: navigator.userAgent, subString: "Firefox", identity: "Firefox"},
        {string: navigator.userAgent, subString: "Safari", identity: "Safari", versionSearch: "Version"},
        {string: navigator.vendor, subString: "Apple", identity: "Safari", versionSearch: "Version"},
        {prop: window.opera, identity: "Opera"}
    ],
    dataOS: [
        {string: navigator.platform, subString: "Win", identity: "Windows"},
        {string: navigator.platform, subString: "Mac", identity: "Mac"},
        {string: navigator.platform, subString: "Linux", identity: "Linux"}
    ]
};

// Initialize browser detection
BrowserDetect.init();

// Apply browser-specific fixes
function applyBrowserFixes() {
    if (BrowserDetect.isIE8orLower()) {
        // Apply IE8 specific fixes
        var styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.styleSheet.cssText = ".image-gallery { zoom: 1; } " +
            ".image-gallery:before, .image-gallery:after { content: ''; display: table; clear: both; } " +
            ".image-gallery img { float: left; width: 48%; margin: 1%; } " +
            "nav { zoom: 1; } " +
            "nav:before, nav:after { content: ''; display: table; clear: both; } " +
            "nav a { float: left; margin: 5px; }";
        document.getElementsByTagName("head")[0].appendChild(styleSheet);
        
        // Fix for images without alt attribute (IE8 bug)
        var allImages = document.getElementsByTagName("img");
        for (var i = 0; i < allImages.length; i++) {
            if (!allImages[i].getAttribute("alt")) {
                allImages[i].setAttribute("alt", "");
            }
        }
    }
    
    if (BrowserDetect.isLegacyBrowser()) {
        // Disable animations for performance
        var styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        if (styleSheet.styleSheet) { // IE
            styleSheet.styleSheet.cssText = "* { transition: none !important; animation: none !important; }";
        } else { // Other browsers
            styleSheet.appendChild(document.createTextNode("* { transition: none !important; animation: none !important; }"));
        }
        document.getElementsByTagName("head")[0].appendChild(styleSheet);
    }
}

// Run fixes when DOM is ready
function domReady(fn) {
    if (document.addEventListener) {
        document.addEventListener("DOMContentLoaded", fn);
    } else {
        document.attachEvent("onreadystatechange", function() {
            if (document.readyState === "interactive") {
                fn();
            }
        });
    }
}

domReady(applyBrowserFixes);

// Simple slideshow replacement for older browsers
function simpleSlideshowFallback() {
    if (BrowserDetect.isIE8orLower()) {
        var currentSlide = 0;
        var slides = document.getElementsByClassName('mySlides');
        if (slides.length === 0) return;
        
        // Hide all slides except the first one
        for (var i = 1; i < slides.length; i++) {
            slides[i].style.display = 'none';
        }
        slides[0].style.display = 'block';
        
        // Simple slideshow functionality
        window.simpleSlideshowNext = function() {
            slides[currentSlide].style.display = 'none';
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].style.display = 'block';
        };
        
        window.simpleSlideshowPrev = function() {
            slides[currentSlide].style.display = 'none';
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            slides[currentSlide].style.display = 'block';
        };
        
        // Replace modern event handlers with compatible ones
        var prevBtn = document.querySelector('.prev');
        var nextBtn = document.querySelector('.next');
        
        if (prevBtn) {
            prevBtn.onclick = window.simpleSlideshowPrev;
        }
        
        if (nextBtn) {
            nextBtn.onclick = window.simpleSlideshowNext;
        }
    }
}

domReady(simpleSlideshowFallback);

// Enhanced image gallery for older browsers
function enhanceImageGallery() {
    if (BrowserDetect.isIE8orLower()) {
        var gallery = document.getElementById('dynamic-gallery');
        if (!gallery) return;
        
        // Add clearfix class
        if (gallery.className.indexOf('clearfix') === -1) {
            gallery.className += ' clearfix';
        }
        
        // Fix margins and floats
        var images = gallery.getElementsByTagName('img');
        for (var i = 0; i < images.length; i++) {
            images[i].style.cssFloat = 'left';
            images[i].style.width = '48%';
            images[i].style.margin = '1%';
        }
    }
}

// Ensure this runs after the gallery is populated
setTimeout(enhanceImageGallery, 1000);

// Fix for RSS feed display in IE11
function fixRSSForIE() {
    if (window.navigator.userAgent.indexOf('Trident/') > -1) {
        // We're in IE11
        var links = document.querySelectorAll('a[href$="rss.xml"]');
        for (var i = 0; i < links.length; i++) {
            // Modify to use the IE-specific protocol handler
            links[i].setAttribute('data-rss-url', links[i].getAttribute('href'));
            links[i].addEventListener('click', function(e) {
                if (window.navigator.userAgent.indexOf('Trident/') > -1) {
                    // Only intercept in IE
                    e.preventDefault();
                    var rssUrl = this.getAttribute('data-rss-url');
                    if (rssUrl && rssUrl.startsWith('http')) { // Basic validation
                        var sanitizedUrl = sanitizeUrl(rssUrl);
                        window.location = 'read:' + window.location.protocol + '//' + 
                                        window.location.host + '/' + sanitizedUrl;
                    } else {
                        console.error('Invalid RSS URL:', rssUrl);
                    }
                }
            });
        }
    }
}

domReady(fixRSSForIE);
