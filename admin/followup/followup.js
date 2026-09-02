(function () {

    var loadingBox = document.getElementById("pageLoading");
    var errorBox = document.getElementById("pageError");
    var errorText = document.getElementById("pageErrorText");
    var content = document.getElementById("pageContent");
    var tbody = document.getElementById("tbodyFu");
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

    /* ===== Kartu ringkasan atas ===== */
    function renderRingkasan() {

        var totalTagihan = 0, totalLunas = 0, totalSisaSemua = 0;

        dataNasabah.forEach(function (n) {
            if (n.statusKeseluruhan === "MASIH ADA TAGIHAN") totalTagihan++; else totalLunas++;
            totalSisaSemua += n.totalSisa;
        });

        document.getElementById("fuStatTotal").textContent = dataNasabah.length;
        document.getElementById("fuStatTagihan").textContent = totalTagihan;
        document.getElementById("fuStatLunas").textContent = totalLunas;
        document.getElementById("fuStatSisa").textContent = "Rp " + Math.round(totalSisaSemua).toLocaleString("id-ID");

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

    function baris(n) {

        var statusBadge = n.statusKeseluruhan === "LUNAS"
            ? "<span class='ngx-badge-mini ngx-badge-hijau2'>LUNAS</span>"
            : "<span class='ngx-badge-mini ngx-badge-oranye2'>ADA TAGIHAN</span>";

        var fuInfo = n.followUpTerakhir
            ? escapeHtml(n.followUpTerakhir.waktuFormat) + "<br><span class='text-gray-400'>" + escapeHtml(n.followUpTerakhir.channel) + "</span>"
            : "<span class='text-gray-300'>Belum pernah</span>";

        return (
            "<tr data-nama='" + escapeHtml(n.nama) + "'>" +
                "<td><input type='checkbox' class='ngx-fu-checkbox w-4 h-4 rounded border-gray-300 text-kop-700' data-nama='" + escapeHtml(n.nama) + "'" + (terpilih[n.nama] ? " checked" : "") + "></td>" +
                "<td>" +
                    "<p class='font-semibold text-gray-800'>" + escapeHtml(n.nama) + "</p>" +
                    "<p class='text-[11px] text-gray-400'>" + escapeHtml(n.noHp) + "</p>" +
                "</td>" +
                "<td class='text-xs'>" + n.totalTransaksi + "x total &middot; <span class='text-emerald-600'>" + n.jumlahLunas + " lunas</span> &middot; <span class='text-amber-600'>" + n.jumlahBerjalan + " jalan</span></td>" +
                "<td class='font-bold text-kop-700'>" + n.totalSisaFormat + "</td>" +
                "<td>" + statusBadge + "</td>" +
                "<td class='text-[11px] text-gray-500'>" + fuInfo + "</td>" +
                "<td class='whitespace-nowrap'>" +
                    "<button class='ngx-admin-btn-icon ngx-btn-detail-fu' data-nama='" + escapeHtml(n.nama) + "' title='Lihat Riwayat'><i data-lucide='eye' class='w-3.5 h-3.5'></i></button> " +
                    "<button class='ngx-admin-btn-icon ngx-btn-unduh-fu' data-nama='" + escapeHtml(n.nama) + "' title='Unduh Laporan'><i data-lucide='file-down' class='w-3.5 h-3.5'></i></button> " +
                    "<button class='ngx-admin-btn-icon ngx-btn-kirim-fu' data-nama='" + escapeHtml(n.nama) + "' title='Follow Up'><i data-lucide='send' class='w-3.5 h-3.5'></i></button>" +
                "</td>" +
            "</tr>"
        );

    }

    function renderTabel() {

        var hasil = terapkanFilter();

        tbody.innerHTML = hasil.map(baris).join("");
        emptyState.classList.toggle("hidden", hasil.length > 0);

        if (window.lucide) lucide.createIcons();

        tbody.querySelectorAll(".ngx-fu-checkbox").forEach(function (cb) {
            cb.addEventListener("change", function () {
                var nama = cb.getAttribute("data-nama");
                if (cb.checked) terpilih[nama] = true; else delete terpilih[nama];
                perbaruiTombolMassal();
            });
        });

        tbody.querySelectorAll(".ngx-btn-detail-fu").forEach(function (btn) {
            btn.addEventListener("click", function () { tampilkanDetail(btn.getAttribute("data-nama")); });
        });

        tbody.querySelectorAll(".ngx-btn-kirim-fu").forEach(function (btn) {
            btn.addEventListener("click", function () { konfirmasiKirim([btn.getAttribute("data-nama")]); });
        });

        tbody.querySelectorAll(".ngx-btn-unduh-fu").forEach(function (btn) {
            btn.addEventListener("click", function () { pilihFormatUnduh(btn.getAttribute("data-nama")); });
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
        document.getElementById(id).addEventListener("input", renderTabel);
    });
    ["filterStatusFu", "filterFuStatusKirim"].forEach(function (id) {
        document.getElementById(id).addEventListener("change", renderTabel);
    });

    document.getElementById("checkSemuaFu").addEventListener("change", function (e) {
        var hasil = terapkanFilter();
        hasil.forEach(function (n) {
            if (e.target.checked) terpilih[n.nama] = true; else delete terpilih[n.nama];
        });
        perbaruiTombolMassal();
        renderTabel();
    });

    function cariDataNasabah(nama) {
        return dataNasabah.filter(function (n) { return n.nama === nama; })[0];
    }

    /* ===== Detail riwayat — SweetAlert2 ===== */
    function tampilkanDetail(nama) {

        var n = cariDataNasabah(nama);
        if (!n || !window.Swal) return;

        var pinjamanBerjalanHtml = n.pinjamanBerjalan.length > 0
            ? n.pinjamanBerjalan.map(function (p) {
                return "<div class='ngx-fu-riwayat-item'><span>Pinjaman " + escapeHtml(p.tanggalFormat) + "</span><strong style='color:#B45309;'>" + escapeHtml(p.sisaFormat) + "</strong></div>";
            }).join("")
            : "<p class='text-xs text-gray-400 py-2 text-center'>Tidak ada pinjaman berjalan</p>";

        var riwayatPelunasanHtml = n.riwayatPelunasan.length > 0
            ? n.riwayatPelunasan.map(function (r) {
                return "<div class='ngx-fu-riwayat-item'><span>Pinjaman " + escapeHtml(r.tanggalPinjamFormat) + "</span><strong style='color:#047857;'>" + escapeHtml(r.nominalFormat) + " (lunas " + escapeHtml(r.tanggalBayarFormat) + ")</strong></div>";
            }).join("")
            : "<p class='text-xs text-gray-400 py-2 text-center'>Belum ada riwayat pelunasan</p>";

        Swal.fire({
            title: n.nama,
            html:
                "<div style='text-align:left;'>" +
                    "<p style='font-size:11px;color:#9CA3AF;margin-bottom:12px;'>" + escapeHtml(n.noHp) + (n.email !== "-" ? " &middot; " + escapeHtml(n.email) : "") + "</p>" +
                    "<p style='font-size:11px;font-weight:700;color:#B45309;margin-bottom:6px;'>📌 PINJAMAN MASIH BERJALAN</p>" +
                    pinjamanBerjalanHtml +
                    "<p style='font-size:11px;font-weight:700;color:#047857;margin:14px 0 6px 0;'>✅ RIWAYAT PELUNASAN</p>" +
                    riwayatPelunasanHtml +
                "</div>",
            confirmButtonText: "Tutup",
            confirmButtonColor: "#0F766E",
            width: 460
        });

    }

    /* ===== Konfirmasi & kirim — SweetAlert2 ===== */
    function konfirmasiKirim(daftarNamaTerpilih) {

        if (!window.Swal) return;

        var judul = daftarNamaTerpilih.length === 1
            ? "Kirim follow up ke " + daftarNamaTerpilih[0] + "?"
            : "Kirim follow up massal ke " + daftarNamaTerpilih.length + " nasabah?";

        Swal.fire({
            title: judul,
            text: "Email akan terkirim otomatis ke tiap nasabah, dan link WhatsApp akan disiapkan untuk kamu kirim satu per satu.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Ya, Proses Sekarang",
            cancelButtonText: "Batal",
            confirmButtonColor: "#0F766E"
        }).then(function (hasil) {
            if (hasil.isConfirmed) prosesKirim(daftarNamaTerpilih);
        });

    }

    function prosesKirim(daftarNamaTerpilih) {

        Swal.fire({ title: "Memproses & mengirim email...", didOpen: function () { Swal.showLoading(); }, allowOutsideClick: false });

        var body = new URLSearchParams();
        var token = ngxAdminGetToken();
        var permintaan;

        if (daftarNamaTerpilih.length === 1) {
            body.append("action", "adminKirimFollowUpSatuan");
            body.append("token", token);
            body.append("nama", daftarNamaTerpilih[0]);
            permintaan = fetch(NGX_API_BASE_URL, { method: "POST", body: body }).then(function (res) { return res.json(); })
                .then(function (data) { return { success: data.success, message: data.message, jumlahDiproses: 1, jumlahBerhasil: data.success ? 1 : 0, hasil: [data] }; });
        } else {
            body.append("action", "adminKirimFollowUpMassal");
            body.append("token", token);
            body.append("namaList", JSON.stringify(daftarNamaTerpilih));
            permintaan = fetch(NGX_API_BASE_URL, { method: "POST", body: body }).then(function (res) { return res.json(); });
        }

        permintaan
            .then(function (data) {

                if (!data || data.success !== true) {
                    Swal.fire("Gagal", data && data.message ? data.message : "Gagal memproses follow up.", "error");
                    return;
                }

                var queueHtml = data.hasil.map(function (h) {

                    if (!h.success) {
                        return "<div class='ngx-fu-riwayat-item' style='background:#FEE2E2;'><span>" + escapeHtml(h.message || "Gagal") + "</span></div>";
                    }

                    return (
                        "<div style='border:1px solid #F3F4F6;border-radius:10px;padding:10px;margin-bottom:8px;text-align:left;'>" +
                            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;'>" +
                                "<span style='font-weight:700;font-size:12.5px;'>" + escapeHtml(h.nama) + "</span>" +
                                "<span style='font-size:10px;color:" + (h.statusEmail === "Berhasil" ? "#059669" : "#9CA3AF") + ";'>" + (h.statusEmail === "Berhasil" ? "✓ Email terkirim" : "Email tidak terkirim") + "</span>" +
                            "</div>" +
                            "<a href='" + linkWa(h.noHp, h.pesanWa) + "' target='_blank' rel='noopener' style='display:flex;align-items:center;justify-content:center;gap:6px;background:#F0FDFA;color:#0F766E;font-size:12px;font-weight:700;padding:8px;border-radius:8px;text-decoration:none;'>" +
                                "💬 Kirim WA ke " + escapeHtml(h.nama) +
                            "</a>" +
                        "</div>"
                    );

                }).join("");

                Swal.fire({
                    title: data.jumlahBerhasil + " dari " + data.jumlahDiproses + " berhasil diproses",
                    html: "<div style='max-height:50vh;overflow-y:auto;'>" + queueHtml + "</div><p style='font-size:11px;color:#9CA3AF;margin-top:8px;'>Klik tiap tombol WA untuk kirim satu per satu.</p>",
                    confirmButtonText: "Selesai",
                    confirmButtonColor: "#0F766E",
                    width: 460
                });

                terpilih = {};
                perbaruiTombolMassal();
                muatDataFollowUp(true);

            })
            .catch(function () {
                Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
            });

    }

    /* ===== Unduh Laporan (PDF / Word) ===== */
    function pilihFormatUnduh(nama) {

        if (!window.Swal) return;

        Swal.fire({
            title: "Unduh Laporan " + nama,
            text: "Pilih format dokumen yang mau diunduh:",
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "📄 PDF",
            denyButtonText: "📝 Word (.docx)",
            cancelButtonText: "Batal",
            confirmButtonColor: "#0F766E",
            denyButtonColor: "#2563EB"
        }).then(function (hasil) {
            if (hasil.isConfirmed) unduhLaporan(nama, "pdf");
            else if (hasil.isDenied) unduhLaporan(nama, "docx");
        });

    }

    function unduhLaporan(nama, format) {

        Swal.fire({ title: "Menyiapkan dokumen...", didOpen: function () { Swal.showLoading(); }, allowOutsideClick: false });

        var body = new URLSearchParams();
        body.append("action", "adminUnduhLaporanNasabah");
        body.append("token", ngxAdminGetToken());
        body.append("nama", nama);
        body.append("format", format);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    Swal.fire("Gagal", data && data.message ? data.message : "Gagal membuat laporan.", "error");
                    return;
                }

                var byteChars = atob(data.base64);
                var byteNumbers = new Array(byteChars.length);
                for (var i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                var byteArray = new Uint8Array(byteNumbers);
                var blob = new Blob([byteArray], { type: data.mimeType });

                var url = window.URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = data.namaFile;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                Swal.close();

            })
            .catch(function () {
                Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
            });

    }

    document.getElementById("btnFollowUpMassal").addEventListener("click", function () {
        if (this.disabled) return;
        konfirmasiKirim(Object.keys(terpilih));
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
                renderRingkasan();
                renderTabel();

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
