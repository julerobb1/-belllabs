document.addEventListener("DOMContentLoaded", function () {
    var markers = document.querySelectorAll(".timeline-marker");
    var events = document.querySelectorAll(".timeline-event");
    var filterButtons = document.querySelectorAll(".filter-button");
    var eraButtons = document.querySelectorAll(".era-button");

    function showYear(year) {
        markers.forEach(function (marker) {
            marker.classList.toggle("active", marker.getAttribute("data-year") === year);
        });
        events.forEach(function (eventNode) {
            eventNode.classList.toggle("active", eventNode.getAttribute("data-year") === year);
        });
    }

    markers.forEach(function (marker) {
        marker.addEventListener("click", function () {
            showYear(marker.getAttribute("data-year"));
        });
    });

    filterButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            var filter = button.getAttribute("data-filter");
            filterButtons.forEach(function (other) {
                other.classList.toggle("active", other === button);
            });
            markers.forEach(function (marker) {
                if (filter === "all") {
                    marker.style.display = "block";
                    return;
                }
                var categories = (marker.getAttribute("data-category") || "").split(",");
                marker.style.display = categories.indexOf(filter) !== -1 ? "block" : "none";
            });
        });
    });

    eraButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            var startYear = parseInt(button.getAttribute("data-start"), 10);
            var endYear = parseInt(button.getAttribute("data-end"), 10);
            var startLabel = document.getElementById("timeline-start-year");
            var endLabel = document.getElementById("timeline-end-year");
            if (startLabel) {
                startLabel.textContent = String(startYear);
            }
            if (endLabel) {
                endLabel.textContent = String(endYear);
            }
            var first = null;
            markers.forEach(function (marker) {
                var year = parseInt(marker.getAttribute("data-year"), 10);
                var inRange = year >= startYear && year <= endYear;
                marker.style.display = inRange ? "block" : "none";
                if (inRange && !first) {
                    first = marker;
                }
            });
            if (first) {
                first.click();
            }
        });
    });

    if (markers.length) {
        markers[0].click();
    }
});
