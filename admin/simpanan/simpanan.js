(function () {

    var tabel = null;
    var dataSimpananSaatIni = [];

    var modal = document.getElementById("modalSimpanan");
    var modalTitle = document.getElementById("modalSimpananTitle");
    var modalError = document.getElementById("modalSimpananError");
    var form = document.getElementById("formSimpanan");
    var btnTambah = document.getElementById("btnTambahSimpanan");
    var btnBatal = document.getElementById("btnBatalSimpanan");
    var btnClose = document.getElementById("modalSimpananClose");
    var btnSimpan = document.getElementById("btnSimpanSimpanan");

    var fId = document.getElementById("smId");
    var fNama = document.getElementById("smNama");
    var fPantherGroup = document.getElementById("smPantherGroup");
    var fJenis = document.getElementById("smJenis");
    var fNominal = document.getElementById("smNominal");
    var fKeterangan = document.getElementById("smKeterangan");
    var fStatus = document.getElementById("smStatus");

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    fNominal.addEventListener("input", function () {
        var angka = fNominal.value.replace(/[^0-9]/g, "");
        fNominal.value = angka ? Number(angka).toLocaleString("id-ID") : "";
    });

    function ambilNominalAngka() {
        return parseFloat(fNominal.value.replace(/[^0-9]/g, "")) || 0;
    }

    function bukaModal(mode, data) {

        modalError.classList.add("hidden");
        form.reset();

        if (mode === "edit" && data) {
            modalTitle.textContent = "Edit Simpanan";
            fId.value = data.id;
            fNama.value = data.nama;
            fPantherGroup.value = (data.pantherGroup === "-" || !data.pantherGroup) ? "UMUM" : data.pantherGroup;
            fJenis.value = data.jenisSimpanan === "-" ? "Simpanan Sukarela" : data.jenisSimpanan;
            fNominal.value = Number(data.nominal).toLocaleString("id-ID");
            fKeterangan.value = data.keterangan === "-" ? "" : data.keterangan;
            fStatus.value = data.status;
        } else {
            modalTitle.textContent = "Catat Simpanan";
            fId.value = "";
            fStatus.value = "Disetujui";
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
        var nominal = ambilNominalAngka();

        if (!nama) {
            modalError.textContent = "Nama wajib diisi.";
            modalError.classList.remove("hidden");
            return;
        }
        if (!nominal || nominal <= 0) {
            modalError.textContent = "Nominal tidak valid.";
            modalError.classList.remove("hidden");
            return;
        }

        btnSimpan.disabled = true;
        btnSimpan.textContent = "Menyimpan...";

        var isEdit = !!fId.value;

        var body = new URLSearchParams();
        body.append("action", isEdit ? "adminUpdateSimpanan" : "adminTambahSimpananManual");
        body.append("token", ngxAdminGetToken());
        if (isEdit) body.append("id", fId.value);
        body.append("nama", nama);
        body.append("pantherGroup", fPantherGroup.value);
        body.append("jenisSimpanan", fJenis.value);
        body.append("nominal", nominal);
        body.append("keterangan", fKeterangan.value.trim());
        body.append("status", fStatus.value);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";

                if (!data || data.success !== true) {
                    modalError.textContent = data && data.message ? data.message : "Gagal menyimpan.";
                    modalError.classList.remove("hidden");
                    return;
                }

                tutupModal();
                muatDataSimpanan();

                if (window.Swal) Swal.fire({ title: "Berhasil", icon: "success", confirmButtonColor: "#0F766E", timer: 1600, showConfirmButton: false });

            })
            .catch(function () {
                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server.";
                modalError.classList.remove("hidden");
            });

    });

    function ubahStatus(id, status, nama) {

        var body = new URLSearchParams();
        body.append("action", "adminSetStatusSimpanan");
        body.append("token", ngxAdminGetToken());
        body.append("id", id);
        body.append("status", status);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal mengubah status.", "error");
                    return;
                }

                muatDataSimpanan();
                if (window.Swal) Swal.fire({ title: status, text: "Simpanan " + nama + " ditandai " + status.toLowerCase() + ".", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });

            })
            .catch(function () {
                if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
            });

    }

    function hapusSimpanan(id, nama) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeleteSimpanan");
            body.append("token", ngxAdminGetToken());
            body.append("id", id);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus.", "error");
                        return;
                    }

                    muatDataSimpanan();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus simpanan ini?",
                text: "Data simpanan " + nama + " akan dihapus permanen.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#DC2626"
            }).then(function (result) { if (result.isConfirmed) lanjutkan(); });
        } else if (confirm("Hapus simpanan " + nama + "?")) {
            lanjutkan();
        }

    }

    function badgeStatus(status) {
        if (status === "Disetujui") return "ngx-badge-lunas";
        if (status === "Ditolak") return "ngx-badge-jt-lewat";
        return "ngx-badge-belum";
    }

    function renderTabel(daftar) {

        if (tabel) tabel.destroy();

        var tbody = document.querySelector("#tabelSimpanan tbody");

        tbody.innerHTML = daftar.map(function (s) {

            var buktiLink = s.linkBukti ? "<a href='" + escapeHtml(s.linkBukti) + "' target='_blank' rel='noopener' class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm'><i data-lucide='image' class='w-3 h-3'></i></a>" : "";
            var tombolAksiCepat = s.status === "Menunggu Verifikasi"
                ? "<button class='ngx-admin-btn ngx-admin-btn-success ngx-admin-btn-sm btn-setuju' data-id='" + escapeHtml(s.id) + "' data-nama='" + escapeHtml(s.nama) + "'><i data-lucide='check' class='w-3 h-3'></i></button>" +
                  "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-tolak' data-id='" + escapeHtml(s.id) + "' data-nama='" + escapeHtml(s.nama) + "'><i data-lucide='x' class='w-3 h-3'></i></button>"
                : "";

            return (
                "<tr>" +
                    "<td>" + escapeHtml(s.tanggal) + "</td>" +
                    "<td class='font-semibold'>" + escapeHtml(s.nama) + "</td>" +
                    "<td>" + escapeHtml(s.jenisSimpanan) + "</td>" +
                    "<td>" + s.nominalFormat + "</td>" +
                    "<td>" + escapeHtml(s.metodePembayaran) + "</td>" +
                    "<td><span class='" + badgeStatus(s.status) + " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'>" + escapeHtml(s.status) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5 flex-wrap'>" +
                            tombolAksiCepat +
                            buktiLink +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-simpanan' data-id='" + escapeHtml(s.id) + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-simpanan' data-id='" + escapeHtml(s.id) + "' data-nama='" + escapeHtml(s.nama) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabel = $("#tabelSimpanan").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:", lengthMenu: "Tampilkan _MENU_ data", info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" }, zeroRecords: "Tidak ada data ditemukan", emptyTable: "Belum ada data simpanan"
            }
        });

        if (window.lucide) lucide.createIcons();

        function cariData(id) {
            for (var i = 0; i < dataSimpananSaatIni.length; i++) {
                if (String(dataSimpananSaatIni[i].id) === String(id)) return dataSimpananSaatIni[i];
            }
            return null;
        }

        document.querySelectorAll(".btn-setuju").forEach(function (btn) {
            btn.addEventListener("click", function () { ubahStatus(btn.getAttribute("data-id"), "Disetujui", btn.getAttribute("data-nama")); });
        });
        document.querySelectorAll(".btn-tolak").forEach(function (btn) {
            btn.addEventListener("click", function () { ubahStatus(btn.getAttribute("data-id"), "Ditolak", btn.getAttribute("data-nama")); });
        });
        document.querySelectorAll(".btn-edit-simpanan").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var data = cariData(btn.getAttribute("data-id"));
                if (data) bukaModal("edit", data);
            });
        });
        document.querySelectorAll(".btn-hapus-simpanan").forEach(function (btn) {
            btn.addEventListener("click", function () { hapusSimpanan(btn.getAttribute("data-id"), btn.getAttribute("data-nama")); });
        });

    }

    function terapkanFilter() {

        var jenis = document.getElementById("filterJenis").value;
        var status = document.getElementById("filterStatusSimpanan").value;

        var hasil = dataSimpananSaatIni.filter(function (s) {
            if (jenis && s.jenisSimpanan !== jenis) return false;
            if (status && s.status !== status) return false;
            return true;
        });

        renderTabel(hasil);

    }

    document.getElementById("filterJenis").addEventListener("change", terapkanFilter);
    document.getElementById("filterStatusSimpanan").addEventListener("change", terapkanFilter);

    function muatDataSimpanan() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetSimpananList&token=" + encodeURIComponent(token))
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

                dataSimpananSaatIni = data.simpanan;
                document.getElementById("filterJenis").value = "";
                document.getElementById("filterStatusSimpanan").value = "";
                renderTabel(dataSimpananSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataSimpanan);

    ngxAdminCekSesi(function () {
        muatDataSimpanan();
    });

})();
