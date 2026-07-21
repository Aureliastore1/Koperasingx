(function () {

    /* ===== Sesi (implementasi lokal, halaman ini berdiri sendiri pakai Bootstrap) ===== */
    function getToken() { return sessionStorage.getItem("ngxAdminToken"); }
    function logoutLokal() {
        sessionStorage.removeItem("ngxAdminToken");
        sessionStorage.removeItem("ngxAdminUser");
    }

    var token = getToken();
    if (!token) { window.location.href = "/admin/login/"; return; }

    document.getElementById("btnLogout").addEventListener("click", function () {
        var body = new URLSearchParams();
        body.append("action", "adminLogout");
        body.append("token", token);
        fetch(NGX_API_BASE_URL, { method: "POST", body: body }).finally(function () {
            logoutLokal();
            window.location.href = "/admin/login/";
        });
    });

    fetch(NGX_API_BASE_URL + "?action=adminVerifySession&token=" + encodeURIComponent(token))
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (!d || d.success !== true) { logoutLokal(); window.location.href = "/admin/login/"; return; }
            document.getElementById("userNamaBs").textContent = d.user.nama + " (" + d.user.role + ")";
        })
        .catch(function () {});

    /* ===== Helper umum ===== */
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function formatRupiah(angka) {
        return "Rp " + (Number(angka) || 0).toLocaleString("id-ID");
    }

    /* ===== Data mentah (disimpan supaya bisa difilter ulang tanpa fetch lagi) ===== */
    var dataPinjaman = [];
    var dataSimpanan = [];
    var dataJatuhTempo = [];
    var dataAnggota = [];

    var tabelInstances = {};

    function destroyDT(id) {
        if (tabelInstances[id]) { tabelInstances[id].destroy(); tabelInstances[id] = null; }
    }

    /* ===== Filter bersama ===== */
    function ambilFilterBersama() {
        return {
            bulan: document.getElementById("filterBulan").value,
            tahun: document.getElementById("filterTahun").value,
            nama: document.getElementById("filterNama").value.trim().toUpperCase()
        };
    }

    function cocokBulanTahun(tanggalObjAtauNull, f) {
        if (!f.bulan && !f.tahun) return true;
        if (!tanggalObjAtauNull) return false;
        if (f.bulan && tanggalObjAtauNull.getMonth() !== Number(f.bulan)) return false;
        if (f.tahun && tanggalObjAtauNull.getFullYear() !== Number(f.tahun)) return false;
        return true;
    }

    function cocokNama(nama, f) {
        if (!f.nama) return true;
        return String(nama || "").toUpperCase().indexOf(f.nama) !== -1;
    }

    /* ===== TAB PINJAMAN ===== */
    function renderTabPinjaman() {

        var f = ambilFilterBersama();
        var statusFilter = document.getElementById("filterStatusPinjaman").value;

        var hasil = dataPinjaman.filter(function (p) {
            if (!cocokNama(p.nama, f)) return false;
            if (statusFilter && p.status !== statusFilter) return false;
            // tanggal pengajuan tidak disimpan sebagai objek Date terpisah di frontend,
            // jadi filter bulan/tahun untuk tab ini dilewati kalau timestampDate tidak ada
            if (p.timestampDate && !cocokBulanTahun(p.timestampDate, f)) return false;
            return true;
        });

        destroyDT("tabelPinjaman");
        var tbody = document.querySelector("#tabelPinjaman tbody");

        tbody.innerHTML = hasil.map(function (p, idx) {
            var badge = p.status === "LUNAS" ? "ngx-badge-lunas" : "ngx-badge-belum";
            return "<tr><td>PJM-" + p.rowNumber + "</td><td>" + escapeHtml(p.timestampFormat) + "</td>" +
                "<td>" + escapeHtml(p.nama) + "</td><td>" + p.nominalFormat + "</td><td>" + (p.tenorHari != null ? p.tenorHari : "-") + "</td>" +
                "<td>" + escapeHtml(p.jatuhTempoFormat) + "</td><td>" + p.pelunasanFormat + "</td><td>" + p.sisaFormat + "</td>" +
                "<td><span class='badge " + badge + "'>" + p.status + "</span></td></tr>";
        }).join("");

        tabelInstances["tabelPinjaman"] = $("#tabelPinjaman").DataTable({ pageLength: 10, language: { search: "Cari:", paginate: { previous: "\u2039", next: "\u203a" } } });

        var totPinjaman = 0, totPelunasan = 0, totSisa = 0;
        hasil.forEach(function (p) { totPinjaman += p.nominal; totPelunasan += p.pelunasan; totSisa += p.sisa; });

        document.getElementById("totPinjaman").textContent = formatRupiah(totPinjaman);
        document.getElementById("totPelunasanP").textContent = formatRupiah(totPelunasan);
        document.getElementById("totSisaP").textContent = formatRupiah(totSisa);

    }

    document.getElementById("filterStatusPinjaman").addEventListener("change", renderTabPinjaman);

    /* ===== TAB SIMPANAN ===== */
    function renderTabSimpanan() {

        var f = ambilFilterBersama();
        var jenisFilter = document.getElementById("filterJenisSimpananL").value;

        var hasil = dataSimpanan.filter(function (s) {
            if (!cocokNama(s.nama, f)) return false;
            if (jenisFilter && s.jenisSimpanan !== jenisFilter) return false;
            if (s.tanggalDate && !cocokBulanTahun(s.tanggalDate, f)) return false;
            return true;
        });

        destroyDT("tabelSimpananL");
        var tbody = document.querySelector("#tabelSimpananL tbody");

        tbody.innerHTML = hasil.map(function (s) {
            var badge = s.status === "Disetujui" ? "ngx-badge-lunas" : (s.status === "Ditolak" ? "ngx-badge-merah" : "ngx-badge-belum");
            return "<tr><td>" + escapeHtml(s.tanggal) + "</td><td>" + escapeHtml(s.nama) + "</td><td>" + escapeHtml(s.jenisSimpanan) + "</td>" +
                "<td>" + s.nominalFormat + "</td><td><span class='badge " + badge + "'>" + escapeHtml(s.status) + "</span></td></tr>";
        }).join("");

        tabelInstances["tabelSimpananL"] = $("#tabelSimpananL").DataTable({ pageLength: 10, language: { search: "Cari:", paginate: { previous: "\u2039", next: "\u203a" } } });

        var totSemua = 0, totWajib = 0, totSukarela = 0, totPokok = 0;
        hasil.forEach(function (s) {
            if (s.status !== "Disetujui") return; // cuma yang disetujui dihitung sebagai simpanan resmi
            totSemua += s.nominal;
            if (s.jenisSimpanan === "Simpanan Wajib") totWajib += s.nominal;
            else if (s.jenisSimpanan === "Simpanan Sukarela") totSukarela += s.nominal;
            else if (s.jenisSimpanan === "Simpanan Pokok") totPokok += s.nominal;
        });

        document.getElementById("totSimpananSemua").textContent = formatRupiah(totSemua);
        document.getElementById("totWajib").textContent = formatRupiah(totWajib);
        document.getElementById("totSukarela").textContent = formatRupiah(totSukarela);
        document.getElementById("totPokok").textContent = formatRupiah(totPokok);

    }

    document.getElementById("filterJenisSimpananL").addEventListener("change", renderTabSimpanan);

    /* ===== TAB JATUH TEMPO ===== */
    function formatNomorWa(nomor) {
        var bersih = String(nomor || "").replace(/[^0-9]/g, "");
        if (bersih.indexOf("0") === 0) bersih = "62" + bersih.substring(1);
        else if (bersih.indexOf("62") !== 0) bersih = "62" + bersih;
        return bersih;
    }

    function badgeKategoriJT(status) {
        if (status === "LEWAT JATUH TEMPO") return "ngx-badge-merah";
        if (status === "JATUH TEMPO HARI INI" || status === "JATUH TEMPO BESOK") return "ngx-badge-kuning";
        return "ngx-badge-hijau";
    }

    function renderTabJatuhTempo() {

        var f = ambilFilterBersama();
        var kategoriFilter = document.getElementById("filterKategoriJT").value;

        var hasil = dataJatuhTempo.filter(function (j) {
            if (!cocokNama(j.nama, f)) return false;
            if (kategoriFilter && j.statusJatuhTempo !== kategoriFilter) return false;
            return true;
        });

        destroyDT("tabelJatuhTempo");
        var tbody = document.querySelector("#tabelJatuhTempo tbody");

        tbody.innerHTML = hasil.map(function (j) {
            return "<tr><td>" + escapeHtml(j.nama) + "</td><td>" + j.sisaFormat + "</td><td>" + escapeHtml(j.jatuhTempoFormat) + "</td>" +
                "<td><span class='badge " + badgeKategoriJT(j.statusJatuhTempo) + "'>" + escapeHtml(j.statusJatuhTempo) + "</span></td>" +
                "<td><button class='btn btn-success btn-sm btn-wa-jt' data-nohp='" + escapeHtml(j.noHp) + "' data-nama='" + escapeHtml(j.nama) + "' data-nominal='" + escapeHtml(j.nominalFormat) + "' data-sisa='" + escapeHtml(j.sisaFormat) + "' data-jt='" + escapeHtml(j.jatuhTempoFormat) + "'>WhatsApp</button></td></tr>";
        }).join("");

        tabelInstances["tabelJatuhTempo"] = $("#tabelJatuhTempo").DataTable({ pageLength: 10, language: { search: "Cari:", paginate: { previous: "\u2039", next: "\u203a" } } });

        document.querySelectorAll(".btn-wa-jt").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var noHp = btn.getAttribute("data-nohp");
                if (!noHp || noHp === "-") { if (window.Swal) Swal.fire("Nomor tidak ada", "Nomor HP tidak tercatat.", "warning"); return; }
                var pesan = "Halo Bapak/Ibu " + btn.getAttribute("data-nama") + "\nKami mengingatkan bahwa pinjaman Anda sebesar " + btn.getAttribute("data-nominal") +
                    "\nSisa tagihan\n" + btn.getAttribute("data-sisa") + "\nJatuh tempo\n" + btn.getAttribute("data-jt") + "\nTerima kasih.";
                window.open("https://wa.me/" + formatNomorWa(noHp) + "?text=" + encodeURIComponent(pesan), "_blank");
            });
        });

    }

    document.getElementById("filterKategoriJT").addEventListener("change", renderTabJatuhTempo);

    /* ===== TAB ANGGOTA ===== */
    function renderTabAnggota() {

        var f = ambilFilterBersama();

        // Gabungkan data anggota dengan agregat simpanan & status pinjaman per nama
        var simpananPerNama = {};
        dataSimpanan.forEach(function (s) {
            if (s.status !== "Disetujui") return;
            var key = String(s.nama).toUpperCase();
            simpananPerNama[key] = (simpananPerNama[key] || 0) + s.nominal;
        });

        var pinjamanPerNama = {};
        dataPinjaman.forEach(function (p) {
            var key = String(p.nama).toUpperCase();
            if (!pinjamanPerNama[key]) pinjamanPerNama[key] = { total: 0, adaBelumLunas: false };
            pinjamanPerNama[key].total += p.nominal;
            if (p.status === "BELUM LUNAS") pinjamanPerNama[key].adaBelumLunas = true;
        });

        var hasil = dataAnggota.filter(function (a) { return cocokNama(a.nama, f); });

        destroyDT("tabelAnggotaL");
        var tbody = document.querySelector("#tabelAnggotaL tbody");

        var aktif = 0, nonaktif = 0, belumPinjam = 0;

        tbody.innerHTML = hasil.map(function (a) {

            var key = String(a.nama).toUpperCase();
            var totSimpanan = simpananPerNama[key] || 0;
            var pinjamanInfo = pinjamanPerNama[key];

            if (a.statusAktif === "Aktif") aktif++; else nonaktif++;

            var statusPinjaman = "Belum Pernah Pinjam";
            if (pinjamanInfo) statusPinjaman = pinjamanInfo.adaBelumLunas ? "Ada Pinjaman Aktif" : "Semua Lunas";
            else belumPinjam++;

            return "<tr><td>" + escapeHtml(a.nama) + "</td><td>" + escapeHtml(a.grup) + "</td>" +
                "<td>" + formatRupiah(totSimpanan) + "</td><td>" + formatRupiah(pinjamanInfo ? pinjamanInfo.total : 0) + "</td>" +
                "<td>" + statusPinjaman + "</td></tr>";

        }).join("");

        tabelInstances["tabelAnggotaL"] = $("#tabelAnggotaL").DataTable({ pageLength: 10, language: { search: "Cari:", paginate: { previous: "\u2039", next: "\u203a" } } });

        document.getElementById("statAktifAnggota").textContent = aktif;
        document.getElementById("statNonaktifAnggota").textContent = nonaktif;
        document.getElementById("statBelumPinjam").textContent = belumPinjam;

    }

    /* ===== Tab switching ===== */
    var renderUlangPerTab = {
        pinjaman: renderTabPinjaman,
        simpanan: renderTabSimpanan,
        jatuhtempo: renderTabJatuhTempo,
        anggota: renderTabAnggota
    };

    document.querySelectorAll("#laporanTabs .nav-link").forEach(function (btn) {

        if (btn.classList.contains("disabled")) return;

        btn.addEventListener("click", function () {

            document.querySelectorAll("#laporanTabs .nav-link").forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var target = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-pane").forEach(function (p) { p.classList.add("d-none"); });
            document.getElementById("tab-" + target).classList.remove("d-none");

            if (renderUlangPerTab[target]) renderUlangPerTab[target]();

        });

    });

    document.getElementById("btnTerapkanFilter").addEventListener("click", function () {
        renderTabPinjaman(); renderTabSimpanan(); renderTabJatuhTempo(); renderTabAnggota();
    });

    document.getElementById("btnResetFilter").addEventListener("click", function () {
        document.getElementById("filterBulan").value = "";
        document.getElementById("filterTahun").value = "";
        document.getElementById("filterNama").value = "";
        renderTabPinjaman(); renderTabSimpanan(); renderTabJatuhTempo(); renderTabAnggota();
    });

    /* ===== Export generik (Excel / PDF / Print / CSV) berbasis <table id> ===== */
    document.addEventListener("click", function (e) {

        var btn = e.target.closest(".btn-export");
        if (!btn) return;

        var tableId = btn.getAttribute("data-target");
        var type = btn.getAttribute("data-type");
        var table = document.getElementById(tableId);

        if (type === "print") {
            window.print();
            return;
        }

        if (type === "excel") {
            var wb = XLSX.utils.table_to_book(table, { sheet: "Laporan" });
            XLSX.writeFile(wb, tableId + ".xlsx");
            return;
        }

        if (type === "csv") {
            var wsCsv = XLSX.utils.table_to_sheet(table);
            var csv = XLSX.utils.sheet_to_csv(wsCsv);
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            var link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = tableId + ".csv";
            link.click();
            return;
        }

        if (type === "pdf") {
            var doc = new window.jspdf.jsPDF();
            doc.autoTable({ html: "#" + tableId, styles: { fontSize: 7 }, headStyles: { fillColor: [15, 118, 110] } });
            doc.save(tableId + ".pdf");
            return;
        }

    });

    /* ===== Muat semua data ===== */
    function isiPilihanTahun(daftarTanggal) {
        var tahunSet = {};
        daftarTanggal.forEach(function (d) { if (d) tahunSet[d.getFullYear()] = true; });
        var select = document.getElementById("filterTahun");
        Object.keys(tahunSet).sort().reverse().forEach(function (th) {
            var opt = document.createElement("option");
            opt.value = th; opt.textContent = th;
            select.appendChild(opt);
        });
    }

    function muatSemuaData() {

        var loadingBox = document.getElementById("pageLoading");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("d-none");
        errorBox.classList.add("d-none");
        content.classList.add("d-none");

        Promise.all([
            fetch(NGX_API_BASE_URL + "?action=adminGetLaporanSummary&token=" + encodeURIComponent(token)).then(function (r) { return r.json(); }),
            fetch(NGX_API_BASE_URL + "?action=adminGetPinjamanList&token=" + encodeURIComponent(token)).then(function (r) { return r.json(); }),
            fetch(NGX_API_BASE_URL + "?action=adminGetSimpananList&token=" + encodeURIComponent(token)).then(function (r) { return r.json(); }),
            fetch(NGX_API_BASE_URL + "?action=adminGetFollowUpList&token=" + encodeURIComponent(token)).then(function (r) { return r.json(); }),
            fetch(NGX_API_BASE_URL + "?action=adminGetAnggotaList&token=" + encodeURIComponent(token)).then(function (r) { return r.json(); })
        ]).then(function (hasil) {

            loadingBox.classList.add("d-none");

            var ringkasan = hasil[0], pinjaman = hasil[1], simpanan = hasil[2], jatuhTempo = hasil[3], anggota = hasil[4];

            var adaAuthError = [ringkasan, pinjaman, simpanan, jatuhTempo, anggota].some(function (d) { return d && d.authError; });
            if (adaAuthError) { logoutLokal(); window.location.href = "/admin/login/"; return; }

            if (ringkasan && ringkasan.success) {
                document.getElementById("sumAnggota").textContent = ringkasan.totalAnggota;
                document.getElementById("sumSimpanan").textContent = ringkasan.totalSimpananFormat;
                document.getElementById("sumPinjamanAktif").textContent = ringkasan.totalPinjamanAktif;
                document.getElementById("sumPinjamanLunas").textContent = ringkasan.totalPinjamanLunas;
                document.getElementById("sumCicilanBulanIni").textContent = ringkasan.totalCicilanBulanIniFormat;
                document.getElementById("sumPemasukan").textContent = ringkasan.totalPemasukanFormat;
                document.getElementById("sumPengeluaran").textContent = ringkasan.totalPengeluaranFormat;
                document.getElementById("sumSaldoKas").textContent = ringkasan.saldoKasFormat;
            }

            dataPinjaman = (pinjaman && pinjaman.success) ? pinjaman.pinjaman.map(function (p) {
                var ts = null;
                try { ts = new Date(p.timestampFormat.split(",")[0].split(" ").reverse().join("-")); } catch (err) { ts = null; }
                var tenorHari = null;
                return Object.assign({}, p, { timestampDate: (ts && !isNaN(ts.getTime())) ? ts : null, tenorHari: tenorHari });
            }) : [];

            dataSimpanan = (simpanan && simpanan.success) ? simpanan.simpanan.map(function (s) {
                var td = null;
                try { td = new Date(s.tanggal); } catch (err) { td = null; }
                return Object.assign({}, s, { tanggalDate: (td && !isNaN(td.getTime())) ? td : null });
            }) : [];

            dataJatuhTempo = (jatuhTempo && jatuhTempo.success) ? jatuhTempo.followup : [];
            dataAnggota = (anggota && anggota.success) ? anggota.anggota : [];

            isiPilihanTahun(dataPinjaman.map(function (p) { return p.timestampDate; }).concat(dataSimpanan.map(function (s) { return s.tanggalDate; })));

            renderTabPinjaman();
            renderTabSimpanan();
            renderTabJatuhTempo();
            renderTabAnggota();

            content.classList.remove("d-none");

        }).catch(function () {
            loadingBox.classList.add("d-none");
            errorText.textContent = "Gagal terhubung ke server.";
            errorBox.classList.remove("d-none");
        });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatSemuaData);

    muatSemuaData();

})();
