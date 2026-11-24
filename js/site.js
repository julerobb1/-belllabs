(function () {
    "use strict";

    var THEME_KEY = "theme";
    var LEGACY_KEY = "darkMode";

    function storageGet(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* private mode / blocked storage */
        }
    }

    function readStoredTheme() {
        var theme = storageGet(THEME_KEY);
        if (theme === "dark" || theme === "light") {
            return theme;
        }
        var legacy = storageGet(LEGACY_KEY);
        if (legacy === "enabled" || legacy === "true") {
            return "dark";
        }
        if (legacy === "disabled" || legacy === "false") {
            return "light";
        }
        return null;
    }

    function systemPrefersDark() {
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    function currentTheme() {
        return document.documentElement.classList.contains("dark-mode") ? "dark" : "light";
    }

    function applyTheme(theme, persist) {
        var isDark = theme === "dark";
        document.documentElement.classList.toggle("dark-mode", isDark);
        if (document.body) {
            document.body.classList.toggle("dark-mode", isDark);
        }
        var button = document.getElementById("theme-toggle");
        if (button) {
            button.textContent = isDark ? "Light mode" : "Dark mode";
            button.setAttribute("aria-pressed", isDark ? "true" : "false");
        }
        if (persist) {
            storageSet(THEME_KEY, theme);
            storageSet(LEGACY_KEY, isDark ? "enabled" : "disabled");
        }
    }

    function initTheme() {
        var stored = readStoredTheme();
        applyTheme(stored || (systemPrefersDark() ? "dark" : "light"), false);

        var button = document.getElementById("theme-toggle");
        if (button) {
            button.addEventListener("click", function () {
                applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
            });
        }

        if (window.matchMedia) {
            var mq = window.matchMedia("(prefers-color-scheme: dark)");
            var onChange = function (event) {
                if (!readStoredTheme()) {
                    applyTheme(event.matches ? "dark" : "light", false);
                }
            };
            if (mq.addEventListener) {
                mq.addEventListener("change", onChange);
            } else if (mq.addListener) {
                mq.addListener(onChange);
            }
        }
    }

    function initNav() {
        var nav = document.querySelector(".site-nav");
        var toggle = document.querySelector(".nav-toggle");
        var menu = document.getElementById("nav-menu");
        if (toggle && nav && menu) {
            toggle.addEventListener("click", function () {
                var open = nav.classList.toggle("is-open");
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
            });
        }

        document.querySelectorAll(".dropdown > .drop-toggle").forEach(function (btn) {
            btn.addEventListener("click", function (event) {
                event.preventDefault();
                var parent = btn.parentElement;
                var willOpen = !parent.classList.contains("is-open");
                document.querySelectorAll(".dropdown.is-open").forEach(function (openDrop) {
                    if (openDrop !== parent) {
                        openDrop.classList.remove("is-open");
                        var otherBtn = openDrop.querySelector(".drop-toggle");
                        if (otherBtn) {
                            otherBtn.setAttribute("aria-expanded", "false");
                        }
                    }
                });
                parent.classList.toggle("is-open", willOpen);
                btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
            });
        });

        document.addEventListener("click", function (event) {
            if (!event.target.closest(".dropdown")) {
                document.querySelectorAll(".dropdown.is-open").forEach(function (openDrop) {
                    openDrop.classList.remove("is-open");
                    var otherBtn = openDrop.querySelector(".drop-toggle");
                    if (otherBtn) {
                        otherBtn.setAttribute("aria-expanded", "false");
                    }
                });
            }
        });
    }

    function initYear() {
        var nodes = document.querySelectorAll("#year, [data-year]");
        var year = String(new Date().getFullYear());
        nodes.forEach(function (node) {
            node.textContent = year;
        });
    }

    function initSlideshow() {
        var slides = document.querySelectorAll(".mySlides");
        if (!slides.length) {
            return;
        }
        var dots = document.querySelectorAll(".slideshow-navigation .dot");
        var index = 1;

        function show(n) {
            if (n > slides.length) {
                index = 1;
            } else if (n < 1) {
                index = slides.length;
            } else {
                index = n;
            }
            slides.forEach(function (slide) {
                slide.style.display = "none";
            });
            dots.forEach(function (dot) {
                dot.classList.remove("active");
            });
            slides[index - 1].style.display = "block";
            if (dots[index - 1]) {
                dots[index - 1].classList.add("active");
            }
        }

        document.querySelectorAll(".slideshow-container .prev").forEach(function (btn) {
            btn.addEventListener("click", function (event) {
                event.preventDefault();
                show(index - 1);
            });
        });
        document.querySelectorAll(".slideshow-container .next").forEach(function (btn) {
            btn.addEventListener("click", function (event) {
                event.preventDefault();
                show(index + 1);
            });
        });
        dots.forEach(function (dot, i) {
            dot.addEventListener("click", function () {
                show(i + 1);
            });
        });
        show(1);
    }

    function createPicture(image) {
        var picture = document.createElement("picture");
        if (image.webp) {
            var source = document.createElement("source");
            source.srcset = image.webp;
            source.type = "image/webp";
            picture.appendChild(source);
        }
        var img = document.createElement("img");
        img.src = image.src;
        img.alt = image.alt || "";
        img.loading = "lazy";
        if (image.width) {
            img.width = image.width;
        }
        if (image.height) {
            img.height = image.height;
        }
        img.title = image.alt || "";
        img.style.cursor = "pointer";
        img.addEventListener("click", function () {
            window.location.href = "gallery.html";
        });
        picture.appendChild(img);
        return picture;
    }

    function initHomeGallery() {
        var holder = document.getElementById("dynamic-gallery");
        if (!holder) {
            return;
        }
        var galleryImages = [
            { src: "img/gallery/20250304_145346.jpg", webp: "img/gallery/20250304_145346.webp", alt: "Collapsed microwave horn-reflector antenna near a fenced area.", width: 1920, height: 1081 },
            { src: "img/gallery/20250304_145429.jpg", webp: "img/gallery/20250304_145429.webp", alt: "Damaged microwave relay equipment on the ground.", width: 1920, height: 1081 },
            { src: "img/gallery/20250309_172527.jpg", webp: "img/gallery/20250309_172527.webp", alt: "Microwave relay tower under a clear sky.", width: 1440, height: 1920 },
            { src: "img/gallery/dhtspll_base.jpg", webp: "img/gallery/dhtspll_base.webp", alt: "Base of a microwave relay tower.", width: 1920, height: 1446 },
            { src: "img/gallery/dhtspll_out.jpg", webp: "img/gallery/dhtspll_out.webp", alt: "Microwave relay tower and equipment building.", width: 1920, height: 1446 },
            { src: "img/gallery/dhtspll_Reflector_HI.jpg", webp: "img/gallery/dhtspll_Reflector_HI.webp", alt: "Close-up of a KS-style horn-reflector antenna.", width: 1446, height: 1920 },
            { src: "img/gallery/dhtspll_TB.jpg", webp: "img/gallery/dhtspll_TB.webp", alt: "Top of a microwave relay tower with antennas.", width: 1920, height: 1446 },
            { src: "img/gallery/dhtspll_vents1.jpg", webp: "img/gallery/dhtspll_vents1.webp", alt: "Ventilation louvers on a Long Lines equipment building.", width: 1446, height: 1920 },
            { src: "img/gallery/dhtspll1_far.jpg", webp: "img/gallery/dhtspll1_far.webp", alt: "Distant view of a microwave relay tower in a field.", width: 1446, height: 1920 },
            { src: "img/gallery/dhtspll2.jpg", webp: "img/gallery/dhtspll2.webp", alt: "Microwave relay tower structure.", width: 1446, height: 1920 },
            { src: "img/gallery/dhtspll3.jpg", webp: "img/gallery/dhtspll3.webp", alt: "Framework of a microwave relay tower.", width: 1446, height: 1920 },
            { src: "img/gallery/dhtspll4.jpg", webp: "img/gallery/dhtspll4.webp", alt: "Microwave relay tower beside its equipment building.", width: 1920, height: 1446 }
        ];
        var i;
        for (i = galleryImages.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = galleryImages[i];
            galleryImages[i] = galleryImages[j];
            galleryImages[j] = tmp;
        }
        holder.innerHTML = "";
        galleryImages.slice(0, 4).forEach(function (image) {
            holder.appendChild(createPicture(image));
        });
    }

    function initDiscord() {
        var container = document.getElementById("discord-widget-container");
        var button = document.getElementById("collapse-button");
        if (!container || !button) {
            return;
        }
        container.classList.add("collapsed");
        button.textContent = "+";
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", function () {
            var collapsed = container.classList.toggle("collapsed");
            button.textContent = collapsed ? "+" : "\u2212";
            button.setAttribute("aria-expanded", collapsed ? "false" : "true");
        });
    }

    function initPlaceholderForm() {
        document.querySelectorAll("form").forEach(function (form) {
            var action = form.getAttribute("action") || "";
            var dead = form.id === "image-upload-form" || form.id === "support-form" || form.id === "research-access-form" || action === "" || action === "#";
            if (!dead) {
                return;
            }
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                window.location.href = "contribute.html";
            });
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initTheme();
        initNav();
        initYear();
        initSlideshow();
        initHomeGallery();
        initDiscord();
        initPlaceholderForm();
    });
})();
