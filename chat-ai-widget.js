(function () {

    var NGX_CHATAI_API_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

    var fab = document.getElementById("ngxChatAiFab");
    var badge = document.getElementById("ngxChatAiBadge");
    var panel = document.getElementById("ngxChatAiPanel");
    var btnClose = document.getElementById("ngxChatAiClose");
    var boxMessages = document.getElementById("ngxChatAiMessages");
    var boxSuggest = document.getElementById("ngxChatAiSuggest");
    var input = document.getElementById("ngxChatAiInput");
    var btnSend = document.getElementById("ngxChatAiSend");

    if (!fab) return;

    var riwayat = []; // { role: "user"|"model", text: "..." }
    var sedangKirim = false;
    var sudahDibuka = false;

    function escapeHtmlChat(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function tambahBubble(teks, dariUser, isError) {
        var bubble = document.createElement("div");
        bubble.className = "ngx-chatai-msg " + (dariUser ? "dari-user" : "dari-ai") + (isError ? " error-msg" : "");
        bubble.innerHTML = escapeHtmlChat(teks);
        boxMessages.appendChild(bubble);
        boxMessages.scrollTop = boxMessages.scrollHeight;
    }

    function tampilkanTyping() {
        var el = document.createElement("div");
        el.className = "ngx-chatai-typing";
        el.id = "ngxChatAiTyping";
        el.innerHTML = "<span></span><span></span><span></span>";
        boxMessages.appendChild(el);
        boxMessages.scrollTop = boxMessages.scrollHeight;
    }

    function hapusTyping() {
        var el = document.getElementById("ngxChatAiTyping");
        if (el) el.remove();
    }

    function kirimPesan(teks) {

        teks = String(teks || "").trim();
        if (!teks || sedangKirim) return;

        boxSuggest.classList.add("hidden");

        tambahBubble(teks, true);
        riwayat.push({ role: "user", text: teks });

        input.value = "";
        sedangKirim = true;
        btnSend.disabled = true;
        tampilkanTyping();

        var body = new URLSearchParams();
        body.append("action", "tanyaAiChat");
        body.append("pertanyaan", teks);
        body.append("riwayat", JSON.stringify(riwayat.slice(0, -1))); // riwayat SEBELUM pesan ini

        fetch(NGX_CHATAI_API_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                hapusTyping();
                sedangKirim = false;
                btnSend.disabled = false;

                if (!data || data.success !== true) {
                    tambahBubble(data && data.message ? data.message : "Maaf, terjadi kesalahan. Coba lagi ya.", false, true);
                    return;
                }

                tambahBubble(data.jawaban, false);
                riwayat.push({ role: "model", text: data.jawaban });

            })
            .catch(function () {
                hapusTyping();
                sedangKirim = false;
                btnSend.disabled = false;
                tambahBubble("Gagal terhubung ke server. Periksa koneksi internet kamu.", false, true);
            });

    }

    fab.addEventListener("click", function () {

        panel.classList.toggle("terbuka");

        if (!sudahDibuka && panel.classList.contains("terbuka")) {
            sudahDibuka = true;
            badge.style.display = "none";
            tambahBubble("Halo! 👋 Ada yang bisa saya bantu seputar pinjaman atau simpanan di KAS NGX?", false);
        }

    });

    btnClose.addEventListener("click", function () { panel.classList.remove("terbuka"); });

    btnSend.addEventListener("click", function () { kirimPesan(input.value); });

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") kirimPesan(input.value);
    });

    boxSuggest.querySelectorAll("button").forEach(function (btn) {
        btn.addEventListener("click", function () { kirimPesan(btn.getAttribute("data-q")); });
    });

    if (window.lucide) lucide.createIcons();

})();
