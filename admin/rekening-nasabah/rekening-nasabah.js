(function () {

    var tabelKoperasi = null;
    var tabelPenugasan = null;
    var dataRekKoperasiSaatIni = [];
    var dataPenugasanSaatIni = [];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* =========================================================
       BAGIAN 1 — REKENING KOPERASI (daftar tujuan transfer)
       ========================================================= */
    var modalKop = document.getElementById("modalRekKoperasi");
    var modalKopTitle = document.getElementById("modalRekKoperasiTitle");
    var modalKopError = document.getElementById("modalRekKoperasiError");
    var formKop = document.getElementById("formRekKoperasi");
    var btnTambahKop = document.getElementById("btnTambahRekKoperasi");
    var btnBatalKop = document.getElementById("btnBatalRekKoperasi");
    var btnCloseKop = document.getElementById("modalRekKoperasiClose");
    var btnSimpanKop = document.getElementById("btnSimpanRekKoperasi");

    var fKopRowNumber = document.getElementById("rekKoperasiRowNumber");
    var fKopNamaBank = document.getElementById("rekKoperasiNamaBank");
    var fKopNoRekening = document.getElementById("rekKoperasiNoRekening");
    var fKopAtasNama = document.getElementById("rekKoperasiAtasNama");
    var fKopKeterangan = document.getElementById("rekKoperasiKeterangan");
    var fKopStatus = document.getElementById("rekKoperasiStatus");

    function bukaModalKop(mode, data) {
        modalKopError.classList.add("hidden");
        formKop.reset();

        if (mode === "edit" && data) {
            modalKopTitle.textContent = "Edit Rekening Koperasi";
            fKopRowNumber.value = data.rowNumber;
            fKopNamaBank.value = data.namaBank === "-" ? "" : data.namaBank;
            fKopNoRekening.value = data.noRekening === "-" ? "" : data.noRekening;
            fKopAtasNama.value = data.atasNama === "-" ? "" : data.atasNama;
            fKopKeterangan.value = data.keterangan === "-" ? "" : data.keterangan;
            fKopStatus.value = data.statusAktif;
        } else {
            modalKopTitle.textContent = "Tambah Rekening Koperasi";
            fKopRowNumber.value = "";
        }

        modalKop.classList.remove("hidden");
    }

    function tutupModalKop() { modalKop.classList.add("hidden"); }

    btnTambahKop.addEventListener("click", function () { bukaModalKop("tambah"); });
    btnBatalKop.addEventListener("click", tutupModalKop);
    btnCloseKop.addEventListener("click", tutupModalKop);

    formKop.addEventListener("submit", function (e) {

        e.preventDefault();
        modalKopError.classList.add("hidden");

        var namaBank = fKopNamaBank.value.trim();
        var noRekening = fKopNoRekening.value.trim();
        var atasNama = fKopAtasNama.value.trim();

        if (!namaBank || !noRekening || !atasNama) {
            modalKopError.textContent = "Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi.";
            modalKopError.classList.remove("hidden");
            return;
        }

        btnSimpanKop.disabled = true;
        btnSimpanKop.textContent = "Menyimpan...";

        var body = new URLSearchParams();
        body.append("action", "adminSaveRekeningKoperasi");
        body.append("token", ngxAdminGetToken());
        body.append("rowNumber", fKopRowNumber.value);
        body.append("namaBank", namaBank);
        body.append("noRekening", noRekening);
        body.append("atasNama", atasNama);
        body.append("keterangan", fKopKeterangan.value.trim());
        body.append("statusAktif", fKopStatus.value);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                btnSimpanKop.disabled = false;
                btnSimpanKop.textContent = "Simpan";

                if (!data || data.success !== true) {
                    modalKopError.textContent = data && data.message ? data.message : "Gagal menyimpan data.";
                    modalKopError.classList.remove("hidden");
                    return;
                }

                tutupModalKop();
                muatDataRekKoperasi();

                if (window.Swal) Swal.fire({ title: "Berhasil", text: "Rekening koperasi tersimpan.", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });

            })
            .catch(function () {
                btnSimpanKop.disabled = false;
                btnSimpanKop.textContent = "Simpan";
                modalKopError.textContent = "Gagal terhubung ke server.";
                modalKopError.classList.remove("hidden");
            });

    });

    function hapusRekKoperasi(rowNumber, namaBank) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeleteRekeningKoperasi");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumber);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus data.", "error");
                        return;
                    }

                    muatDataRekKoperasi();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus rekening ini?",
                text: "Rekening " + namaBank + " akan dihapus. Nasabah yang ditugaskan ke rekening ini otomatis balik ke rekening default.",
                icon: "warning", showCancelButton: true,
                confirmButtonText: "Ya, Hapus", cancelButtonText: "Batal", confirmButtonColor: "#DC2626"
            }).then(function (result) { if (result.isConfirmed) lanjutkan(); });
        } else if (confirm("Hapus rekening " + namaBank + "?")) {
            lanjutkan();
        }

    }

    function renderTabelKop(daftar) {

        if (tabelKoperasi) tabelKoperasi.destroy();

        var tbody = document.querySelector("#tabelRekKoperasi tbody");

        tbody.innerHTML = daftar.map(function (r) {

            var badgeStatus = r.statusAktif === "Aktif" ? "ngx-badge-lunas" : "ngx-badge-belum";

            return (
                "<tr>" +
                    "<td class='font-mono text-xs text-gray-500'>" + escapeHtml(r.idRekening) + "</td>" +
                    "<td class='font-semibold'>" + escapeHtml(r.namaBank) + "</td>" +
                    "<td class='font-mono'>" + escapeHtml(r.noRekening) + "</td>" +
                    "<td>" + escapeHtml(r.atasNama) + "</td>" +
                    "<td class='text-xs text-gray-500'>" + escapeHtml(r.keterangan) + "</td>" +
                    "<td><span class='" + badgeStatus + " text-[10px] font-bold px-2 py-1 rounded-full'>" + escapeHtml(r.statusAktif) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-kop' data-row='" + r.rowNumber + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-kop' data-row='" + r.rowNumber + "' data-bank='" + escapeHtml(r.namaBank) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabelKoperasi = $("#tabelRekKoperasi").DataTable({
            pageLength: 10, searching: false, lengthChange: false,
            language: { info: "_START_-_END_ dari _TOTAL_ data", paginate: { previous: "\u2039", next: "\u203a" }, zeroRecords: "Tidak ada data ditemukan", emptyTable: "Belum ada rekening koperasi ditambahkan" }
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-edit-kop").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var rowNumber = btn.getAttribute("data-row");
                var data = dataRekKoperasiSaatIni.filter(function (r) { return String(r.rowNumber) === String(rowNumber); })[0];
                if (data) bukaModalKop("edit", data);
            });
        });

        document.querySelectorAll(".btn-hapus-kop").forEach(function (btn) {
            btn.addEventListener("click", function () { hapusRekKoperasi(btn.getAttribute("data-row"), btn.getAttribute("data-bank")); });
        });

    }

    function isiDropdownRekeningKoperasi() {

        var select = document.getElementById("rekeningIdRekening");
        if (!select) return;

        var opsiPilih = '<option value="" disabled selected>Pilih rekening koperasi</option>';

        var opsiRekening = dataRekKoperasiSaatIni
            .filter(function (r) { return r.statusAktif === "Aktif"; })
            .map(function (r) {
                return '<option value="' + escapeHtml(r.idRekening) + '">' + escapeHtml(r.namaBank) + " \u00b7 " + escapeHtml(r.noRekening) + " (" + escapeHtml(r.atasNama) + ")</option>";
            }).join("");

        select.innerHTML = opsiPilih + opsiRekening;

    }

    function muatDataRekKoperasi() {

        var token = ngxAdminGetToken();

        return fetch(NGX_API_BASE_URL + "?action=adminGetRekeningKoperasiList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    return;
                }

                dataRekKoperasiSaatIni = data.rekening;
                renderTabelKop(dataRekKoperasiSaatIni);
                isiDropdownRekeningKoperasi();

            });

    }

    /* =========================================================
       BAGIAN 2 — PENUGASAN NASABAH -> REKENING KOPERASI
       ========================================================= */
    var modal = document.getElementById("modalRekening");
    var modalTitle = document.getElementById("modalRekeningTitle");
    var modalError = document.getElementById("modalRekeningError");
    var form = document.getElementById("formRekening");
    var btnTambah = document.getElementById("btnTambah");
    var btnBatal = document.getElementById("btnBatalRekening");
    var btnClose = document.getElementById("modalRekeningClose");
    var btnSimpan = document.getElementById("btnSimpanRekening");

    var fRowNumber = document.getElementById("rekeningRowNumber");
    var fNama = document.getElementById("rekeningNama");
    var fIdRekening = document.getElementById("rekeningIdRekening");

    function bukaModal(mode, data) {

        modalError.classList.add("hidden");
        form.reset();
        isiDropdownRekeningKoperasi();

        if (dataRekKoperasiSaatIni.filter(function (r) { return r.statusAktif === "Aktif"; }).length === 0) {
            modalError.textContent = "Belum ada Rekening Koperasi aktif. Tambahkan dulu di kartu \"Rekening Koperasi\" di atas.";
            modalError.classList.remove("hidden");
        }

        if (mode === "edit" && data) {
            modalTitle.textContent = "Edit Penugasan Rekening";
            fRowNumber.value = data.rowNumber;
            fNama.value = data.nama;
            fIdRekening.value = data.idRekening;
        } else {
            modalTitle.textContent = "Tetapkan Rekening untuk Nasabah";
            fRowNumber.value = "";
        }

        modal.classList.remove("hidden");

    }

    function tutupModal() { modal.classList.add("hidden"); }

    btnTambah.addEventListener("click", function () { bukaModal("tambah"); });
    btnBatal.addEventListener("click", tutupModal);
    btnClose.addEventListener("click", tutupModal);

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        modalError.classList.add("hidden");

        var nama = fNama.value.trim();
        var idRekening = fIdRekening.value;

        if (!nama) {
            modalError.textContent = "Nama nasabah wajib diisi.";
            modalError.classList.remove("hidden");
            return;
        }

        if (!idRekening) {
            modalError.textContent = "Rekening koperasi wajib dipilih.";
            modalError.classList.remove("hidden");
            return;
        }

        btnSimpan.disabled = true;
        btnSimpan.textContent = "Menyimpan...";

        var body = new URLSearchParams();
        body.append("action", "adminSaveRekeningNasabah");
        body.append("token", ngxAdminGetToken());
        body.append("rowNumber", fRowNumber.value);
        body.append("nama", nama);
        body.append("idRekening", idRekening);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";

                if (!data || data.success !== true) {
                    modalError.textContent = data && data.message ? data.message : "Gagal menyimpan data.";
                    modalError.classList.remove("hidden");
                    return;
                }

                tutupModal();
                muatDataRekening();

                if (window.Swal) {
                    Swal.fire({
                        title: "Berhasil",
                        text: data.diupdate ? "Nasabah ini sudah ada, penugasannya diperbarui." : "Penugasan rekening tersimpan.",
                        icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false
                    });
                }

            })
            .catch(function () {
                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server.";
                modalError.classList.remove("hidden");
            });

    });

    function hapusRekening(rowNumber, nama) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeleteRekeningNasabah");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumber);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus data.", "error");
                        return;
                    }

                    muatDataRekening();
                    if (window.Swal) Swal.fire({ title: "Terhapus", text: nama + " kembali pakai rekening default.", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus penugasan ini?",
                text: nama + " akan kembali memakai rekening koperasi default.",
                icon: "warning", showCancelButton: true,
                confirmButtonText: "Ya, Hapus", cancelButtonText: "Batal", confirmButtonColor: "#DC2626"
            }).then(function (result) { if (result.isConfirmed) lanjutkan(); });
        } else if (confirm("Hapus penugasan " + nama + "?")) {
            lanjutkan();
        }

    }

    function renderTabel(daftar) {

        if (tabelPenugasan) tabelPenugasan.destroy();

        var tbody = document.querySelector("#tabelRekening tbody");

        tbody.innerHTML = daftar.map(function (r) {
            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(r.nama) + "</td>" +
                    "<td>" + escapeHtml(r.namaBank) + " <span class='text-[10px] text-gray-400 font-mono'>(" + escapeHtml(r.idRekening) + ")</span></td>" +
                    "<td class='font-mono'>" + escapeHtml(r.noRekening) + "</td>" +
                    "<td>" + escapeHtml(r.atasNama) + "</td>" +
                    "<td class='text-xs text-gray-500'>" + escapeHtml(r.tanggalFormat) + "<br><span class='text-gray-400'>oleh " + escapeHtml(r.ditetapkanOleh) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-rekening' data-row='" + r.rowNumber + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-rekening' data-row='" + r.rowNumber + "' data-nama='" + escapeHtml(r.nama) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );
        }).join("");

        tabelPenugasan = $("#tabelRekening").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:", lengthMenu: "Tampilkan _MENU_ data", info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" }, zeroRecords: "Tidak ada data ditemukan", emptyTable: "Belum ada nasabah ditugaskan"
            }
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-edit-rekening").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var rowNumber = btn.getAttribute("data-row");
                var data = dataPenugasanSaatIni.filter(function (r) { return String(r.rowNumber) === String(rowNumber); })[0];
                if (data) bukaModal("edit", data);
            });
        });

        document.querySelectorAll(".btn-hapus-rekening").forEach(function (btn) {
            btn.addEventListener("click", function () { hapusRekening(btn.getAttribute("data-row"), btn.getAttribute("data-nama")); });
        });

    }

    function muatDataRekening() {

        var token = ngxAdminGetToken();

        return fetch(NGX_API_BASE_URL + "?action=adminGetRekeningNasabahList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                    return;
                }

                dataPenugasanSaatIni = data.rekening;
                renderTabel(dataPenugasanSaatIni);

            });

    }

    /* =========================================================
       MUAT SEMUA DATA SEKALIGUS SAAT HALAMAN DIBUKA
       ========================================================= */
    function muatSemuaData() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        // Rekening Koperasi dimuat DULUAN (penugasan butuh daftar ini buat dropdown)
        muatDataRekKoperasi()
            .then(function () { return muatDataRekening(); })
            .then(function () {
                loadingBox.classList.add("hidden");
                content.classList.remove("hidden");
            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatSemuaData);

    ngxAdminCekSesi(function () {
        muatSemuaData();
    });

})();
