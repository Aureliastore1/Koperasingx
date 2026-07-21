(function () {

    var form = document.getElementById("formPengeluaran");
    var errorBox = document.getElementById("pgError");
    var btnSimpan = document.getElementById("btnSimpanPengeluaran");
    var nominalInput = document.getElementById("pgNominal");

    var rekapLoading = document.getElementById("rekapLoading");
    var rekapError = document.getElementById("rekapError");
    var rekapErrorText = document.getElementById("rekapErrorText");
    var rekapAccordion = document.getElementById("rekapAccordion");

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

    function capitalize(s) {
        s = String(s || "").toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function renderBulan(bulan) {

        var isKosong = bulan.jumlahItem === 0;

        var isiList = bulan.items.map(function (it) {

            var chips = it.rincian.map(function (r) {
                return '<span class="ngx-accordion-chip">' + escapeHtml(r.label) + ' ' + r.nominalFormat.replace("Rp ", "") + '</span>';
            }).join("");

            return (
                '<div class="ngx-accordion-row">' +
                    '<span class="ngx-accordion-row-nama">' + escapeHtml(it.item) + '</span>' +
                    '<span class="ngx-accordion-row-nominal">' + chips + '<span class="ngx-accordion-total">' + it.totalFormat + '</span></span>' +
                '</div>'
            );
        }).join("");

        var body = isKosong
            ? '<div class="ngx-accordion-empty">Belum ada data pengeluaran bulan ini</div>'
            : '<div class="ngx-accordion-list">' + isiList + '</div>';

        return (
            '<div class="ngx-accordion-item' + (isKosong ? " kosong" : "") + '" data-bulan="' + escapeHtml(bulan.label) + '">' +
                '<button type="button" class="ngx-accordion-header"' + (isKosong ? " disabled" : "") + '>' +
                    '<div class="flex items-center gap-3 min-w-0">' +
                        '<span class="font-bold text-gray-800 text-sm">' + escapeHtml(capitalize(bulan.label)) + '</span>' +
                        '<span class="ngx-badge-count">' + bulan.jumlahItem + ' item</span>' +
                    '</div>' +
                    '<div class="flex items-center gap-3 flex-shrink-0">' +
                        '<span class="font-bold text-kop-800 text-sm">' + bulan.totalFormat + '</span>' +
                        (isKosong ? '' : '<i data-lucide="chevron-down" class="w-4 h-4 ngx-accordion-chevron"></i>') +
                    '</div>' +
                '</button>' +
                '<div class="ngx-accordion-body">' + body + '</div>' +
            '</div>'
        );
    }

    function muatRekap() {

        rekapLoading.classList.remove("hidden");
        rekapError.classList.add("hidden");
        rekapAccordion.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=rincianPengeluaran")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                rekapLoading.classList.add("hidden");

                if (!data || data.success !== true) {
                    rekapErrorText.textContent = (data && data.message) ? data.message : "Gagal memuat rekap pengeluaran.";
                    rekapError.classList.remove("hidden");
                    return;
                }

                rekapAccordion.innerHTML = data.bulan.map(renderBulan).join("");
                rekapAccordion.classList.remove("hidden");

                if (window.lucide) lucide.createIcons();

                var items = rekapAccordion.querySelectorAll(".ngx-accordion-item:not(.kosong)");
                items.forEach(function (el) {
                    var header = el.querySelector(".ngx-accordion-header");
                    header.addEventListener("click", function () { el.classList.toggle("open"); });
                });

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
