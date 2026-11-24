(function () {
    "use strict";

    var STORAGE_KEY = "l5_gallery_token";
    var previewUrls = [];

    function storageGet() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) || "";
        } catch (e) {
            return "";
        }
    }

    function storageSet(value) {
        try {
            if (value) {
                sessionStorage.setItem(STORAGE_KEY, value);
            } else {
                sessionStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {}
    }

    function text(node, value) {
        node.textContent = value == null ? "" : String(value);
    }

    function headers() {
        return { Authorization: "Bearer " + storageGet() };
    }

    function revokePreviews() {
        previewUrls.forEach(function (url) {
            URL.revokeObjectURL(url);
        });
        previewUrls = [];
    }

    function setMessage(message, isError) {
        var node = document.getElementById("admin-message");
        if (!node) {
            return;
        }
        text(node, message);
        node.className = isError ? "admin-message error" : "admin-message";
    }

    function loadList(status) {
        var list = document.getElementById("admin-list");
        if (!list) {
            return;
        }
        revokePreviews();
        list.innerHTML = "";
        fetch("/api/gallery/admin?status=" + encodeURIComponent(status || "pending") + "&limit=50", {
            headers: headers(),
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, status: response.status, data: data };
                });
            })
            .then(function (result) {
                if (result.status === 401) {
                    setMessage("Token rejected. Check L5_GALLERY_TOKEN.", true);
                    return;
                }
                if (result.status === 503) {
                    setMessage("Gallery storage is not bound yet. See docs/gallery-api.md.", true);
                    return;
                }
                if (!result.ok) {
                    setMessage((result.data && result.data.error) || "Could not load the queue.", true);
                    return;
                }
                var counts = result.data.counts || {};
                var countsNode = document.getElementById("admin-counts");
                if (countsNode) {
                    text(
                        countsNode,
                        "Pending " +
                            (counts.pending || 0) +
                            " · Scheduled " +
                            (counts.scheduled || 0) +
                            " · Live " +
                            (counts.live || 0) +
                            " · Rejected " +
                            (counts.rejected || 0)
                    );
                }
                setMessage("");
                var items = result.data.items || [];
                if (!items.length) {
                    var empty = document.createElement("p");
                    text(empty, "No items in this queue.");
                    list.appendChild(empty);
                    return;
                }
                items.forEach(function (item) {
                    list.appendChild(renderItem(item));
                });
            })
            .catch(function () {
                setMessage("Network error loading the queue.", true);
            });
    }

    function renderItem(item) {
        var article = document.createElement("article");
        article.className = "admin-item";
        var img = document.createElement("img");
        img.alt = item.caption || item.credit || "Pending photograph";
        img.loading = "lazy";
        if (item.width) {
            img.width = item.width;
        }
        if (item.height) {
            img.height = item.height;
        }
        fetch(item.preview_url, { headers: headers() })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("preview failed");
                }
                return response.blob();
            })
            .then(function (blob) {
                var url = URL.createObjectURL(blob);
                previewUrls.push(url);
                img.src = url;
            })
            .catch(function () {
                img.replaceWith(document.createTextNode("Preview unavailable"));
            });
        article.appendChild(img);
        var meta = document.createElement("div");
        meta.className = "admin-item-meta";
        var credit = document.createElement("p");
        text(credit, "Photo: " + (item.credit || "unknown"));
        meta.appendChild(credit);
        if (item.caption) {
            var caption = document.createElement("p");
            text(caption, item.caption);
            meta.appendChild(caption);
        }
        if (item.source) {
            var source = document.createElement("p");
            var link = document.createElement("a");
            link.href = item.source;
            link.rel = "noopener noreferrer";
            text(link, "Source message");
            source.appendChild(link);
            meta.appendChild(source);
        }
        var ids = document.createElement("p");
        ids.className = "admin-muted";
        text(ids, "id " + item.id + (item.user_id ? " · Discord user hidden in public API" : ""));
        meta.appendChild(ids);
        if (item.publish_at) {
            var pub = document.createElement("p");
            text(pub, "Publish at " + item.publish_at + " UTC");
            meta.appendChild(pub);
        }
        if (item.status === "pending") {
            var actions = document.createElement("p");
            var approve = document.createElement("button");
            approve.type = "button";
            approve.className = "cta-button";
            text(approve, "Approve");
            approve.addEventListener("click", function () {
                moderate(item.id, "approve");
            });
            var reject = document.createElement("button");
            reject.type = "button";
            reject.className = "cta-button admin-reject";
            text(reject, "Reject");
            reject.addEventListener("click", function () {
                moderate(item.id, "reject");
            });
            actions.appendChild(approve);
            actions.appendChild(document.createTextNode(" "));
            actions.appendChild(reject);
            meta.appendChild(actions);
        }
        article.appendChild(meta);
        return article;
    }

    function moderate(id, action) {
        fetch("/api/gallery/moderate", {
            method: "POST",
            headers: Object.assign({ "content-type": "application/json" }, headers()),
            body: JSON.stringify({ id: id, action: action }),
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (!result.ok) {
                    setMessage((result.data && result.data.error) || "Moderation failed.", true);
                    return;
                }
                var status = document.getElementById("admin-status");
                loadList(status ? status.value : "pending");
            })
            .catch(function () {
                setMessage("Network error during moderation.", true);
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var form = document.getElementById("admin-token-form");
        var tokenInput = document.getElementById("admin-token");
        var status = document.getElementById("admin-status");
        var clear = document.getElementById("admin-clear");
        if (tokenInput) {
            tokenInput.value = storageGet();
        }
        if (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                storageSet(tokenInput ? tokenInput.value.trim() : "");
                loadList(status ? status.value : "pending");
            });
        }
        if (status) {
            status.addEventListener("change", function () {
                if (storageGet()) {
                    loadList(status.value);
                }
            });
        }
        if (clear) {
            clear.addEventListener("click", function () {
                storageSet("");
                if (tokenInput) {
                    tokenInput.value = "";
                }
                revokePreviews();
                var list = document.getElementById("admin-list");
                if (list) {
                    list.innerHTML = "";
                }
                setMessage("Token cleared from this browser session.");
            });
        }
        if (storageGet()) {
            loadList(status ? status.value : "pending");
        }
    });

    window.addEventListener("pagehide", revokePreviews);
})();
