(function () {

    var dataLog = [];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function badgePrioritas(p) {
        if (p === "Penting") return "ngx-badge-mini ngx-badge-merah2";
        if (p === "Perhatian") return "ngx-badge-mini ngx-badge-kuning2";
        return "ngx-badge-mini ngx-badge-biru2";
    }

    function ikonAktivitas(jenis) {
        if (jenis === "Tambah") return "plus-circle";
        if (jenis === "Edit") return "pencil";
        if (jenis === "Hapus") return "trash-2";
        if (jenis === "Perubahan Status") return "refresh-cw";
        if (jenis === "Pembayaran") return "wallet";
        if (jenis === "Perubahan Saldo") return "trending-up";
        return "activity";
    }

    function terapkanFilter() {

        var cari = document.getElementById("cariUmum").value.trim().toUpperCase();
        var jenisTransaksi = document.getElementById("filterJenisTransaksi").value;
        var jenisAktivitas = document.getElementById("filterJenisAktivitas").value;
        var prioritas = document.getElementById("filterPrioritas").value;
        var tanggal = document.getElementById("filterTanggal").value; // yyyy-mm-dd

        return dataLog.filter(function (l) {

            if (cari) {
                var gabungan = (l.userNama + " " + l.namaTerkait + " " + l.keterangan + " " + l.jenisTransaksi).toUpperCase();
                if (gabungan.indexOf(cari) === -1) return false;
            }

            if (jenisTransaksi && l.jenisTransaksi !== jenisTransaksi) return false;
            if (jenisAktivitas && l.jenisAktivitas !== jenisAktivitas) return false;
            if (prioritas && l.prioritas !== prioritas) return false;

            if (tanggal) {
                // waktuFormat contoh: "18 Agu 2026, 10:35:21" -> bandingkan lewat parsing sederhana tidak akurat,
                // jadi kita simpan juga tanggal mentah dari backend kalau ada; fallback: cocokkan substring hari.
                if (l.tanggalIso && l.tanggalIso !== tanggal) return false;
            }

            return true;

        });

    }

    function renderTabel() {

        var hasil = terapkanFilter();
        var tbody = document.getElementById("tbodyLog");
        var emptyState = document.getElementById("emptyStateLog");

        tbody.innerHTML = hasil.map(function (l) {

            var perubahan = (l.dataSebelum || l.dataSesudah)
                ? (escapeHtml(l.dataSebelum || "-") + " <span class='text-gray-300'>&rarr;</span> <strong>" + escapeHtml(l.dataSesudah || "-") + "</strong>")
                : "-";

            return "<tr>" +
                "<td class='whitespace-nowrap'>" + escapeHtml(l.waktuFormat) + "</td>" +
                "<td class='font-semibold'>" + escapeHtml(l.userNama) + "</td>" +
                "<td><span class='ngx-badge-mini ngx-badge-abu2'><i data-lucide='" + ikonAktivitas(l.jenisAktivitas) + "' class='w-3 h-3' style='display:inline-block;margin-right:3px;'></i>" + escapeHtml(l.jenisAktivitas) + "</span></td>" +
                "<td>" + escapeHtml(l.jenisTransaksi) + "</td>" +
                "<td>" + escapeHtml(l.namaTerkait) + "</td>" +
                "<td class='text-xs' style='white-space:normal;min-width:180px;'>" + perubahan + "</td>" +
                "<td class='text-xs text-gray-500' style='white-space:normal;min-width:220px;'>" + escapeHtml(l.keterangan) + "</td>" +
                "<td><span class='" + badgePrioritas(l.prioritas) + "'>" + escapeHtml(l.prioritas) + "</span></td>" +
            "</tr>";

        }).join("");

        emptyState.classList.toggle("hidden", hasil.length > 0);
        if (window.lucide) lucide.createIcons();

    }

    ["cariUmum"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", renderTabel);
    });

    ["filterJenisTransaksi", "filterJenisAktivitas", "filterPrioritas", "filterTanggal"].forEach(function (id) {
        document.getElementById(id).addEventListener("change", renderTabel);
    });

    document.getElementById("btnResetFilterLog").addEventListener("click", function () {
        document.getElementById("cariUmum").value = "";
        document.getElementById("filterJenisTransaksi").value = "";
        document.getElementById("filterJenisAktivitas").value = "";
        document.getElementById("filterPrioritas").value = "";
        document.getElementById("filterTanggal").value = "";
        renderTabel();
    });

    function muatLogAktivitas() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetLogAktivitasSistem&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                dataLog = data.log || [];
                renderTabel();

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    ngxAdminCekSesi(function () { muatLogAktivitas(); });

})();
