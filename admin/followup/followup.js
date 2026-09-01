(function () {

    var loadingBox = document.getElementById("pageLoading");
    var errorBox = document.getElementById("pageError");
    var errorText = document.getElementById("pageErrorText");
    var content = document.getElementById("pageContent");
    var listBox = document.getElementById("daftarNasabahFu");
    var emptyState = document.getElementById("emptyStateFu");

    var dataNasabah = [];
    var terpilih = {}; // { nama: true }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function linkWa(noHp, pesan) {
        var nomor = String(noHp || "").replace(/[^0-9]/g, "");
        if (nomor.indexOf("0") === 0) nomor = "62" + nomor.slice(1);
        return "https://wa.me/" + nomor + "?text=" + encodeURIComponent(pesan || "");
    }

    /* ===== Filter & pencarian ===== */
    function terapkanFilter() {

        var cari = document.getElementById("cariNasabahFu").value.trim().toUpperCase();
        var statusFilter = document.getElementById("filterStatusFu").value;
        var fuFilter = document.getElementById("filterFuStatusKirim").value;

        return dataNasabah.filter(function (n) {

            if (cari && n.nama.toUpperCase().indexOf(cari) === -1) return false;

            if (statusFilter === "tagihan" && n.statusKeseluruhan !== "MASIH ADA TAGIHAN") return false;
            if (statusFilter === "lunas" && n.statusKeseluruhan !== "LUNAS") return false;
            if (statusFilter === "punyaPelunasan" && n.riwayatPelunasan.length === 0) return false;

            if (fuFilter === "belum" && n.sudahFollowUp) return false;
            if (fuFilter === "sudah" && !n.sudahFollowUp) return false;

            return true;

        });

    }

    function kartuNasabah(n) {

        var statusBadge = n.statusKeseluruhan === "LUNAS"
            ? "<span class='ngx-badge-mini ngx-badge-hijau2'>LUNAS</span>"
            : "<span class='ngx-badge-mini ngx-badge-oranye2'>MASIH ADA TAGIHAN</span>";

        var fuInfo = n.followUpTerakhir
            ? "<p class='text-[10.5px] text-gray-400 mt-1'>Follow up terakhir: " + escapeHtml(n.followUpTerakhir.waktuFormat) + " &middot; " + escapeHtml(n.followUpTerakhir.channel) + "</p>"
            : "<p class='text-[10.5px] text-gray-400 mt-1'>Belum pernah di-follow up</p>";

        var pinjamanBerjalanHtml = n.pinjamanBerjalan.length > 0
            ? n.pinjamanBerjalan.map(function (p) {
                return "<div class='ngx-fu-riwayat-item'><span>Pinjaman " + escapeHtml(p.tanggalFormat) + "</span><strong class='text-amber-700'>" + escapeHtml(p.sisaFormat) + "</strong></div>";
            }).join("")
            : "<p class='text-xs text-gray-400 py-2 text-center'>Tidak ada pinjaman berjalan</p>";

        var riwayatPelunasanHtml = n.riwayatPelunasan.length > 0
            ? n.riwayatPelunasan.map(function (r) {
                return "<div class='ngx-fu-riwayat-item'><span>Pinjaman " + escapeHtml(r.tanggalPinjamFormat) + "</span><strong class='text-emerald-700'>" + escapeHtml(r.nominalFormat) + " (lunas " + escapeHtml(r.tanggalBayarFormat) + ")</strong></div>";
            }).join("")
            : "<p class='text-xs text-gray-400 py-2 text-center'>Belum ada riwayat pelunasan</p>";

        return (
            "<div class='ngx-fu-card" + (terpilih[n.nama] ? " terpilih" : "") + "' data-nama='" + escapeHtml(n.nama) + "'>" +

                "<div class='flex items-start gap-3'>" +

                    "<input type='checkbox' class='ngx-fu-checkbox w-4 h-4 mt-1 rounded border-gray-300 text-kop-700 flex-shrink-0' data-nama='" + escapeHtml(n.nama) + "'" + (terpilih[n.nama] ? " checked" : "") + ">" +

                    "<div class='flex-1 min-w-0'>" +

                        "<div class='flex flex-wrap items-center justify-between gap-2 mb-2'>" +
                            "<div>" +
                                "<p class='text-sm font-bold text-gray-900'>" + escapeHtml(n.nama) + "</p>" +
                                "<p class='text-[11px] text-gray-400'>" + escapeHtml(n.noHp) + (n.email !== "-" ? " &middot; " + escapeHtml(n.email) : "") + "</p>" +
                            "</div>" +
                            statusBadge +
                        "</div>" +

                        "<div class='grid grid-cols-4 gap-2 mb-3 py-2 border-y border-gray-50'>" +
                            "<div class='ngx-fu-stat'><p class='ngx-fu-stat-label'>Transaksi</p><p class='ngx-fu-stat-value'>" + n.totalTransaksi + "x</p></div>" +
                            "<div class='ngx-fu-stat'><p class='ngx-fu-stat-label'>Lunas</p><p class='ngx-fu-stat-value text-emerald-600'>" + n.jumlahLunas + "x</p></div>" +
                            "<div class='ngx-fu-stat'><p class='ngx-fu-stat-label'>Berjalan</p><p class='ngx-fu-stat-value text-amber-600'>" + n.jumlahBerjalan + "x</p></div>" +
                            "<div class='ngx-fu-stat'><p class='ngx-fu-stat-label'>Sisa Tagihan</p><p class='ngx-fu-stat-value text-kop-700'>" + n.totalSisaFormat + "</p></div>" +
                        "</div>" +

                        "<details class='mb-2'>" +
                            "<summary class='text-xs font-semibold text-kop-700 cursor-pointer'>Lihat rincian riwayat</summary>" +
                            "<div class='mt-2 grid sm:grid-cols-2 gap-3'>" +
                                "<div><p class='text-[11px] font-bold text-amber-700 mb-1.5'>📌 Pinjaman Berjalan</p>" + pinjamanBerjalanHtml + "</div>" +
                                "<div><p class='text-[11px] font-bold text-emerald-700 mb-1.5'>✅ Riwayat Pelunasan</p>" + riwayatPelunasanHtml + "</div>" +
                            "</div>" +
                        "</details>" +

                        fuInfo +

                        "<button class='ngx-admin-btn ngx-admin-btn-outline mt-2 ngx-btn-follow-up-satuan' data-nama='" + escapeHtml(n.nama) + "'>" +
                            "<i data-lucide='send' class='w-3.5 h-3.5'></i> Follow Up Nasabah Ini" +
                        "</button>" +

                    "</div>" +

                "</div>" +

            "</div>"
        );

    }

    function renderList() {

        var hasil = terapkanFilter();

        listBox.innerHTML = hasil.map(kartuNasabah).join("");
        emptyState.classList.toggle("hidden", hasil.length > 0);

        if (window.lucide) lucide.createIcons();

        listBox.querySelectorAll(".ngx-fu-checkbox").forEach(function (cb) {
            cb.addEventListener("change", function () {
                var nama = cb.getAttribute("data-nama");
                if (cb.checked) terpilih[nama] = true; else delete terpilih[nama];
                cb.closest(".ngx-fu-card").classList.toggle("terpilih", cb.checked);
                perbaruiTombolMassal();
            });
        });

        listBox.querySelectorAll(".ngx-btn-follow-up-satuan").forEach(function (btn) {
            btn.addEventListener("click", function () {
                bukaModalPreview([btn.getAttribute("data-nama")]);
            });
        });

    }

    function perbaruiTombolMassal() {
        var jumlah = Object.keys(terpilih).length;
        document.getElementById("jumlahDipilihFu").textContent = jumlah;
        var btn = document.getElementById("btnFollowUpMassal");
        btn.disabled = jumlah === 0;
        btn.style.opacity = jumlah === 0 ? ".4" : "1";
    }

    ["cariNasabahFu"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", renderList);
    });
    ["filterStatusFu", "filterFuStatusKirim"].forEach(function (id) {
        document.getElementById(id).addEventListener("change", renderList);
    });

    document.getElementById("checkSemuaFu").addEventListener("change", function (e) {
        var hasil = terapkanFilter();
        hasil.forEach(function (n) {
            if (e.target.checked) terpilih[n.nama] = true; else delete terpilih[n.nama];
        });
        perbaruiTombolMassal();
        renderList();
    });

    /* ===== Modal Preview & Kirim ===== */
    var modal = document.getElementById("modalFollowUp");
    var modalBody = document.getElementById("modalFuBody");

    document.getElementById("btnTutupModalFu").addEventListener("click", function () {
        modal.classList.add("hidden");
    });

    function cariDataNasabah(nama) {
        return dataNasabah.filter(function (n) { return n.nama === nama; })[0];
    }

    function bukaModalPreview(daftarNamaTerpilih) {

        modal.classList.remove("hidden");

        var judul = daftarNamaTerpilih.length === 1
            ? "Kirim follow up ke <strong>" + escapeHtml(daftarNamaTerpilih[0]) + "</strong>?"
            : "Kirim follow up massal ke <strong>" + daftarNamaTerpilih.length + " nasabah</strong> terpilih?";

        modalBody.innerHTML =
            "<p class='text-sm text-gray-600 mb-4'>" + judul + " Email akan terkirim otomatis ke tiap nasabah, dan link WhatsApp akan disiapkan untuk kamu kirim satu per satu.</p>" +
            "<button id='btnKonfirmasiKirimFu' class='ngx-admin-btn w-full justify-center'><i data-lucide='send' class='w-4 h-4'></i> Ya, Proses Sekarang</button>";

        if (window.lucide) lucide.createIcons();

        document.getElementById("btnKonfirmasiKirimFu").addEventListener("click", function () {
            prosesKirim(daftarNamaTerpilih);
        });

    }

    function prosesKirim(daftarNamaTerpilih) {

        modalBody.innerHTML = "<div class='flex flex-col items-center justify-center gap-3 py-8'><div class='ngx-spinner'></div><p class='text-sm text-gray-500'>Memproses & mengirim email...</p></div>";

        var body = new URLSearchParams();
        var token = ngxAdminGetToken();

        var permintaan;

        if (daftarNamaTerpilih.length === 1) {
            body.append("action", "adminKirimFollowUpSatuan");
            body.append("token", token);
            body.append("nama", daftarNamaTerpilih[0]);
            permintaan = fetch(NGX_API_BASE_URL, { method: "POST", body: body }).then(function (res) { return res.json(); })
                .then(function (data) { return { success: data.success, jumlahDiproses: 1, jumlahBerhasil: data.success ? 1 : 0, hasil: [data] }; });
        } else {
            body.append("action", "adminKirimFollowUpMassal");
            body.append("token", token);
            body.append("namaList", JSON.stringify(daftarNamaTerpilih));
            permintaan = fetch(NGX_API_BASE_URL, { method: "POST", body: body }).then(function (res) { return res.json(); });
        }

        permintaan
            .then(function (data) {

                if (!data || data.success !== true) {
                    modalBody.innerHTML = "<p class='text-sm text-red-600'>" + escapeHtml(data && data.message ? data.message : "Gagal memproses follow up.") + "</p>";
                    return;
                }

                var queueHtml = data.hasil.map(function (h) {

                    if (!h.success) {
                        return "<div class='ngx-fu-riwayat-item' style='background:#FEE2E2;'><span>" + escapeHtml(h.message || "Gagal") + "</span></div>";
                    }

                    return (
                        "<div class='ngx-fu-riwayat-item' style='flex-direction:column;align-items:stretch;gap:6px;'>" +
                            "<div class='flex items-center justify-between'>" +
                                "<span class='font-semibold'>" + escapeHtml(h.nama) + "</span>" +
                                "<span class='text-[10px] " + (h.statusEmail === "Berhasil" ? "text-emerald-600" : "text-gray-400") + "'>" + (h.statusEmail === "Berhasil" ? "✓ Email terkirim" : "Email tidak terkirim") + "</span>" +
                            "</div>" +
                            "<a href='" + linkWa(h.noHp, h.pesanWa) + "' target='_blank' rel='noopener' class='ngx-admin-btn ngx-admin-btn-outline' style='justify-content:center;'>" +
                                "<i data-lucide='message-circle' class='w-3.5 h-3.5'></i> Kirim WA ke " + escapeHtml(h.nama) +
                            "</a>" +
                        "</div>"
                    );

                }).join("");

                modalBody.innerHTML =
                    "<p class='text-xs text-gray-500 mb-3'>" + data.jumlahBerhasil + " dari " + data.jumlahDiproses + " nasabah berhasil diproses. Klik tombol di bawah satu per satu untuk kirim WhatsApp-nya:</p>" +
                    "<div class='space-y-2 max-h-[50vh] overflow-y-auto'>" + queueHtml + "</div>";

                if (window.lucide) lucide.createIcons();

                terpilih = {};
                perbaruiTombolMassal();
                muatDataFollowUp(true);

            })
            .catch(function () {
                modalBody.innerHTML = "<p class='text-sm text-red-600'>Gagal terhubung ke server.</p>";
            });

    }

    document.getElementById("btnFollowUpMassal").addEventListener("click", function () {
        if (this.disabled) return;
        bukaModalPreview(Object.keys(terpilih));
    });

    /* ===== Muat data ===== */
    function muatDataFollowUp(tanpaLoading) {

        var token = ngxAdminGetToken();

        if (!tanpaLoading) {
            loadingBox.classList.remove("hidden");
            errorBox.classList.add("hidden");
            content.classList.add("hidden");
        }

        fetch(NGX_API_BASE_URL + "?action=adminGetFollowUpNasabahList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                dataNasabah = data.nasabah || [];
                renderList();

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    var retryBtn = document.getElementById("pageRetryBtn");
    if (retryBtn) retryBtn.addEventListener("click", function () { muatDataFollowUp(); });

    ngxAdminCekSesi(function () { muatDataFollowUp(); });

})();
