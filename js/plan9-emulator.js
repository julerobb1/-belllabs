document.addEventListener("DOMContentLoaded", function () {
    var emulatorFrame = document.getElementById("plan9-emulator");
    var loadingScreen = document.getElementById("loading-screen");
    if (!emulatorFrame) {
        return;
    }

    if (loadingScreen) {
        loadingScreen.classList.remove("hidden");
    }
    emulatorFrame.src = "https://cat-v.org/9front/js/";
    emulatorFrame.onload = function () {
        window.setTimeout(function () {
            if (loadingScreen) {
                loadingScreen.classList.add("hidden");
            }
        }, 1500);
    };
});
