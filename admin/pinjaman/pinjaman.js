(function () {

    var tabel = null;
    var dataPinjamanSaatIni = [];

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

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function formatNomorWa(nomor) {
        var bersih = String(nomor || "").replace(/[^0-9]/g, "");
        if (bersih.indexOf("0") === 0) bersih = "62" + bersih.substring(1);
        else if (bersih.indexOf("62") !== 0) bersih = "62" + bersih;
        return bersih;
    }

    function bukaWhatsapp(p) {

        if (!p.noHp || p.noHp === "-") {
            if (window.Swal) Swal.fire("Nomor tidak ada", "Nomor HP anggota ini tidak tercatat.", "warning");
            return;
        }

        var pesan =
            "Halo Bapak/Ibu " + p.nama + "\n" +
            "Kami mengingatkan bahwa pinjaman Anda sebesar " + p.nominalFormat + "\n" +
            "Sisa tagihan\n" + p.sisaFormat + "\n" +
            "Jatuh tempo\n" + p.jatuhTempoFormat + "\n" +
            "Terima kasih.";

        var url = "https://wa.me/" + formatNomorWa(p.noHp) + "?text=" + encodeURIComponent(pesan);
        window.open(url, "_blank");

    }

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

        if (!fNama.value.trim()) {
            modalError.textContent = "Nama wajib diisi.";
            modalError.classList.remove("hidden");
            return;
        }

        btnSimpan.disabled = true;
        btnSimpan.textContent = "Menyimpan...";

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

                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";

                if (!data || data.success !== true) {
                    modalError.textContent = data && data.message ? data.message : "Gagal menyimpan.";
                    modalError.classList.remove("hidden");
                    return;
                }

                tutupModal();
                muatDataPinjaman();

                if (window.Swal) Swal.fire({ title: "Berhasil", text: "Data pinjaman diperbarui.", icon: "success", confirmButtonColor: "#0F766E", timer: 1800, showConfirmButton: false });

            })
            .catch(function () {
                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server.";
                modalError.classList.remove("hidden");
            });

    });

    function hapusPinjaman(rowNumber, nama) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeletePinjaman");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumber);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus.", "error");
                        return;
                    }

                    muatDataPinjaman();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus data pinjaman ini?",
                text: "Pinjaman " + nama + " akan dihapus permanen.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#DC2626"
            }).then(function (result) {
                if (result.isConfirmed) lanjutkan();
            });
        } else if (confirm("Hapus pinjaman " + nama + "?")) {
            lanjutkan();
        }

    }

    function cairkanDana(rowNumber, nama, nominalFormat) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminCairkanDana");
            body.append("token", ngxAdminGetToken());
            body.append("rowNumber", rowNumber);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal memproses.", "error");
                        return;
                    }

                    muatDataPinjaman();
                    if (window.Swal) Swal.fire({ title: "Dana Dicairkan", text: "Email konfirmasi sudah dikirim ke peminjam (jika email valid).", icon: "success", confirmButtonColor: "#0F766E" });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Cairkan dana untuk " + nama + "?",
                text: "Nominal " + nominalFormat + " akan ditandai sebagai Dana Dicairkan.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Cairkan",
                cancelButtonText: "Batal",
                confirmButtonColor: "#0F766E"
            }).then(function (result) {
                if (result.isConfirmed) lanjutkan();
            });
        } else if (confirm("Cairkan dana untuk " + nama + "?")) {
            lanjutkan();
        }

    }

    function badgeJatuhTempo(status) {
        if (status === "LEWAT JATUH TEMPO") return "ngx-badge-jt-lewat";
        if (status === "JATUH TEMPO HARI INI") return "ngx-badge-jt-hariini";
        if (status === "JATUH TEMPO BESOK") return "ngx-badge-jt-besok";
        return "ngx-badge-jt-aman";
    }

    function renderTabel(daftar) {

        if (tabel) tabel.destroy();

        var tbody = document.querySelector("#tabelPinjaman tbody");

        tbody.innerHTML = daftar.map(function (p) {

            var badgeStatus = p.status === "LUNAS" ? "ngx-badge-lunas" : "ngx-badge-belum";
            var sudahCair = p.danaDicairkan && p.danaDicairkan.length > 0;

            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(p.nama) + "<div class='text-[10px] text-gray-400'>" + escapeHtml(p.timestampFormat) + "</div></td>" +
                    "<td>" + p.nominalFormat + "</td>" +
                    "<td>" + p.sisaFormat + "</td>" +
                    "<td><span class='" + badgeStatus + " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'>" + p.status + "</span></td>" +
                    "<td><span class='" + badgeJatuhTempo(p.statusJatuhTempo) + " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'>" + escapeHtml(p.statusJatuhTempo) + "</span></td>" +
                    "<td>" + (sudahCair ? "<span class='ngx-badge-lunas text-[10px] font-bold px-2 py-1 rounded-full'>Sudah Cair</span>" : "<span class='ngx-badge-belum text-[10px] font-bold px-2 py-1 rounded-full'>Belum</span>") + "</td>" +
                    "<td>" +
                        "<div class='flex gap-1.5 flex-wrap'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-whatsapp ngx-admin-btn-sm btn-wa' data-row='" + p.rowNumber + "'><i data-lucide='message-circle' class='w-3 h-3'></i></button>" +
                            (!sudahCair ? "<button class='ngx-admin-btn ngx-admin-btn-success ngx-admin-btn-sm btn-cair' data-row='" + p.rowNumber + "'><i data-lucide='banknote' class='w-3 h-3'></i></button>" : "") +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-pinjaman' data-row='" + p.rowNumber + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-pinjaman' data-row='" + p.rowNumber + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>" +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabel = $("#tabelPinjaman").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:",
                lengthMenu: "Tampilkan _MENU_ data",
                info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" },
                zeroRecords: "Tidak ada data ditemukan",
                emptyTable: "Belum ada data pinjaman"
            }
        });

        if (window.lucide) lucide.createIcons();

        function cariData(rowNumber) {
            for (var i = 0; i < dataPinjamanSaatIni.length; i++) {
                if (String(dataPinjamanSaatIni[i].rowNumber) === String(rowNumber)) return dataPinjamanSaatIni[i];
            }
            return null;
        }

        document.querySelectorAll(".btn-wa").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var p = cariData(btn.getAttribute("data-row"));
                if (p) bukaWhatsapp(p);
            });
        });

        document.querySelectorAll(".btn-cair").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var p = cariData(btn.getAttribute("data-row"));
                if (p) cairkanDana(p.rowNumber, p.nama, p.nominalFormat);
            });
        });

        document.querySelectorAll(".btn-edit-pinjaman").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var p = cariData(btn.getAttribute("data-row"));
                if (p) bukaModalEdit(p);
            });
        });

        document.querySelectorAll(".btn-hapus-pinjaman").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var p = cariData(btn.getAttribute("data-row"));
                if (p) hapusPinjaman(p.rowNumber, p.nama);
            });
        });

    }

    function terapkanFilter() {

        var status = document.getElementById("filterStatus").value;
        var jt = document.getElementById("filterJatuhTempo").value;

        var hasil = dataPinjamanSaatIni.filter(function (p) {
            if (status && p.status !== status) return false;
            if (jt && p.statusJatuhTempo !== jt) return false;
            return true;
        });

        renderTabel(hasil);

    }

    document.getElementById("filterStatus").addEventListener("change", terapkanFilter);
    document.getElementById("filterJatuhTempo").addEventListener("change", terapkanFilter);

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

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;

                }

                dataPinjamanSaatIni = data.pinjaman;
                document.getElementById("filterStatus").value = "";
                document.getElementById("filterJatuhTempo").value = "";
                renderTabel(dataPinjamanSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataPinjaman);

    ngxAdminCekSesi(function () {
        muatDataPinjaman();
    });

})();
