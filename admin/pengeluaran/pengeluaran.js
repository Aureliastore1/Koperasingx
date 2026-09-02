(function () {

    var form = document.getElementById("formPengeluaran");
    var errorBox = document.getElementById("pgError");
    var btnSimpan = document.getElementById("btnSimpanPengeluaran");
    var nominalInput = document.getElementById("pgNominal");

    var rekapLoading = document.getElementById("rekapLoading");
    var rekapError = document.getElementById("rekapError");
    var rekapErrorText = document.getElementById("rekapErrorText");

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    // Format Rupiah otomatis saat mengetik nominal
    nominalInput.addEventListener("input", function () {
        var angka = nominalInput.value.replace(/[^0-9]/g, "");
        nominalInput.value = angka ? "Rp " + Number(angka).toLocaleString("id-ID") : "";
    });

    function ambilNominalAngka() {
        return parseFloat(nominalInput.value.replace(/[^0-9]/g, "")) || 0;
    }

    function tampilkanError(pesan) {
        errorBox.textContent = pesan;
        errorBox.classList.remove("hidden");
    }

    function setLoadingSubmit(isLoading) {
        btnSimpan.disabled = isLoading;
        btnSimpan.innerHTML = isLoading
            ? '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Menyimpan...</span>'
            : '<i data-lucide="save" class="w-4 h-4"></i><span>Simpan Catatan</span>';
        if (window.lucide) lucide.createIcons();
    }

    // Default tanggal = hari ini
    var tanggalInput = document.getElementById("pgTanggal");
    tanggalInput.value = new Date().toISOString().split("T")[0];

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        errorBox.classList.add("hidden");

        var bulan = document.getElementById("pgBulan").value;
        var bendahara = document.getElementById("pgBendahara").value;
        var tanggal = tanggalInput.value;
        var keterangan = document.getElementById("pgKeterangan").value.trim();
        var nominal = ambilNominalAngka();

        if (!bulan) return tampilkanError("Bulan wajib dipilih.");
        if (!bendahara) return tampilkanError("Pilih dulu siapa yang mencatat (Dian/Fajar).");
        if (!tanggal) return tampilkanError("Tanggal wajib diisi.");
        if (!keterangan) return tampilkanError("Keterangan pengeluaran wajib diisi.");
        if (!nominal || nominal <= 0) return tampilkanError("Nominal tidak valid.");

        setLoadingSubmit(true);

        var body = new URLSearchParams();
        body.append("action", "adminTambahPengeluaran");
        body.append("token", ngxAdminGetToken());
        body.append("bulan", bulan);
        body.append("bendahara", bendahara);
        body.append("tanggal", tanggal);
        body.append("keterangan", keterangan);
        body.append("nominal", nominal);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                setLoadingSubmit(false);

                if (!data || data.success !== true) {

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    tampilkanError(data && data.message ? data.message : "Gagal menyimpan catatan.");
                    return;
                }

                var namaBulanTampil = document.getElementById("pgBulan").options[document.getElementById("pgBulan").selectedIndex].text;

                form.reset();
                tanggalInput.value = new Date().toISOString().split("T")[0];
                muatRekap();

                if (window.Swal) {
                    var lokasi = data.lokasi ? ("Tersimpan di sheet PENGELUARAN, kolom " + data.lokasi.kolomKeterangan + "/" + data.lokasi.kolomNominal + " baris " + data.lokasi.baris + ".") : "";
                    Swal.fire({ title: "Tersimpan", text: "Catatan pengeluaran " + namaBulanTampil + " berhasil disimpan. " + lokasi, icon: "success", confirmButtonColor: "#0F766E" });
                }

            })
            .catch(function () {
                setLoadingSubmit(false);
                tampilkanError("Gagal terhubung ke server, coba lagi.");
            });

    });

    var rekapList = document.getElementById("rekapList");
    var detailKosong = document.getElementById("detailBulanKosong");
    var detailIsi = document.getElementById("detailBulanIsi");

    var dataBulanTerakhir = [];
    var bulanTerpilih = null;

    function capitalize(s) {
        s = String(s || "").toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    // Keterangan disimpan dengan format "dd/MM - keterangan asli" (kalau
    // dicatat lewat form ini). Dipisah lagi di sini supaya tampil rapi
    // sebagai kolom Tanggal & Keterangan terpisah di tabel detail.
    function pisahTanggalKeterangan(teks) {
        var cocok = String(teks || "").match(/^(\d{2}\/\d{2})\s*-\s*(.+)$/);
        return cocok ? { tanggal: cocok[1], keterangan: cocok[2] } : { tanggal: "-", keterangan: teks };
    }

    function renderItemRekap(bulan) {

        var isKosong = bulan.jumlahItem === 0;
        var aktif = bulanTerpilih === bulan.label;

        return (
            '<button type="button" class="ngx-bulan-item' + (aktif ? " aktif" : "") + (isKosong ? " kosong" : "") + '" data-bulan="' + escapeHtml(bulan.label) + '"' + (isKosong ? " disabled" : "") + '>' +
                '<div class="flex items-center gap-3 min-w-0">' +
                    '<span class="font-bold text-gray-800 text-sm">' + escapeHtml(capitalize(bulan.label)) + '</span>' +
                    '<span class="ngx-badge-count">' + bulan.jumlahItem + ' item</span>' +
                '</div>' +
                '<div class="flex items-center gap-2 flex-shrink-0">' +
                    '<span class="font-bold text-kop-800 text-sm">' + bulan.totalFormat + '</span>' +
                    (isKosong ? '' : '<i data-lucide="chevron-right" class="w-4 h-4 text-gray-300"></i>') +
                '</div>' +
            '</button>'
        );

    }

    function renderDetailBulan(bulan) {

        if (!bulan || bulan.jumlahItem === 0) {
            detailIsi.innerHTML = '<div class="ngx-accordion-empty">Belum ada data pengeluaran bulan ini</div>';
            return;
        }

        var barisTabel = bulan.items.map(function (it, idx) {

            var pisah = pisahTanggalKeterangan(it.item);
            var pencatat = it.rincian.map(function (r) { return capitalize(r.label); }).join(", ") || "-";

            return (
                '<tr>' +
                    '<td class="text-center text-gray-400">' + (idx + 1) + '</td>' +
                    '<td class="whitespace-nowrap">' + escapeHtml(pisah.tanggal) + '</td>' +
                    '<td>' + escapeHtml(pisah.keterangan) + '</td>' +
                    '<td>' + escapeHtml(pencatat) + '</td>' +
                    '<td class="text-right font-semibold">' + it.totalFormat + '</td>' +
                '</tr>'
            );

        }).join("");

        detailIsi.innerHTML =
            '<div class="flex items-center justify-between mb-4">' +
                '<div>' +
                    '<p class="text-sm font-bold text-gray-800">' + escapeHtml(capitalize(bulan.label)) + '</p>' +
                    '<p class="text-xs text-gray-400">' + bulan.jumlahItem + ' pengeluaran tercatat</p>' +
                '</div>' +
                '<p class="text-lg font-extrabold text-kop-700">' + bulan.totalFormat + '</p>' +
            '</div>' +
            '<div style="max-height:60vh; overflow:auto;">' +
                '<table class="ngx-table-compact" style="width:100%;">' +
                    '<thead><tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th>Dicatat Oleh</th><th>Nominal</th></tr></thead>' +
                    '<tbody>' + barisTabel + '</tbody>' +
                '</table>' +
            '</div>';

    }

    function pilihBulan(labelBulan) {

        bulanTerpilih = labelBulan;

        var bulan = dataBulanTerakhir.filter(function (b) { return b.label === labelBulan; })[0];
        if (!bulan) return;

        detailKosong.classList.add("hidden");
        detailIsi.classList.remove("hidden");
        renderDetailBulan(bulan);

        rekapList.querySelectorAll(".ngx-bulan-item").forEach(function (el) {
            el.classList.toggle("aktif", el.getAttribute("data-bulan") === labelBulan);
        });

    }

    function muatRekap() {

        rekapLoading.classList.remove("hidden");
        rekapError.classList.add("hidden");
        rekapList.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=rincianPengeluaran")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                rekapLoading.classList.add("hidden");

                if (!data || data.success !== true) {
                    rekapErrorText.textContent = (data && data.message) ? data.message : "Gagal memuat rekap pengeluaran.";
                    rekapError.classList.remove("hidden");
                    return;
                }

                dataBulanTerakhir = data.bulan;

                rekapList.innerHTML = data.bulan.map(renderItemRekap).join("");
                rekapList.classList.remove("hidden");

                if (window.lucide) lucide.createIcons();

                rekapList.querySelectorAll(".ngx-bulan-item:not(.kosong)").forEach(function (el) {
                    el.addEventListener("click", function () { pilihBulan(el.getAttribute("data-bulan")); });
                });

                // Kalau ada bulan yang sebelumnya sedang dipilih (misal abis refresh), tampilkan lagi datanya yang baru
                if (bulanTerpilih) pilihBulan(bulanTerpilih);

            })
            .catch(function () {
                rekapLoading.classList.add("hidden");
                rekapErrorText.textContent = "Gagal terhubung ke server.";
                rekapError.classList.remove("hidden");
            });

    }

    document.getElementById("btnRefreshRekap").addEventListener("click", muatRekap);

    ngxAdminCekSesi(function () {
        muatRekap();
    });

})();
