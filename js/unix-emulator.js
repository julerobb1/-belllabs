document.addEventListener("DOMContentLoaded", function () {
    var tabs = document.querySelectorAll(".emulator-tab");
    var emulatorFrame = document.getElementById("unix-emulator");
    var loadingScreen = document.getElementById("loading-screen");
    if (!emulatorFrame) {
        return;
    }

    var emulators = {
        unixv7: "https://bellard.org/jslinux/vm.html?url=unixv7.json&mem=128&graphic=0&term=vt100",
        unixv6: "https://www.pcjs.org/software/pcx86/sys/unix/ibm/pc-ix/1.00/embed.html",
        research: "https://copy.sh/v86/?profile=unix"
    };

    function switchEmulator(emulatorId) {
        if (loadingScreen) {
            loadingScreen.classList.remove("hidden");
        }
        tabs.forEach(function (tab) {
            tab.classList.toggle("active", tab.getAttribute("data-emulator") === emulatorId);
        });
        emulatorFrame.src = emulators[emulatorId] || "about:blank";
        emulatorFrame.onload = function () {
            window.setTimeout(function () {
                if (loadingScreen) {
                    loadingScreen.classList.add("hidden");
                }
            }, 1000);
        };
    }

    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            switchEmulator(tab.getAttribute("data-emulator"));
        });
    });

    switchEmulator("unixv7");
});
