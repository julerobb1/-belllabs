document.addEventListener("DOMContentLoaded", function () {
    var copyButton = document.getElementById("copy-button");
    if (!copyButton) {
        return;
    }
    copyButton.addEventListener("click", function () {
        var url = new URL("rss.xml", window.location.href).href;
        function done() {
            copyButton.textContent = "Copied";
            window.setTimeout(function () {
                copyButton.textContent = "Copy RSS URL";
            }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done).catch(function () {
                window.prompt("Copy this RSS URL:", url);
            });
        } else {
            window.prompt("Copy this RSS URL:", url);
        }
    });
});
