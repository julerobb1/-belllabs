(function () {
    "use strict";

    function text(node, value) {
        node.textContent = value == null ? "" : String(value);
    }

    function renderItem(item, eager) {
        var figure = document.createElement("figure");
        figure.className = "figure community-photo";
        var img = document.createElement("img");
        img.src = item.url;
        img.alt = item.caption || ("Photograph by " + (item.credit || "community"));
        img.loading = eager ? "eager" : "lazy";
        if (eager) {
            img.fetchPriority = "high";
        }
        if (item.width) {
            img.width = item.width;
        }
        if (item.height) {
            img.height = item.height;
        }
        figure.appendChild(img);
        var caption = document.createElement("figcaption");
        var credit = document.createElement("span");
        credit.className = "photo-credit";
        text(credit, "Photo: " + (item.credit || "unknown"));
        caption.appendChild(credit);
        if (item.caption) {
            caption.appendChild(document.createTextNode(" — "));
            var extra = document.createElement("span");
            extra.className = "photo-caption";
            text(extra, item.caption);
            caption.appendChild(extra);
        }
        figure.appendChild(caption);
        return figure;
    }

    function loadCommunityGallery() {
        var holder = document.getElementById("community-gallery");
        var status = document.getElementById("community-gallery-status");
        if (!holder) {
            return;
        }
        fetch("/api/gallery?limit=50")
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("gallery unavailable");
                }
                return response.json();
            })
            .then(function (data) {
                var items = (data && data.items) || [];
                holder.innerHTML = "";
                if (!items.length) {
                    if (status) {
                        text(status, "No community photographs have been published yet. Approved submissions appear here a few at a time.");
                    }
                    return;
                }
                if (status) {
                    status.hidden = true;
                }
                items.forEach(function (item, index) {
                    holder.appendChild(renderItem(item, index === 0));
                });
            })
            .catch(function () {
                if (status) {
                    text(status, "Community photographs will appear here once the gallery API is live.");
                }
            });
    }

    document.addEventListener("DOMContentLoaded", loadCommunityGallery);
})();
