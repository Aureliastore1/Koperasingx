(function () {

    var tabel = null;
    var dataFollowUpSaatIni = [];

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

    function bukaWhatsapp(f) {

        if (!f.noHp || f.noHp === "-") {
            if (window.Swal) Swal.fire("Nomor tidak ada", "Nomor HP anggota ini tidak tercatat.", "warning");
            return;
        }

        var pesan =
            "Halo Bapak/Ibu " + f.nama + "\n" +
            "Kami mengingatkan bahwa pinjaman Anda sebesar " + f.nominalFormat + "\n" +
            "Sisa tagihan\n" + f.sisaFormat + "\n" +
            "Jatuh tempo\n" + f.jatuhTempoFormat + "\n" +
            "Terima kasih.";

        window.open("https://wa.me/" + formatNomorWa(f.noHp) + "?text=" + encodeURIComponent(pesan), "_blank");

    }

    function tandaiFollowUp(rowNumber, aksi) {

        var body = new URLSearchParams();
        body.append("action", "adminTandaiFollowUp");
        body.append("token", ngxAdminGetToken());
        body.append("rowNumber", rowNumber);
        body.append("aksi", aksi);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal memperbarui status.", "error");
                    return;
                }

                muatDataFollowUp();

            })
            .catch(function () {
                if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
            });

    }

    function badgeJatuhTempo(status) {
        if (status === "LEWAT JATUH TEMPO") return "ngx-badge-jt-lewat";
        if (status === "JATUH TEMPO HARI INI") return "ngx-badge-jt-hariini";
        if (status === "JATUH TEMPO BESOK") return "ngx-badge-jt-besok";
        return "ngx-badge-jt-aman";
    }

    function renderTabel(daftar) {

        if (tabel) tabel.destroy();

        var tbody = document.querySelector("#tabelFollowUp tbody");

        tbody.innerHTML = daftar.map(function (f) {

            var badgeFollowUp = f.sudahFollowUp
                ? "<span class='ngx-badge-lunas text-[10px] font-bold px-2 py-1 rounded-full'>Sudah Follow Up</span>"
                : "<span class='ngx-badge-belum text-[10px] font-bold px-2 py-1 rounded-full'>Belum Follow Up</span>";

            var tombolFollowUp = f.sudahFollowUp
                ? "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-batal-fu' data-row='" + f.rowNumber + "'>Batalkan</button>"
                : "<button class='ngx-admin-btn ngx-admin-btn-success ngx-admin-btn-sm btn-tandai-fu' data-row='" + f.rowNumber + "'><i data-lucide='check' class='w-3 h-3'></i> Tandai</button>";

            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(f.nama) + "<div class='text-[10px] text-gray-400'>" + escapeHtml(f.noHp) + "</div></td>" +
                    "<td>" + f.sisaFormat + "</td>" +
                    "<td><span class='" + badgeJatuhTempo(f.statusJatuhTempo) + " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'>" + escapeHtml(f.statusJatuhTempo) + "</span></td>" +
                    "<td>" + badgeFollowUp + (f.catatanFollowUp ? "<div class='text-[10px] text-gray-400 mt-1'>" + escapeHtml(f.catatanFollowUp) + "</div>" : "") + "</td>" +
                    "<td>" +
                        "<div class='flex gap-1.5 flex-wrap'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-whatsapp ngx-admin-btn-sm btn-wa-fu' data-row='" + f.rowNumber + "'><i data-lucide='message-circle' class='w-3 h-3'></i></button>" +
                            tombolFollowUp +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabel = $("#tabelFollowUp").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:", lengthMenu: "Tampilkan _MENU_ data", info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" }, zeroRecords: "Tidak ada data ditemukan", emptyTable: "Tidak ada pinjaman yang perlu di-follow up \ud83c\udf89"
            }
        });

        if (window.lucide) lucide.createIcons();

        function cariData(rowNumber) {
            for (var i = 0; i < dataFollowUpSaatIni.length; i++) {
                if (String(dataFollowUpSaatIni[i].rowNumber) === String(rowNumber)) return dataFollowUpSaatIni[i];
            }
            return null;
        }

        document.querySelectorAll(".btn-wa-fu").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var f = cariData(btn.getAttribute("data-row"));
                if (f) bukaWhatsapp(f);
            });
        });

        document.querySelectorAll(".btn-tandai-fu").forEach(function (btn) {
            btn.addEventListener("click", function () { tandaiFollowUp(btn.getAttribute("data-row"), "tandai"); });
        });

        document.querySelectorAll(".btn-batal-fu").forEach(function (btn) {
            btn.addEventListener("click", function () { tandaiFollowUp(btn.getAttribute("data-row"), "batal"); });
        });

    }

    function terapkanFilter() {

        var followUp = document.getElementById("filterFollowUp").value;
        var jt = document.getElementById("filterJatuhTempoFu").value;

        var hasil = dataFollowUpSaatIni.filter(function (f) {
            if (followUp === "belum" && f.sudahFollowUp) return false;
            if (followUp === "sudah" && !f.sudahFollowUp) return false;
            if (jt && f.statusJatuhTempo !== jt) return false;
            return true;
        });

        renderTabel(hasil);

    }

    document.getElementById("filterFollowUp").addEventListener("change", terapkanFilter);
    document.getElementById("filterJatuhTempoFu").addEventListener("change", terapkanFilter);

    function muatDataFollowUp() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetFollowUpList&token=" + encodeURIComponent(token))
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

                dataFollowUpSaatIni = data.followup;
                document.getElementById("filterFollowUp").value = "";
                document.getElementById("filterJatuhTempoFu").value = "";
                renderTabel(dataFollowUpSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataFollowUp);

    ngxAdminCekSesi(function () {
        muatDataFollowUp();
    });

})();
