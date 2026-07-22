(function () {

    var dataPinjaman = [];
    var quickFilter = ""; // dari klik kartu ringkasan

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function formatRupiah(n) { return "Rp " + (Number(n) || 0).toLocaleString("id-ID"); }

    function formatNomorWa(nomor) {
        var bersih = String(nomor || "").replace(/[^0-9]/g, "");
        if (bersih.indexOf("0") === 0) bersih = "62" + bersih.substring(1);
        else if (bersih.indexOf("62") !== 0) bersih = "62" + bersih;
        return bersih;
    }

    function bukaWaLangsung(noHp, pesan, rowNumberUntukLog) {
        if (!noHp || noHp === "-") { if (window.Swal) Swal.fire("Nomor tidak ada", "Nomor HP tidak tercatat.", "warning"); return; }
        window.open("https://wa.me/" + formatNomorWa(noHp) + "?text=" + encodeURIComponent(pesan), "_blank");

        if (rowNumberUntukLog) {
            var body = new URLSearchParams();
            body.append("action", "adminCatatLogWa");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumberUntukLog);
            body.append("ringkasan", pesan.split("\n")[0]);
            fetch(NGX_API_BASE_URL, { method: "POST", body: body }).catch(function () {});
        }
    }

    /* ============ EDIT MODAL (fitur lama, tampilan disegarkan) ============ */
    var modal = document.getElementById("modalPinjaman");
    var modalError = document.getElementById("modalPinjamanError");
    var form = document.getElementById("formPinjaman");
    var btnBatal = document.getElementById("btnBatalPinjaman");
    var btnClose = document.getElementById("modalPinjamanClose");
    var btnSimpan = document.getElementById("btnSimpanPinjaman");

    var fRowNumber = document.getElementById("pjRowNumber");
    var fNama = document.getElementById("pjNama");
    var fAlasan = document.getElementById("pjAlasan");
    var fNamaToko = document.getElementById("pjNamaToko");
    var fGrupPartner = document.getElementById("pjGrupPartner");
    var fJatuhTempo = document.getElementById("pjJatuhTempo");
    var fNoHp = document.getElementById("pjNoHp");
    var fEmail = document.getElementById("pjEmail");
    var fAtasNama = document.getElementById("pjAtasNama");
    var fNoRekening = document.getElementById("pjNoRekening");
    var fNamaBank = document.getElementById("pjNamaBank");
    var fNominal = document.getElementById("pjNominal");
    var fPelunasan = document.getElementById("pjPelunasan");

    function bukaModalEdit(p) {
        modalError.classList.add("hidden");
        form.reset();
        fRowNumber.value = p.rowNumber;
        fNama.value = p.nama;
        fAlasan.value = p.alasan === "-" ? "" : p.alasan;
        fNamaToko.value = p.namaToko === "-" ? "" : p.namaToko;
        fGrupPartner.value = p.grupPartner === "-" ? "" : p.grupPartner;
        fJatuhTempo.value = p.jatuhTempoRaw || "";
        fNoHp.value = p.noHp === "-" ? "" : p.noHp;
        fEmail.value = p.email === "-" ? "" : p.email;
        fAtasNama.value = p.atasNama === "-" ? "" : p.atasNama;
        fNoRekening.value = p.noRekening === "-" ? "" : p.noRekening;
        fNamaBank.value = p.namaBank === "-" ? "" : p.namaBank;
        fNominal.value = p.nominal;
        fPelunasan.value = p.pelunasan;
        modal.classList.remove("hidden");
    }

    function tutupModal() { modal.classList.add("hidden"); }
    btnBatal.addEventListener("click", tutupModal);
    btnClose.addEventListener("click", tutupModal);

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        modalError.classList.add("hidden");
        if (!fNama.value.trim()) { modalError.textContent = "Nama wajib diisi."; modalError.classList.remove("hidden"); return; }

        btnSimpan.disabled = true; btnSimpan.textContent = "Menyimpan...";

        var body = new URLSearchParams();
        body.append("action", "adminUpdatePinjaman");
        body.append("token", ngxAdminGetToken());
        body.append("rowNumber", fRowNumber.value);
        body.append("nama", fNama.value.trim());
        body.append("alasan", fAlasan.value.trim());
        body.append("namaToko", fNamaToko.value.trim());
        body.append("grupPartner", fGrupPartner.value.trim());
        body.append("jatuhTempo", fJatuhTempo.value);
        body.append("noHp", fNoHp.value.trim());
        body.append("email", fEmail.value.trim());
        body.append("atasNama", fAtasNama.value.trim());
        body.append("noRekening", fNoRekening.value.trim());
        body.append("namaBank", fNamaBank.value.trim());
        body.append("nominal", fNominal.value);
        body.append("pelunasan", fPelunasan.value);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                btnSimpan.disabled = false; btnSimpan.textContent = "Simpan";
                if (!data || data.success !== true) { modalError.textContent = data && data.message ? data.message : "Gagal menyimpan."; modalError.classList.remove("hidden"); return; }
                tutupModal();
                muatDataPinjaman();
                if (window.Swal) Swal.fire({ title: "Berhasil", text: "Data pinjaman diperbarui.", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });
            })
            .catch(function () {
                btnSimpan.disabled = false; btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server."; modalError.classList.remove("hidden");
            });
    });

    /* ============ DETAIL MODAL + PROGRESS WORKFLOW ============ */
    var modalDetail = document.getElementById("modalDetail");
    document.getElementById("modalDetailClose").addEventListener("click", function () { modalDetail.classList.add("hidden"); });
    document.getElementById("btnTutupDetail").addEventListener("click", function () { modalDetail.classList.add("hidden"); });

    function bukaModalDetail(p) {

        var langkah = [
            { label: "Pengajuan", selesai: true },
            { label: "Verifikasi", selesai: p.statusVerifikasi !== "Menunggu Verifikasi" },
            { label: "Disetujui", selesai: p.statusVerifikasi === "Disetujui" },
            { label: "Dana Dicairkan", selesai: !!p.danaDicairkan },
            { label: "Angsuran Berjalan", selesai: p.pelunasan > 0 && p.status === "BELUM LUNAS" },
            { label: "Lunas", selesai: p.status === "LUNAS" }
        ];

        document.getElementById("progressSteps").innerHTML = langkah.map(function (l, idx) {
            return "<div class='ngx-progress-step" + (l.selesai ? " selesai" : "") + "'>" +
                "<div class='dot'>" + (l.selesai ? "\u2713" : (idx + 1)) + "</div>" +
                "<div class='lbl2'>" + l.label + "</div></div>";
        }).join("");

        document.getElementById("detailInfoBox").innerHTML =
            baris("Nama", p.nama) + baris("Alasan", p.alasan) + baris("Nama Toko", p.namaToko) + baris("Grup Partner", p.grupPartner) +
            baris("Nomor HP", p.noHp) + baris("Email", p.email) + baris("Atas Nama Rek", p.atasNama) + baris("No Rekening", p.noRekening) +
            baris("Bank", p.namaBank) + baris("Nominal", p.nominalFormat) + baris("Sudah Dibayar", p.pelunasanFormat) + baris("Sisa", p.sisaFormat) +
            baris("Jatuh Tempo", p.jatuhTempoFormat) + baris("Tanggal Pengajuan", p.timestampFormat) + baris("Diproses Oleh", p.diprosesOleh);

        modalDetail.classList.remove("hidden");
        if (window.lucide) lucide.createIcons();

    }

    function baris(label, value) {
        return "<div class='flex justify-between border-b border-gray-100 py-1.5'><span class='text-gray-500'>" + label + "</span><span class='font-semibold text-gray-800 text-right'>" + escapeHtml(value) + "</span></div>";
    }

    /* ============ AKSI: VERIFIKASI ============ */
    function verifikasiPinjaman(p, keputusan) {

        var lanjut = function () {

            var body = new URLSearchParams();
            body.append("action", "adminVerifikasiPinjaman");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", p.rowNumber);
            body.append("keputusan", keputusan);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) { if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal memproses.", "error"); return; }

                    muatDataPinjaman();

                    if (window.Swal) {
                        Swal.fire({
                            title: keputusan + "!",
                            text: "Email otomatis sudah dikirim ke " + p.nama + ". Kirim WhatsApp juga?",
                            icon: "success",
                            showCancelButton: true,
                            confirmButtonText: "Kirim WhatsApp",
                            cancelButtonText: "Tidak",
                            confirmButtonColor: "#16A34A"
                        }).then(function (r) {
                            if (r.isConfirmed) bukaWaLangsung(data.noHp, data.pesanWa, p.rowNumber);
                        });
                    }

                });

        };

        if (window.Swal) {
            Swal.fire({
                title: keputusan + " pengajuan " + p.nama + "?",
                icon: "question", showCancelButton: true, confirmButtonText: "Ya, " + keputusan, cancelButtonText: "Batal", confirmButtonColor: "#0F766E"
            }).then(function (r) { if (r.isConfirmed) lanjut(); });
        } else if (confirm(keputusan + " pengajuan " + p.nama + "?")) { lanjut(); }

    }

    /* ============ AKSI: CAIRKAN DANA (dengan upload bukti transfer) ============ */
    function cairkanDana(p) {

        if (!window.Swal) { alert("SweetAlert tidak tersedia."); return; }

        Swal.fire({
            title: "Cairkan dana untuk " + p.nama + "?",
            html: "<p style='font-size:13px;color:#6B7280;margin-bottom:10px;'>Nominal: <strong>" + p.nominalFormat + "</strong></p>" +
                  "<input type='file' id='swalFotoBuktiCair' accept='image/*' class='swal2-file'>" +
                  "<p style='font-size:11px;color:#9CA3AF;margin-top:6px;'>Upload bukti transfer pencairan (opsional, bisa diupload nanti juga di halaman Detail).</p>",
            showCancelButton: true,
            confirmButtonText: "Ya, Cairkan",
            cancelButtonText: "Batal",
            confirmButtonColor: "#0F766E",
            preConfirm: function () {
                var fileInput = document.getElementById("swalFotoBuktiCair");
                var file = fileInput && fileInput.files && fileInput.files[0];
                if (!file) return { file: null };
                return new Promise(function (resolve) {
                    var reader = new FileReader();
                    reader.onload = function () { resolve({ file: file, base64: reader.result.split(",")[1] }); };
                    reader.readAsDataURL(file);
                });
            }
        }).then(function (result) {

            if (!result.isConfirmed) return;

            var body = new URLSearchParams();
            body.append("action", "adminCairkanDana");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", p.rowNumber);

            if (result.value && result.value.file) {
                body.append("fotoBase64", result.value.base64);
                body.append("fotoMime", result.value.file.type || "image/jpeg");
                body.append("fotoNama", result.value.file.name);
            }

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) { Swal.fire("Gagal", data && data.message ? data.message : "Gagal memproses.", "error"); return; }

                    muatDataPinjaman();

                    Swal.fire({
                        title: "Dana Dicairkan!", text: "Email otomatis terkirim. Kirim WhatsApp juga?",
                        icon: "success", showCancelButton: true, confirmButtonText: "Kirim WhatsApp", cancelButtonText: "Tidak", confirmButtonColor: "#16A34A"
                    }).then(function (r) { if (r.isConfirmed) bukaWaLangsung(data.noHp, data.pesanWa, p.rowNumber); });

                })
                .catch(function () { Swal.fire("Gagal", "Gagal terhubung ke server.", "error"); });

        });

    }

    /* ============ AKSI: TANDAI LUNAS ============ */
    function tandaiLunas(p) {

        var lanjut = function () {

            var body = new URLSearchParams();
            body.append("action", "adminTandaiLunas");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", p.rowNumber);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (!data || data.success !== true) { if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal memproses.", "error"); return; }
                    if (window.Swal) {
                        Swal.fire({
                            title: "Notifikasi Lunas Terkirim", text: "Email sudah dikirim. Kirim WhatsApp juga?",
                            icon: "success", showCancelButton: true, confirmButtonText: "Kirim WhatsApp", cancelButtonText: "Tidak", confirmButtonColor: "#16A34A"
                        }).then(function (r) { if (r.isConfirmed) bukaWaLangsung(data.noHp, data.pesanWa, p.rowNumber); });
                    }
                });

        };

        if (window.Swal) {
            Swal.fire({ title: "Kirim ulang notifikasi LUNAS untuk " + p.nama + "?", icon: "question", showCancelButton: true, confirmButtonText: "Ya, Kirim", cancelButtonText: "Batal", confirmButtonColor: "#0F766E" })
                .then(function (r) { if (r.isConfirmed) lanjut(); });
        } else if (confirm("Kirim notifikasi lunas untuk " + p.nama + "?")) { lanjut(); }

    }

    /* ============ HAPUS ============ */
    function hapusPinjaman(p) {

        var lanjut = function () {
            var body = new URLSearchParams();
            body.append("action", "adminDeletePinjaman");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", p.rowNumber);
            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (!data || data.success !== true) { if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus.", "error"); return; }
                    muatDataPinjaman();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });
                });
        };

        if (window.Swal) {
            Swal.fire({ title: "Hapus data pinjaman " + p.nama + "?", icon: "warning", showCancelButton: true, confirmButtonText: "Ya, Hapus", cancelButtonText: "Batal", confirmButtonColor: "#DC2626" })
                .then(function (r) { if (r.isConfirmed) lanjut(); });
        } else if (confirm("Hapus pinjaman " + p.nama + "?")) { lanjut(); }

    }

    /* ============ BADGE HELPERS ============ */
    function badgeVerifikasi(v) {
        if (v === "Disetujui") return "ngx-badge-hijau2";
        if (v === "Ditolak") return "ngx-badge-merah2";
        return "ngx-badge-kuning2";
    }
    function badgeDanaCair(sudah) { return sudah ? "ngx-badge-hijau2" : "ngx-badge-abu2"; }
    function badgeStatusPinjaman(s) { return s === "LUNAS" ? "ngx-badge-hijau2" : "ngx-badge-oranye2"; }
    function badgeJatuhTempo(s) {
        if (s === "LEWAT JATUH TEMPO") return "ngx-badge-merah2";
        if (s === "JATUH TEMPO HARI INI" || s === "JATUH TEMPO BESOK") return "ngx-badge-kuning2";
        return "ngx-badge-abu2";
    }

    /* ============ RENDER TABEL ============ */
    function cariData(rowNumber) {
        for (var i = 0; i < dataPinjaman.length; i++) if (String(dataPinjaman[i].rowNumber) === String(rowNumber)) return dataPinjaman[i];
        return null;
    }

    function terapkanSemuaFilter() {

        var nama = document.getElementById("filterNamaP").value.trim().toUpperCase();
        var hp = document.getElementById("filterHpP").value.trim();
        var verif = document.getElementById("filterStatusVerifikasiP").value;
        var danaCair = document.getElementById("filterDanaCairP").value;
        var statusP = document.getElementById("filterStatusPinjamanP").value;
        var jt = document.getElementById("filterJatuhTempoP").value;

        return dataPinjaman.filter(function (p) {

            if (nama && p.nama.toUpperCase().indexOf(nama) === -1) return false;
            if (hp && String(p.noHp).indexOf(hp) === -1) return false;
            if (verif && p.statusVerifikasi !== verif) return false;
            if (danaCair === "sudah" && !p.danaDicairkan) return false;
            if (danaCair === "belum" && p.danaDicairkan) return false;
            if (statusP && p.status !== statusP) return false;
            if (jt && p.statusJatuhTempo !== jt) return false;

            if (quickFilter === "belumVerifikasi" && p.statusVerifikasi !== "Menunggu Verifikasi") return false;
            if (quickFilter === "sudahVerifikasi" && p.statusVerifikasi !== "Disetujui") return false;
            if (quickFilter === "sudahCair" && !p.danaDicairkan) return false;
            if (quickFilter === "belumLunas" && p.status !== "BELUM LUNAS") return false;
            if (quickFilter === "lunas" && p.status !== "LUNAS") return false;
            if (quickFilter === "jatuhTempoHariIni" && p.statusJatuhTempo !== "JATUH TEMPO HARI INI") return false;
            if (quickFilter === "lewatTempo" && p.statusJatuhTempo !== "LEWAT JATUH TEMPO") return false;

            return true;

        });

    }

    function renderTabel() {

        var hasil = terapkanSemuaFilter();
        var tbody = document.getElementById("tbodyPinjamanV2");
        var emptyState = document.getElementById("emptyStateP");

        tbody.innerHTML = hasil.map(function (p) {

            var sudahCair = !!p.danaDicairkan;

            return "<tr>" +
                "<td class='font-semibold text-kop-700 hover:underline cursor-pointer btn-nama-detail' data-row='" + p.rowNumber + "'>" + escapeHtml(p.nama) + "</td>" +
                "<td>" + p.nominalFormat + "</td>" +
                "<td>" + p.sisaFormat + "</td>" +
                "<td><span class='ngx-badge-mini " + badgeStatusPinjaman(p.status) + "'>" + p.status + "</span></td>" +
                "<td><span class='ngx-badge-mini " + badgeVerifikasi(p.statusVerifikasi) + "'>" + escapeHtml(p.statusVerifikasi) + "</span></td>" +
                "<td><span class='ngx-badge-mini " + badgeDanaCair(sudahCair) + "'>" + (sudahCair ? "Sudah Cair" : "Belum Cair") + "</span></td>" +
                "<td><span class='ngx-badge-mini " + badgeJatuhTempo(p.statusJatuhTempo) + "'>" + escapeHtml(p.jatuhTempoFormat) + "</span></td>" +
                "<td>" + escapeHtml(p.timestampFormat.split(",")[0]) + "</td>" +
                "<td>" + escapeHtml(p.diprosesOleh) + "</td>" +
                "<td><div class='flex gap-1'>" +
                    "<div class='ngx-icon-btn btn-detail' data-row='" + p.rowNumber + "' title='Detail'><i data-lucide='eye' class='w-3.5 h-3.5'></i></div>" +
                    "<div class='ngx-icon-btn btn-edit' data-row='" + p.rowNumber + "' title='Edit'><i data-lucide='pencil' class='w-3.5 h-3.5'></i></div>" +
                    (p.statusVerifikasi === "Menunggu Verifikasi" ? "<div class='ngx-icon-btn btn-verif' data-row='" + p.rowNumber + "' title='Verifikasi'><i data-lucide='check-circle' class='w-3.5 h-3.5'></i></div>" : "") +
                    (p.statusVerifikasi === "Disetujui" && !sudahCair ? "<div class='ngx-icon-btn btn-cair' data-row='" + p.rowNumber + "' title='Cairkan Dana'><i data-lucide='banknote' class='w-3.5 h-3.5'></i></div>" : "") +
                    (p.status === "LUNAS" ? "<div class='ngx-icon-btn btn-lunas' data-row='" + p.rowNumber + "' title='Kirim Notif Lunas'><i data-lucide='party-popper' class='w-3.5 h-3.5'></i></div>" : "") +
                    "<div class='ngx-icon-btn wa btn-wa' data-row='" + p.rowNumber + "' title='WhatsApp'><i data-lucide='message-circle' class='w-3.5 h-3.5'></i></div>" +
                    "<div class='ngx-icon-btn danger btn-hapus' data-row='" + p.rowNumber + "' title='Hapus'><i data-lucide='trash-2' class='w-3.5 h-3.5'></i></div>" +
                "</div></td>" +
            "</tr>";

        }).join("");

        emptyState.classList.toggle("hidden", hasil.length > 0);
        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-nama-detail").forEach(function (b) { b.addEventListener("click", function () { window.location.href = "/admin/pinjaman/detail/?row=" + b.getAttribute("data-row"); }); });
        document.querySelectorAll(".btn-detail").forEach(function (b) { b.addEventListener("click", function () { window.location.href = "/admin/pinjaman/detail/?row=" + b.getAttribute("data-row"); }); });
        document.querySelectorAll(".btn-edit").forEach(function (b) { b.addEventListener("click", function () { bukaModalEdit(cariData(b.getAttribute("data-row"))); }); });
        document.querySelectorAll(".btn-verif").forEach(function (b) { b.addEventListener("click", function () { verifikasiPinjaman(cariData(b.getAttribute("data-row")), "Disetujui"); }); });
        document.querySelectorAll(".btn-cair").forEach(function (b) { b.addEventListener("click", function () { cairkanDana(cariData(b.getAttribute("data-row"))); }); });
        document.querySelectorAll(".btn-lunas").forEach(function (b) { b.addEventListener("click", function () { tandaiLunas(cariData(b.getAttribute("data-row"))); }); });
        document.querySelectorAll(".btn-hapus").forEach(function (b) { b.addEventListener("click", function () { hapusPinjaman(cariData(b.getAttribute("data-row"))); }); });
        document.querySelectorAll(".btn-wa").forEach(function (b) {
            b.addEventListener("click", function () {
                var p = cariData(b.getAttribute("data-row"));
                var pesan = "Terima kasih telah mengajukan pinjaman di Koperasi Simpan Pinjam NGX.\n" +
                    "Data pengajuan Anda telah kami terima dengan rincian:\n" +
                    "Nama : *" + p.nama + "*\n" +
                    "Bank : *" + p.namaBank + "*\n" +
                    "Nomor Rekening : *" + p.noRekening + "*\n" +
                    "Nominal Pengajuan : Rp *" + Number(p.nominal).toLocaleString("id-ID") + "*\n" +
                    "Alasan Kebutuhan : *" + p.alasan + "*\n" +
                    "Status Pengajuan :\n*" + p.statusVerifikasi.toUpperCase() + "*\n" +
                    "Tim kami akan segera melakukan pengecekan data dan menghubungi Anda apabila diperlukan informasi tambahan.\n\n" +
                    "Kepala Koperasi | Trias Mardianto\n" +
                    "Terima kasih atas kepercayaan Anda kepada Koperasi Simpan Pinjam NGX";
                bukaWaLangsung(p.noHp, pesan, p.rowNumber);
            });
        });

    }

    /* ============ DASHBOARD SUMMARY ============ */
    function renderSummary() {

        var total = dataPinjaman.length;
        var belumVerif = dataPinjaman.filter(function (p) { return p.statusVerifikasi === "Menunggu Verifikasi"; }).length;
        var sudahVerif = dataPinjaman.filter(function (p) { return p.statusVerifikasi === "Disetujui"; }).length;
        var sudahCair = dataPinjaman.filter(function (p) { return p.danaDicairkan; }).length;
        var belumLunas = dataPinjaman.filter(function (p) { return p.status === "BELUM LUNAS"; }).length;
        var lunas = dataPinjaman.filter(function (p) { return p.status === "LUNAS"; }).length;
        var jtHariIni = dataPinjaman.filter(function (p) { return p.statusJatuhTempo === "JATUH TEMPO HARI INI"; }).length;
        var lewatTempo = dataPinjaman.filter(function (p) { return p.statusJatuhTempo === "LEWAT JATUH TEMPO"; }).length;

        var totNominal = 0, totPelunasan = 0, totPiutang = 0;
        dataPinjaman.forEach(function (p) { totNominal += p.nominal; totPelunasan += p.pelunasan; totPiutang += p.sisa; });

        document.getElementById("stTotal").textContent = total;
        document.getElementById("stBelumVerif").textContent = belumVerif;
        document.getElementById("stSudahVerif").textContent = sudahVerif;
        document.getElementById("stSudahCair").textContent = sudahCair;
        document.getElementById("stBelumLunas").textContent = belumLunas;
        document.getElementById("stLunas").textContent = lunas;
        document.getElementById("stTotalNominal").textContent = formatRupiah(totNominal);
        document.getElementById("stTotalPiutang").textContent = formatRupiah(totPiutang);
        document.getElementById("stTotalPelunasan").textContent = formatRupiah(totPelunasan);
        document.getElementById("stJTHariIni").textContent = jtHariIni;
        document.getElementById("stLewatTempo").textContent = lewatTempo;

    }

    document.querySelectorAll(".ngx-stat-clickable").forEach(function (card) {
        card.addEventListener("click", function () {
            var f = card.getAttribute("data-filter");
            if (!f) return;
            document.querySelectorAll(".ngx-stat-clickable").forEach(function (c) { c.classList.remove("aktif"); });
            if (quickFilter === f) { quickFilter = ""; } else { quickFilter = f; card.classList.add("aktif"); }
            renderTabel();
        });
    });

    /* ============ FILTER MANUAL ============ */
    ["filterNamaP", "filterHpP", "filterStatusVerifikasiP", "filterDanaCairP", "filterStatusPinjamanP", "filterJatuhTempoP"].forEach(function (id) {
        var el = document.getElementById(id);
        el.addEventListener(el.tagName === "SELECT" ? "change" : "input", renderTabel);
    });

    document.getElementById("btnResetFilterP").addEventListener("click", function () {
        ["filterNamaP", "filterHpP", "filterStatusVerifikasiP", "filterDanaCairP", "filterStatusPinjamanP", "filterJatuhTempoP"].forEach(function (id) { document.getElementById(id).value = ""; });
        quickFilter = "";
        document.querySelectorAll(".ngx-stat-clickable").forEach(function (c) { c.classList.remove("aktif"); });
        renderTabel();
    });

    /* ============ EXPORT ============ */
    document.querySelectorAll(".btn-export-p").forEach(function (btn) {
        btn.addEventListener("click", function () {

            var type = btn.getAttribute("data-type");
            var table = document.getElementById("tabelPinjamanV2");

            if (type === "print") { window.print(); return; }

            if (type === "excel") {
                var wb = XLSX.utils.table_to_book(table, { sheet: "Pinjaman" });
                XLSX.writeFile(wb, "Data-Pinjaman.xlsx");
                return;
            }

            if (type === "csv") {
                var ws = XLSX.utils.table_to_sheet(table);
                var csv = XLSX.utils.sheet_to_csv(ws);
                var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                var link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "Data-Pinjaman.csv";
                link.click();
                return;
            }

            if (type === "copy") {
                var range = document.createRange();
                range.selectNode(table);
                window.getSelection().removeAllRanges();
                window.getSelection().addRange(range);
                document.execCommand("copy");
                window.getSelection().removeAllRanges();
                if (window.Swal) Swal.fire({ title: "Tersalin", icon: "success", timer: 1200, showConfirmButton: false, confirmButtonColor: "#0F766E" });
                return;
            }

            if (type === "pdf") {
                var doc = new window.jspdf.jsPDF("l", "pt", "a4");
                doc.autoTable({ html: "#tabelPinjamanV2", styles: { fontSize: 6 }, headStyles: { fillColor: [15, 118, 110] } });
                doc.save("Data-Pinjaman.pdf");
                return;
            }

        });
    });

    /* ============ MUAT DATA ============ */
    function muatDataPinjaman() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetPinjamanList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                dataPinjaman = data.pinjaman;
                renderSummary();
                renderTabel();

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataPinjaman);

    ngxAdminCekSesi(function () { muatDataPinjaman(); });

})();
