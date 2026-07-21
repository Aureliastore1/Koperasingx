(function () {

    var tabel = null;
    var dataAnggotaSaatIni = [];

    var modal = document.getElementById("modalAnggota");
    var modalTitle = document.getElementById("modalAnggotaTitle");
    var modalError = document.getElementById("modalAnggotaError");
    var form = document.getElementById("formAnggota");
    var btnTambah = document.getElementById("btnTambah");
    var btnBatal = document.getElementById("btnBatalAnggota");
    var btnClose = document.getElementById("modalAnggotaClose");
    var btnSimpan = document.getElementById("btnSimpanAnggota");

    var fId = document.getElementById("anggotaId");
    var fNama = document.getElementById("anggotaNama");
    var fNoHp = document.getElementById("anggotaNoHp");
    var fEmail = document.getElementById("anggotaEmail");
    var fGrup = document.getElementById("anggotaGrup");
    var fStatus = document.getElementById("anggotaStatus");

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function bukaModal(mode, data) {
        modalError.classList.add("hidden");
        form.reset();

        if (mode === "edit" && data) {
            modalTitle.textContent = "Edit Anggota";
            fId.value = data.id;
            fNama.value = data.nama;
            fNoHp.value = data.noHp === "-" ? "" : data.noHp;
            fEmail.value = data.email === "-" ? "" : data.email;
            fGrup.value = (data.grup === "-" || !data.grup) ? "UMUM" : data.grup;
            fStatus.value = data.statusAktif;
        } else {
            modalTitle.textContent = "Tambah Anggota";
            fId.value = "";
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

        if (!nama) {
            modalError.textContent = "Nama wajib diisi.";
            modalError.classList.remove("hidden");
            return;
        }

        btnSimpan.disabled = true;
        btnSimpan.textContent = "Menyimpan...";

        var body = new URLSearchParams();
        body.append("action", "adminSaveAnggota");
        body.append("token", ngxAdminGetToken());
        body.append("id", fId.value);
        body.append("nama", nama);
        body.append("noHp", fNoHp.value.trim());
        body.append("email", fEmail.value.trim());
        body.append("grup", fGrup.value);
        body.append("statusAktif", fStatus.value);

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
                muatDataAnggota();

                if (window.Swal) {
                    Swal.fire({ title: "Berhasil", text: "Data anggota tersimpan.", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });
                }

            })
            .catch(function () {
                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server.";
                modalError.classList.remove("hidden");
            });

    });

    function hapusAnggota(id, nama) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeleteAnggota");
            body.append("token", ngxAdminGetToken());
            body.append("id", id);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus data.", "error");
                        return;
                    }

                    muatDataAnggota();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus anggota ini?",
                text: nama + " akan dihapus permanen dari data.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#DC2626"
            }).then(function (result) {
                if (result.isConfirmed) lanjutkan();
            });
        } else if (confirm("Hapus anggota " + nama + "?")) {
            lanjutkan();
        }

    }

    function renderTabel(daftar) {

        if (tabel) {
            tabel.destroy();
        }

        var tbody = document.querySelector("#tabelAnggota tbody");

        tbody.innerHTML = daftar.map(function (a) {

            var badgeStatus = a.statusAktif === "Aktif" ? "ngx-badge-lunas" : "ngx-badge-belum";

            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(a.nama) + "</td>" +
                    "<td>" + escapeHtml(a.noHp) + "</td>" +
                    "<td>" + escapeHtml(a.email) + "</td>" +
                    "<td>" + escapeHtml(a.grup) + "</td>" +
                    "<td>" + escapeHtml(a.tanggalBergabung) + "</td>" +
                    "<td><span class='" + badgeStatus + " text-[10px] font-bold px-2 py-1 rounded-full'>" + escapeHtml(a.statusAktif) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-anggota' data-id='" + escapeHtml(a.id) + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-anggota' data-id='" + escapeHtml(a.id) + "' data-nama='" + escapeHtml(a.nama) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabel = $("#tabelAnggota").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" },
                zeroRecords: "Tidak ada data ditemukan",
                emptyTable: "Belum ada data anggota"
            }
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-edit-anggota").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-id");
                var data = null;
                for (var i = 0; i < dataAnggotaSaatIni.length; i++) {
                    if (String(dataAnggotaSaatIni[i].id) === String(id)) { data = dataAnggotaSaatIni[i]; break; }
                }
                if (data) bukaModal("edit", data);
            });
        });

        document.querySelectorAll(".btn-hapus-anggota").forEach(function (btn) {
            btn.addEventListener("click", function () {
                hapusAnggota(btn.getAttribute("data-id"), btn.getAttribute("data-nama"));
            });
        });

    }

    var filterGrup = document.getElementById("filterGrup");
    filterGrup.addEventListener("change", function () {
        var nilai = filterGrup.value;
        var hasil = nilai ? dataAnggotaSaatIni.filter(function (a) { return a.grup === nilai; }) : dataAnggotaSaatIni;
        renderTabel(hasil);
    });

    function muatDataAnggota() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetAnggotaList&token=" + encodeURIComponent(token))
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

                dataAnggotaSaatIni = data.anggota;
                filterGrup.value = "";
                renderTabel(dataAnggotaSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataAnggota);

    document.getElementById("btnExportExcel").addEventListener("click", function () {
        var ws = XLSX.utils.json_to_sheet(dataAnggotaSaatIni.map(function (a) {
            return { Nama: a.nama, "No HP": a.noHp, Email: a.email, Grup: a.grup, "Tanggal Bergabung": a.tanggalBergabung, Status: a.statusAktif };
        }));
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data Anggota");
        XLSX.writeFile(wb, "Data-Anggota-KAS-NGX.xlsx");
    });

    document.getElementById("btnExportPdf").addEventListener("click", function () {
        var doc = new window.jspdf.jsPDF();
        doc.setFontSize(14);
        doc.text("Data Anggota - KAS NGX", 14, 15);
        doc.autoTable({
            startY: 22,
            head: [["Nama", "No HP", "Email", "Grup", "Bergabung", "Status"]],
            body: dataAnggotaSaatIni.map(function (a) { return [a.nama, a.noHp, a.email, a.grup, a.tanggalBergabung, a.statusAktif]; }),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [15, 118, 110] }
        });
        doc.save("Data-Anggota-KAS-NGX.pdf");
    });

    ngxAdminCekSesi(function () {
        muatDataAnggota();
    });

})();
