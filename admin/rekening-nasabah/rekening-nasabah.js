(function () {

    var tabel = null;
    var dataRekeningSaatIni = [];

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
    var fNamaBank = document.getElementById("rekeningNamaBank");
    var fNoRekening = document.getElementById("rekeningNoRekening");
    var fAtasNama = document.getElementById("rekeningAtasNama");

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function bukaModal(mode, data) {
        modalError.classList.add("hidden");
        form.reset();

        if (mode === "edit" && data) {
            modalTitle.textContent = "Edit Rekening Nasabah";
            fRowNumber.value = data.rowNumber;
            fNama.value = data.nama;
            fNamaBank.value = data.namaBank === "-" ? "" : data.namaBank;
            fNoRekening.value = data.noRekening === "-" ? "" : data.noRekening;
            fAtasNama.value = data.atasNama === "-" ? "" : data.atasNama;
        } else {
            modalTitle.textContent = "Tambah Rekening Nasabah";
            fRowNumber.value = "";
        }

        modal.classList.remove("hidden");
    }

    function tutupModal() {
        modal.classList.add("hidden");
    }

    btnTambah.addEventListener("click", function () { bukaModal("tambah"); });
    btnBatal.addEventListener("click", tutupModal);
    btnClose.addEventListener("click", tutupModal);

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        modalError.classList.add("hidden");

        var nama = fNama.value.trim();
        var namaBank = fNamaBank.value.trim();
        var noRekening = fNoRekening.value.trim();
        var atasNama = fAtasNama.value.trim();

        if (!nama || !namaBank || !noRekening || !atasNama) {
            modalError.textContent = "Semua field wajib diisi.";
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
        body.append("namaBank", namaBank);
        body.append("noRekening", noRekening);
        body.append("atasNama", atasNama);

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
                        text: data.diupdate ? "Rekening nasabah ini sudah ada, datanya ter-update." : "Data rekening nasabah tersimpan.",
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
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus rekening ini?",
                text: "Data rekening " + nama + " akan dihapus permanen.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#DC2626"
            }).then(function (result) {
                if (result.isConfirmed) lanjutkan();
            });
        } else if (confirm("Hapus rekening " + nama + "?")) {
            lanjutkan();
        }

    }

    function renderTabel(daftar) {

        if (tabel) tabel.destroy();

        var tbody = document.querySelector("#tabelRekening tbody");

        tbody.innerHTML = daftar.map(function (r) {
            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(r.nama) + "</td>" +
                    "<td>" + escapeHtml(r.namaBank) + "</td>" +
                    "<td class='font-mono'>" + escapeHtml(r.noRekening) + "</td>" +
                    "<td>" + escapeHtml(r.atasNama) + "</td>" +
                    "<td class='text-xs text-gray-500'>" + escapeHtml(r.tanggalFormat) + "<br><span class='text-gray-400'>oleh " + escapeHtml(r.didaftarkanOleh) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-rekening' data-row='" + r.rowNumber + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-rekening' data-row='" + r.rowNumber + "' data-nama='" + escapeHtml(r.nama) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );
        }).join("");

        tabel = $("#tabelRekening").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" },
                zeroRecords: "Tidak ada data ditemukan",
                emptyTable: "Belum ada data rekening nasabah terdaftar"
            }
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-edit-rekening").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var rowNumber = btn.getAttribute("data-row");
                var data = null;
                for (var i = 0; i < dataRekeningSaatIni.length; i++) {
                    if (String(dataRekeningSaatIni[i].rowNumber) === String(rowNumber)) { data = dataRekeningSaatIni[i]; break; }
                }
                if (data) bukaModal("edit", data);
            });
        });

        document.querySelectorAll(".btn-hapus-rekening").forEach(function (btn) {
            btn.addEventListener("click", function () {
                hapusRekening(btn.getAttribute("data-row"), btn.getAttribute("data-nama"));
            });
        });

    }

    function muatDataRekening() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetRekeningNasabahList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;

                }

                dataRekeningSaatIni = data.rekening;
                renderTabel(dataRekeningSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataRekening);

    ngxAdminCekSesi(function () {
        muatDataRekening();
    });

})();
