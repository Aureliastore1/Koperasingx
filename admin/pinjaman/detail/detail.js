(function () {

    var params = new URLSearchParams(window.location.search);
    var rowNumber = params.get("row");

    if (!rowNumber) {
        document.getElementById("pageLoading").classList.add("hidden");
        document.getElementById("pageErrorText").textContent = "Parameter data tidak ditemukan. Buka halaman ini dari tombol Detail di Data Pinjaman.";
        document.getElementById("pageError").classList.remove("hidden");
        return;
    }

    var detailData = null;

    var JENIS_DOKUMEN = [
        { key: "KTP", label: "Foto KTP" },
        { key: "Selfie", label: "Foto Selfie" },
        { key: "KK", label: "Kartu Keluarga" },
        { key: "SlipGaji", label: "Slip Gaji" },
        { key: "SuratPendukung", label: "Surat Pendukung" },
        { key: "BuktiTransferPencairan", label: "Bukti Transfer Cair" },
        { key: "DokumenLain", label: "Dokumen Lain" }
    ];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function badgeVerifikasi(v) {
        if (v === "Disetujui") return "ngx-badge-hijau2";
        if (v === "Ditolak") return "ngx-badge-merah2";
        return "ngx-badge-kuning2";
    }

    function baris(label, value) {
        return "<div class='flex justify-between border-b border-gray-100 py-1.5'><span class='text-gray-500'>" + label + "</span><span class='font-semibold text-gray-800 text-right'>" + escapeHtml(value) + "</span></div>";
    }

    function renderDetail(d) {

        document.getElementById("dNama").textContent = d.nama;
        document.getElementById("dTimestamp").textContent = "Diajukan " + d.timestampFormat;

        document.getElementById("dBadgeWrap").innerHTML =
            "<span class='ngx-badge-mini " + (d.status === "LUNAS" ? "ngx-badge-hijau2" : "ngx-badge-oranye2") + "'>" + d.status + "</span>" +
            "<span class='ngx-badge-mini " + badgeVerifikasi(d.statusVerifikasi) + "'>" + escapeHtml(d.statusVerifikasi) + "</span>" +
            "<span class='ngx-badge-mini " + (d.danaDicairkan ? "ngx-badge-hijau2" : "ngx-badge-abu2") + "'>" + (d.danaDicairkan ? "Sudah Cair" : "Belum Cair") + "</span>";

        document.getElementById("dNominal").textContent = d.nominalFormat;
        document.getElementById("dPelunasan").textContent = d.pelunasanFormat;
        document.getElementById("dSisa").textContent = d.sisaFormat;

        var langkah = [
            { label: "Pengajuan", selesai: true },
            { label: "Verifikasi", selesai: d.statusVerifikasi !== "Menunggu Verifikasi" },
            { label: "Disetujui", selesai: d.statusVerifikasi === "Disetujui" },
            { label: "Dana Dicairkan", selesai: !!d.danaDicairkan },
            { label: "Angsuran Berjalan", selesai: d.pelunasan > 0 && d.status === "BELUM LUNAS" },
            { label: "Lunas", selesai: d.status === "LUNAS" }
        ];

        document.getElementById("progressSteps").innerHTML = langkah.map(function (l, idx) {
            return "<div class='ngx-progress-step" + (l.selesai ? " selesai" : "") + "'><div class='dot'>" + (l.selesai ? "\u2713" : (idx + 1)) + "</div><div class='lbl2'>" + l.label + "</div></div>";
        }).join("");

        document.getElementById("dataPribadiBox").innerHTML =
            baris("Alasan", d.alasan) + baris("Nama Toko", d.namaToko) + baris("Grup Partner", d.grupPartner) +
            baris("Nomor HP", d.noHp) + baris("Email", d.email) + baris("Atas Nama Rek", d.atasNama) +
            baris("No Rekening", d.noRekening) + baris("Bank", d.namaBank) + baris("Jatuh Tempo", d.jatuhTempoFormat) +
            baris("Diproses Oleh", d.diprosesOleh);

        var timelineBox = document.getElementById("timelineBox");
        if (!d.timeline || d.timeline.length === 0) {
            timelineBox.innerHTML = "<p class='text-xs text-gray-400 text-center py-6'>Belum ada aktivitas tercatat.</p>";
        } else {
            timelineBox.innerHTML = d.timeline.map(function (t) {
                return "<div class='ngx-riwayat-item'><div class='ngx-riwayat-dot'></div><div class='flex-1 min-w-0'>" +
                    "<p class='text-xs font-semibold text-gray-800'>" + escapeHtml(t.judul) + "</p>" +
                    "<p class='text-[11px] text-gray-400'>" + escapeHtml(t.tanggal) + "</p></div></div>";
            }).join("");
        }

        // Dokumen grid
        document.getElementById("dokumenGrid").innerHTML = JENIS_DOKUMEN.map(function (jd) {

            var url = d.dokumen[jd.key];
            var adaFile = url && url.length > 0;

            return "<div class='border border-gray-100 rounded-xl p-3 text-center'>" +
                "<p class='text-[11px] font-bold text-gray-700 mb-2'>" + jd.label + "</p>" +
                (adaFile
                    ? "<a href='" + escapeHtml(url) + "' target='_blank' rel='noopener' class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm w-full justify-center mb-1'><i data-lucide='eye' class='w-3 h-3'></i> Lihat</a>" +
                      "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm w-full justify-center btn-ganti-dok' data-jenis='" + jd.key + "'>Ganti</button>"
                    : "<button class='ngx-admin-btn ngx-admin-btn-primary ngx-admin-btn-sm w-full justify-center btn-upload-dok' data-jenis='" + jd.key + "'><i data-lucide='upload' class='w-3 h-3'></i> Upload</button>") +
                "</div>";

        }).join("");

        document.getElementById("catatanAdminBox").value = d.catatanAdmin || "";

        // Riwayat pinjaman lain
        var riwayatBox = document.getElementById("riwayatLainBox");
        var riwayatWrap = document.getElementById("riwayatLainWrap");

        if (!d.riwayatLain || d.riwayatLain.length === 0) {
            riwayatWrap.classList.add("hidden");
        } else {
            riwayatWrap.classList.remove("hidden");
            riwayatBox.innerHTML = d.riwayatLain.map(function (r) {
                return "<a href='/admin/pinjaman/detail/?row=" + r.rowNumber + "' class='flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-kop-50 transition text-sm'>" +
                    "<span>" + escapeHtml(r.timestampFormat) + "</span><span class='font-semibold'>" + r.nominalFormat + "</span>" +
                    "<span class='ngx-badge-mini " + (r.status === "LUNAS" ? "ngx-badge-hijau2" : "ngx-badge-oranye2") + "'>" + r.status + "</span></a>";
            }).join("");
        }

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-upload-dok, .btn-ganti-dok").forEach(function (btn) {
            btn.addEventListener("click", function () { mulaiUpload(btn.getAttribute("data-jenis")); });
        });

    }

    var jenisUploadAktif = null;
    var inputFile = document.getElementById("inputFileDokumen");

    function mulaiUpload(jenis) {
        jenisUploadAktif = jenis;
        inputFile.value = "";
        inputFile.click();
    }

    inputFile.addEventListener("change", function () {

        var file = inputFile.files && inputFile.files[0];
        if (!file || !jenisUploadAktif) return;

        if (file.size > 10 * 1024 * 1024) {
            if (window.Swal) Swal.fire("Terlalu Besar", "Ukuran file maksimal 10MB.", "warning");
            return;
        }

        var reader = new FileReader();
        reader.onload = function () {

            var base64 = reader.result.split(",")[1];

            var body = new URLSearchParams();
            body.append("action", "adminUploadDokumenPinjaman");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumber);
            body.append("jenisDokumen", jenisUploadAktif);
            body.append("fileBase64", base64);
            body.append("fileMime", file.type || "image/jpeg");
            body.append("fileNama", file.name);

            if (window.Swal) Swal.fire({ title: "Mengupload...", didOpen: function () { Swal.showLoading(); }, allowOutsideClick: false });

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal upload.", "error");
                        return;
                    }

                    if (window.Swal) Swal.fire({ title: "Berhasil", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });
                    muatDetail();

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };
        reader.readAsDataURL(file);

    });

    document.getElementById("btnSimpanCatatan").addEventListener("click", function () {

        var btn = this;
        var catatan = document.getElementById("catatanAdminBox").value;

        btn.disabled = true;

        var body = new URLSearchParams();
        body.append("action", "adminSimpanCatatanPinjaman");
        body.append("token", ngxAdminGetToken());
        body.append("rowNumber", rowNumber);
        body.append("catatan", catatan);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                btn.disabled = false;
                if (!data || data.success !== true) { if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menyimpan.", "error"); return; }
                if (window.Swal) Swal.fire({ title: "Catatan Tersimpan", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });
            })
            .catch(function () {
                btn.disabled = false;
                if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
            });

    });

    function muatDetail() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetDetailPinjaman&token=" + encodeURIComponent(token) + "&rowNumber=" + encodeURIComponent(rowNumber))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    errorText.textContent = data && data.message ? data.message : "Gagal memuat detail.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                detailData = data;
                renderDetail(detailData);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    ngxAdminCekSesi(function () { muatDetail(); });

})();
