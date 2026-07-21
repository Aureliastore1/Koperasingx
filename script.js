// Initialize Lucide Icons
lucide.createIcons();

// Navbar scroll effect (hanya berlaku di halaman yang punya #navbar, mis. beranda)
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/* =========================================================
   JAM REAL-TIME (WIB) — tampil di hero beranda
   Selalu pakai zona Asia/Jakarta supaya konsisten buat semua
   pengunjung, apapun zona waktu perangkat mereka.
   ========================================================= */
(function () {
    var elTime = document.getElementById("liveClockTime");
    var elDate = document.getElementById("liveClockDate");

    if (!elTime || !elDate) return;

    var formatJam = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });

    var formatTanggal = new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    function perbaruiJam() {
        var now = new Date();
        elTime.textContent = formatJam.format(now) + " WIB";
        elDate.textContent = formatTanggal.format(now);
    }

    perbaruiJam();
    setInterval(perbaruiJam, 1000);
})();

// Reveal on scroll using Intersection Observer
const revealElements = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
});
revealElements.forEach(el => observer.observe(el));

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Ganti URL ini kalau nanti deploy ulang Apps Script — dipakai bareng oleh Cek Tagihan & Informasi Kas
var NGX_API_BASE_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

/* =========================================================
   CEK TAGIHAN — fetch ke Apps Script API, render di halaman
   ========================================================= */
(function () {
    var CEK_TAGIHAN_BASE_URL = NGX_API_BASE_URL;

    var form = document.getElementById("cekTagihanForm");
    var input = document.getElementById("cekTagihanNama");
    var btn = document.getElementById("cekTagihanBtn");
    var errorMsg = document.getElementById("cekTagihanError");
    var errorText = document.getElementById("cekTagihanErrorText");
    var resultBox = document.getElementById("cekTagihanResult");
    var suggestBox = document.getElementById("cekTagihanSuggest");

    if (!form || !input || !resultBox) return;

    /* ===== Autocomplete Nama ===== */
    var daftarNama = [];
    var daftarNamaSiap = false;
    var suggestActiveIndex = -1;
    var suggestItems = [];
    var debounceTimer = null;

    function muatDaftarNama() {
        fetch(CEK_TAGIHAN_BASE_URL + "?action=daftarNama")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data && data.success && Array.isArray(data.daftarNama)) {
                    daftarNama = data.daftarNama;
                }
                daftarNamaSiap = true;
            })
            .catch(function () {
                daftarNamaSiap = true; // gagal diam-diam, form tetap bisa dipakai manual
            });
    }
    muatDaftarNama();

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function highlightMatch(nama, query) {
        var idx = nama.toUpperCase().indexOf(query.toUpperCase());
        if (idx === -1) return escapeHtml(nama);
        var before = escapeHtml(nama.slice(0, idx));
        var match = escapeHtml(nama.slice(idx, idx + query.length));
        var after = escapeHtml(nama.slice(idx + query.length));
        return before + "<mark>" + match + "</mark>" + after;
    }

    function closeSuggest() {
        suggestBox.classList.add("hidden");
        suggestBox.innerHTML = "";
        suggestItems = [];
        suggestActiveIndex = -1;
    }

    function setActiveSuggest(i) {
        suggestItems.forEach(function (el) { el.classList.remove("active"); });
        if (suggestItems[i]) {
            suggestItems[i].classList.add("active");
            suggestItems[i].scrollIntoView({ block: "nearest" });
        }
        suggestActiveIndex = i;
    }

    function pilihNama(nama) {
        input.value = nama;
        closeSuggest();
        hideError();
        input.focus();
    }

    function tampilkanSuggest(query) {
        if (!query) {
            closeSuggest();
            return;
        }

        var hasil = daftarNama
            .filter(function (n) { return n.toUpperCase().indexOf(query.toUpperCase()) !== -1; })
            .slice(0, 8);

        if (hasil.length === 0) {
            suggestBox.innerHTML = daftarNamaSiap
                ? '<div class="ngx-suggest-empty">Nama tidak ditemukan</div>'
                : '<div class="ngx-suggest-empty">Memuat daftar nama...</div>';
            suggestBox.classList.remove("hidden");
            suggestItems = [];
            suggestActiveIndex = -1;
            return;
        }

        suggestBox.innerHTML = hasil.map(function (nama) {
            return '<div class="ngx-suggest-item" data-nama="' + escapeHtml(nama) + '">' +
                '<i data-lucide="user-round" class="w-3.5 h-3.5 text-kop-500 flex-shrink-0"></i>' +
                '<span>' + highlightMatch(nama, query) + '</span>' +
                '</div>';
        }).join("");

        suggestBox.classList.remove("hidden");
        if (window.lucide) lucide.createIcons();

        suggestItems = Array.prototype.slice.call(suggestBox.querySelectorAll(".ngx-suggest-item"));
        suggestActiveIndex = -1;

        suggestItems.forEach(function (el) {
            el.addEventListener("mousedown", function (e) {
                e.preventDefault();
                pilihNama(el.getAttribute("data-nama"));
            });
        });
    }

    input.addEventListener("input", function () {
        hideError();
        var query = input.value.trim();

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
            tampilkanSuggest(query);
        }, 120);
    });

    input.addEventListener("focus", function () {
        var query = input.value.trim();
        if (query) tampilkanSuggest(query);
    });

    input.addEventListener("keydown", function (e) {
        if (suggestBox.classList.contains("hidden") || suggestItems.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveSuggest(Math.min(suggestActiveIndex + 1, suggestItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveSuggest(Math.max(suggestActiveIndex - 1, 0));
        } else if (e.key === "Enter") {
            if (suggestActiveIndex >= 0 && suggestItems[suggestActiveIndex]) {
                e.preventDefault();
                pilihNama(suggestItems[suggestActiveIndex].getAttribute("data-nama"));
            }
        } else if (e.key === "Escape") {
            closeSuggest();
        }
    });

    document.addEventListener("click", function (e) {
        if (!suggestBox.contains(e.target) && e.target !== input) {
            closeSuggest();
        }
    });

    function showError(msg) {
        errorText.textContent = msg || "Nama tidak boleh kosong.";
        errorMsg.classList.remove("hidden");
    }

    function hideError() {
        errorMsg.classList.add("hidden");
    }

    function setLoadingBtn(isLoading) {
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading
            ? '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Mencari...</span>'
            : '<i data-lucide="search-check" class="w-4 h-4"></i><span>Cek Sekarang</span>';
        if (window.lucide) lucide.createIcons();
    }

    function renderLoading() {
        resultBox.innerHTML =
            '<div class="flex flex-col items-center justify-center gap-3 py-10">' +
                '<div class="ngx-spinner"></div>' +
                '<p class="text-sm text-gray-500">Mengambil data tagihan Anda...</p>' +
            '</div>';
    }

    function renderNetworkError() {
        resultBox.innerHTML =
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 text-center">' +
                '<i data-lucide="wifi-off" class="w-8 h-8 text-red-500 mx-auto mb-3"></i>' +
                '<p class="text-sm font-semibold text-gray-800 mb-1">Gagal terhubung ke server</p>' +
                '<p class="text-xs text-gray-500">Silakan coba lagi beberapa saat lagi.</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    }

    function renderNotFound(nama) {
        resultBox.innerHTML =
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 text-center">' +
                '<i data-lucide="user-x" class="w-8 h-8 text-red-500 mx-auto mb-3"></i>' +
                '<p class="text-sm font-semibold text-gray-800 mb-1">Data tidak ditemukan</p>' +
                '<p class="text-xs text-gray-500">Nama "' + escapeHtml(nama) + '" tidak terdaftar. Periksa kembali ejaan nama Anda.</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    }

    /* ===== Riwayat Transaksi Pinjaman =====
       Menampilkan: Timestamp, Alasan Kebutuhan Meminjam,
       Jatuh Tempo, Nominal yang Diajukan, Pelunasan Nasabah
       (Nama Nasabah tidak diulang di tiap baris karena sudah
        jadi judul kartu utama di atasnya)
    */
    function renderRiwayat(n) {
        var riwayat = Array.isArray(n.riwayat) ? n.riwayat : [];
        var jumlah = n.jumlahPinjam != null ? n.jumlahPinjam : riwayat.length;

        var isiList;
        if (riwayat.length === 0) {
            isiList =
                '<div class="text-center py-8">' +
                    '<i data-lucide="inbox" class="w-7 h-7 text-gray-300 mx-auto mb-2"></i>' +
                    '<p class="text-xs text-gray-400">Belum ada riwayat transaksi tercatat</p>' +
                '</div>';
        } else {
            isiList = riwayat.map(function (r) {
                var statusLunas = r.statusBaris === "LUNAS";
                var statusClass = statusLunas ? "ngx-badge-lunas" : "ngx-badge-belum";

                return (
                    '<div class="ngx-riwayat-item">' +
                        '<div class="ngx-riwayat-dot"></div>' +
                        '<div class="flex-1 min-w-0">' +

                            '<div class="flex items-center justify-between gap-3 mb-0.5">' +
                                '<p class="text-sm font-semibold text-gray-800">Pengajuan Pinjaman</p>' +
                                '<span class="text-sm font-bold text-kop-800 whitespace-nowrap">' + r.nominalFormat + '</span>' +
                            '</div>' +

                            '<p class="text-xs text-gray-400 mb-2">' + escapeHtml(r.timestampFormat) + '</p>' +

                            '<div class="ngx-riwayat-detail">' +
                                '<div class="ngx-riwayat-detail-row">' +
                                    '<span class="ngx-riwayat-label">Alasan Peminjaman</span>' +
                                    '<span class="ngx-riwayat-value">' + escapeHtml(r.alasan) + '</span>' +
                                '</div>' +
                                '<div class="ngx-riwayat-detail-row">' +
                                    '<span class="ngx-riwayat-label">Jatuh Tempo</span>' +
                                    '<span class="ngx-riwayat-value">' + escapeHtml(r.jatuhTempoFormat) + '</span>' +
                                '</div>' +
                                '<div class="ngx-riwayat-detail-row">' +
                                    '<span class="ngx-riwayat-label">Pelunasan</span>' +
                                    '<span class="ngx-riwayat-value">' + r.pelunasanFormat + '</span>' +
                                '</div>' +
                            '</div>' +

                            '<div class="mt-2">' +
                                '<span class="' + statusClass + ' text-[10px] font-bold px-2.5 py-1 rounded-full">' + r.statusBaris + '</span>' +
                            '</div>' +

                        '</div>' +
                    '</div>'
                );
            }).join("");
        }

        return (
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 mt-4">' +
                '<div class="flex items-center justify-between mb-5">' +
                    '<div class="flex items-center gap-2.5">' +
                        '<i data-lucide="history" class="w-5 h-5 text-kop-700"></i>' +
                        '<h3 class="text-sm font-bold text-gray-900">Riwayat Transaksi Pinjaman</h3>' +
                    '</div>' +
                    '<span class="ngx-badge-count">' + jumlah + 'x Pinjam</span>' +
                '</div>' +
                '<div class="ngx-riwayat-list">' + isiList + '</div>' +
            '</div>'
        );
    }

    function renderHasil(n) {
        var isLunas = n.status === "LUNAS";
        var badgeClass = isLunas ? "ngx-badge-lunas" : "ngx-badge-belum";
        var badgeIcon = isLunas ? "check-circle-2" : "clock";
        var fillClass = isLunas ? "" : "belum-lunas";
        var persen = Math.max(0, Math.min(100, n.persentase || 0));

        resultBox.innerHTML =
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8">' +
                '<div class="flex items-center gap-3 mb-6">' +
                    '<div class="w-11 h-11 bg-kop-700 rounded-xl flex items-center justify-center flex-shrink-0">' +
                        '<i data-lucide="user" class="w-5 h-5 text-white"></i>' +
                    '</div>' +
                    '<div class="min-w-0">' +
                        '<p class="text-base font-bold text-gray-900 truncate">' + escapeHtml(n.nama) + '</p>' +
                        '<p class="text-xs text-gray-500">Status Tagihan</p>' +
                    '</div>' +
                '</div>' +

                '<div class="space-y-3 mb-6">' +
                    '<div class="flex items-center justify-between text-sm">' +
                        '<span class="text-gray-500">Pinjaman</span>' +
                        '<span class="font-semibold text-gray-800">' + n.pinjamanFormat + '</span>' +
                    '</div>' +
                    '<div class="flex items-center justify-between text-sm">' +
                        '<span class="text-gray-500">Pelunasan</span>' +
                        '<span class="font-semibold text-gray-800">' + n.pelunasanFormat + '</span>' +
                    '</div>' +
                    '<div class="flex items-center justify-between text-sm border-t border-kop-100 pt-3">' +
                        '<span class="text-gray-500">Sisa</span>' +
                        '<span class="font-bold text-kop-800">' + n.sisaFormat + '</span>' +
                    '</div>' +
                '</div>' +

                '<div class="mb-6">' +
                    '<div class="flex items-center justify-between mb-2">' +
                        '<span class="text-xs text-gray-500">Progres Pelunasan</span>' +
                        '<span class="text-xs font-bold text-kop-800">' + persen + '%</span>' +
                    '</div>' +
                    '<div class="ngx-progress-track">' +
                        '<div class="ngx-progress-fill ' + fillClass + '" id="ngxProgressFill"></div>' +
                    '</div>' +
                '</div>' +

                '<div class="inline-flex items-center gap-1.5 ' + badgeClass + ' text-xs font-bold px-3 py-1.5 rounded-full">' +
                    '<i data-lucide="' + badgeIcon + '" class="w-3.5 h-3.5"></i>' +
                    n.status +
                '</div>' +
            '</div>' +
            renderRiwayat(n);

        if (window.lucide) lucide.createIcons();

        // animasikan progress bar setelah render
        requestAnimationFrame(function () {
            var fill = document.getElementById("ngxProgressFill");
            if (fill) {
                requestAnimationFrame(function () {
                    fill.style.width = persen + "%";
                });
            }
        });
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        closeSuggest();
        var nama = input.value.trim();

        if (!nama) {
            showError("Nama tidak boleh kosong.");
            input.focus();
            return;
        }
        hideError();

        setLoadingBtn(true);
        renderLoading();

        var url = CEK_TAGIHAN_BASE_URL + "?nama=" + encodeURIComponent(nama);

        fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                setLoadingBtn(false);

                if (!data || data.success !== true) {
                    showError(data && data.message ? data.message : "Terjadi kesalahan, coba lagi.");
                    resultBox.innerHTML = "";
                    return;
                }

                var n = data.nasabah;

                if (!n || n.found === false) {
                    renderNotFound(nama);
                    return;
                }

                renderHasil(n);
            })
            .catch(function () {
                setLoadingBtn(false);
                renderNetworkError();
            });
    });
})();

/* =========================================================
   INFORMASI KAS — ringkasan kas real-time (KAS, PENGELUARAN,
   PINJAMAN, SISA KAS) diambil langsung dari sheet "KAS"
   ========================================================= */
(function () {
    var loadingBox = document.getElementById("infoKasLoading");
    var errorBox = document.getElementById("infoKasError");
    var errorText = document.getElementById("infoKasErrorText");
    var grid = document.getElementById("infoKasGrid");
    var elKas = document.getElementById("infoKasTotal");
    var elPengeluaran = document.getElementById("infoKasPengeluaran");
    var elPinjaman = document.getElementById("infoKasPinjaman");
    var elSisa = document.getElementById("infoKasSisa");
    var elUpdated = document.getElementById("infoKasUpdated");

    if (!grid) return;

    function muatInformasiKas() {

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        grid.classList.add("hidden");
        elUpdated.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=informasiKas")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (errorText) errorText.textContent = (data && data.message) ? data.message : "Gagal memuat data kas.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                elKas.textContent = data.kasFormat;
                elPengeluaran.textContent = data.pengeluaranFormat;
                elPinjaman.textContent = data.pinjamanFormat;
                elSisa.textContent = data.sisaKasFormat;

                var now = new Date();
                elUpdated.textContent = "Terakhir diperbarui: " + now.toLocaleString("id-ID");
                elUpdated.classList.remove("hidden");

                grid.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                if (errorText) errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });
    }

    muatInformasiKas();

    // Refresh otomatis setiap 5 menit supaya datanya tetap real-time
    setInterval(muatInformasiKas, 5 * 60 * 1000);

    var btnRefresh = document.getElementById("infoKasRefreshBtn");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", muatInformasiKas);
    }
})();

/* =========================================================
   TABEL IURAN BULANAN — per anggota (Januari s.d Desember + Total)
   Hanya aktif kalau elemen #iuranKasBody ada di halaman (mis. /informasi-kas)
   ========================================================= */
(function () {
    var loadingBox = document.getElementById("iuranKasLoading");
    var errorBox = document.getElementById("iuranKasError");
    var errorText = document.getElementById("iuranKasErrorText");
    var wrapper = document.getElementById("iuranKasWrapper");
    var theadRow = document.getElementById("iuranKasHeadRow");
    var tbody = document.getElementById("iuranKasBody");
    var kelompokBox = document.getElementById("iuranKasKelompok");
    var countBadge = document.getElementById("iuranKasCount");

    if (!tbody || !theadRow) return;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function inisial(nama) {
        var kata = String(nama || "").trim().split(/\s+/);
        var a = kata[0] ? kata[0][0] : "";
        var b = kata[1] ? kata[1][0] : "";
        return (a + b).toUpperCase();
    }

    function renderBarisAnggota(entry, isKelompok) {
        var selBulan = entry.bulan.map(function (b) {
            return '<td class="ngx-iuran-cell">' + (b.nominal > 0 ? b.nominalFormat.replace("Rp ", "") : '<span class="ngx-iuran-kosong">&mdash;</span>') + '</td>';
        }).join("");

        var namaCol = isKelompok
            ? ('<div class="flex items-center gap-2.5">' +
                '<div class="ngx-iuran-avatar ngx-iuran-avatar-kelompok"><i data-lucide="users" class="w-3.5 h-3.5"></i></div>' +
                '<span class="font-bold text-kop-800">' + escapeHtml(entry.nama) + '</span>' +
               '</div>')
            : ('<div class="flex items-center gap-2.5">' +
                '<div class="ngx-iuran-avatar">' + escapeHtml(inisial(entry.nama)) + '</div>' +
                '<span class="font-semibold text-gray-700 whitespace-nowrap">' + escapeHtml(entry.nama) + '</span>' +
               '</div>');

        return (
            '<tr class="' + (isKelompok ? "ngx-iuran-row-kelompok" : "ngx-iuran-row") + '">' +
                '<td class="ngx-iuran-cell-nama">' + namaCol + '</td>' +
                selBulan +
                '<td class="ngx-iuran-cell ngx-iuran-total">' + entry.totalFormat.replace("Rp ", "") + '</td>' +
            '</tr>'
        );
    }

    function muatIuranKas() {

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        wrapper.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=iuranKas")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (errorText) errorText.textContent = (data && data.message) ? data.message : "Gagal memuat data iuran.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                // Header bulan (dinamis sesuai label dari sheet)
                theadRow.innerHTML =
                    '<th class="ngx-iuran-th ngx-iuran-th-nama">Nama</th>' +
                    data.labelBulan.map(function (l) {
                        return '<th class="ngx-iuran-th">' + escapeHtml(String(l).slice(0, 3)) + '</th>';
                    }).join("") +
                    '<th class="ngx-iuran-th ngx-iuran-th-total">Total</th>';

                // Baris anggota
                var rows = data.anggota.map(function (entry) {
                    return renderBarisAnggota(entry, false);
                }).join("");

                if (data.kelompok) {
                    rows += renderBarisAnggota(data.kelompok, true);
                }

                tbody.innerHTML = rows || '<tr><td colspan="' + (data.labelBulan.length + 2) + '" class="text-center py-8 text-xs text-gray-400">Belum ada data iuran</td></tr>';

                if (countBadge) countBadge.textContent = data.jumlahAnggota + " Anggota";

                wrapper.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                if (errorText) errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });
    }

    muatIuranKas();

    var btnRefresh = document.getElementById("iuranKasRefreshBtn");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", muatIuranKas);
    }
})();

/* =========================================================
   RINCIAN PENGELUARAN PER BULAN — accordion
   Hanya aktif kalau elemen #pengeluaranAccordion ada di halaman
   ========================================================= */
(function () {
    var loadingBox = document.getElementById("pengeluaranLoading");
    var errorBox = document.getElementById("pengeluaranError");
    var errorText = document.getElementById("pengeluaranErrorText");
    var wrapper = document.getElementById("pengeluaranWrapper");
    var accordion = document.getElementById("pengeluaranAccordion");
    var grandTotalEl = document.getElementById("pengeluaranGrandTotal");

    if (!accordion) return;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
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

    function capitalize(s) {
        s = String(s || "").toLowerCase();
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function muatPengeluaran() {

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        wrapper.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=rincianPengeluaran")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    if (errorText) errorText.textContent = (data && data.message) ? data.message : "Gagal memuat data pengeluaran.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                accordion.innerHTML = data.bulan.map(renderBulan).join("");

                if (grandTotalEl) grandTotalEl.textContent = data.grandTotalFormat;

                wrapper.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

                // Pasang klik expand/collapse
                var items = accordion.querySelectorAll(".ngx-accordion-item:not(.kosong)");
                items.forEach(function (el) {
                    var header = el.querySelector(".ngx-accordion-header");
                    header.addEventListener("click", function () {
                        el.classList.toggle("open");
                    });
                });

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                if (errorText) errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });
    }

    muatPengeluaran();

    var btnRefresh = document.getElementById("pengeluaranRefreshBtn");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", muatPengeluaran);
    }
})();

/* =========================================================
   FORMULIR SIMPANAN — dropdown metode, drag&drop upload, SweetAlert
   Hanya aktif kalau elemen #simpananForm ada di halaman (/simpanan)
   ========================================================= */
(function () {
    var form = document.getElementById("simpananForm");
    if (!form) return;

    var namaInput = document.getElementById("simpananNama");
    var suggestBox = document.getElementById("simpananSuggest");
    var jenisSelect = document.getElementById("simpananJenis");
    var nominalInput = document.getElementById("simpananNominal");
    var keteranganInput = document.getElementById("simpananKeterangan");
    var noHpInput = document.getElementById("simpananNoHp");
    var emailInput = document.getElementById("simpananEmail");
    var metodeSelect = document.getElementById("simpananMetode");
    var rekeningCard = document.getElementById("simpananRekeningCard");
    var uploadSection = document.getElementById("simpananUploadSection");
    var dropzone = document.getElementById("simpananDropzone");
    var fileInput = document.getElementById("simpananFileInput");
    var progressTrack = document.getElementById("simpananProgressTrack");
    var progressFill = document.getElementById("simpananProgressFill");
    var formError = document.getElementById("simpananFormError");
    var submitBtn = document.getElementById("simpananSubmitBtn");
    var btnCopyRek = document.getElementById("simpananCopyRekening");

    var fileTerpilih = null; // { base64, mime, nama, size, isImage, dataUrl }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    /* ---- Autocomplete nama (pola sama seperti fitur lain) ---- */
    var daftarNama = [];
    var daftarNamaSiap = false;
    var suggestItems = [];
    var debounceTimer = null;

    fetch(NGX_API_BASE_URL + "?action=daftarNama")
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data.success && Array.isArray(data.daftarNama)) daftarNama = data.daftarNama;
            daftarNamaSiap = true;
        })
        .catch(function () { daftarNamaSiap = true; });

    function highlightMatch(nama, query) {
        var idx = nama.toUpperCase().indexOf(query.toUpperCase());
        if (idx === -1) return escapeHtml(nama);
        return escapeHtml(nama.slice(0, idx)) + "<mark>" + escapeHtml(nama.slice(idx, idx + query.length)) + "</mark>" + escapeHtml(nama.slice(idx + query.length));
    }

    function closeSuggest() {
        suggestBox.classList.add("hidden");
        suggestBox.innerHTML = "";
        suggestItems = [];
    }

    function tampilkanSuggest(query) {
        if (!query) { closeSuggest(); return; }
        var hasil = daftarNama.filter(function (n) { return n.toUpperCase().indexOf(query.toUpperCase()) !== -1; }).slice(0, 8);

        if (hasil.length === 0) {
            suggestBox.innerHTML = daftarNamaSiap
                ? '<div class="ngx-suggest-empty">Nama tidak ditemukan, boleh diketik manual</div>'
                : '<div class="ngx-suggest-empty">Memuat daftar nama...</div>';
            suggestBox.classList.remove("hidden");
            suggestItems = [];
            return;
        }

        suggestBox.innerHTML = hasil.map(function (nama) {
            return '<div class="ngx-suggest-item" data-nama="' + escapeHtml(nama) + '">' +
                '<i data-lucide="user-round" class="w-3.5 h-3.5 text-kop-500 flex-shrink-0"></i>' +
                '<span>' + highlightMatch(nama, query) + '</span></div>';
        }).join("");

        suggestBox.classList.remove("hidden");
        if (window.lucide) lucide.createIcons();

        suggestItems = Array.prototype.slice.call(suggestBox.querySelectorAll(".ngx-suggest-item"));
        suggestItems.forEach(function (el) {
            el.addEventListener("mousedown", function (e) {
                e.preventDefault();
                namaInput.value = el.getAttribute("data-nama");
                closeSuggest();
            });
        });
    }

    if (namaInput && suggestBox) {
        namaInput.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            var q = namaInput.value.trim();
            debounceTimer = setTimeout(function () { tampilkanSuggest(q); }, 120);
        });
        document.addEventListener("click", function (e) {
            if (!suggestBox.contains(e.target) && e.target !== namaInput) closeSuggest();
        });
    }

    /* ---- Toggle tampilan berdasarkan Metode Pembayaran ---- */
    function updateMetodeUI() {
        if (metodeSelect.value === "Transfer Bank") {
            rekeningCard.classList.remove("hidden");
            uploadSection.classList.remove("hidden");
        } else {
            rekeningCard.classList.add("hidden");
            uploadSection.classList.add("hidden");
        }
    }
    if (metodeSelect) {
        metodeSelect.addEventListener("change", updateMetodeUI);
        updateMetodeUI();
    }

    /* ---- Salin nomor rekening ---- */
    if (btnCopyRek) {
        btnCopyRek.addEventListener("click", function () {
            var nomor = document.getElementById("simpananNomorRek").textContent.trim();
            var tandai = function () {
                btnCopyRek.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i><span>Tersalin!</span>';
                if (window.lucide) lucide.createIcons();
                setTimeout(function () {
                    btnCopyRek.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i><span>Salin</span>';
                    if (window.lucide) lucide.createIcons();
                }, 1800);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(nomor).then(tandai).catch(tandai);
            } else { tandai(); }
        });
    }

    /* ---- Drag & drop + pilih file ---- */
    var EKSTENSI_DIIZINKAN = ["jpg", "jpeg", "png", "pdf"];

    function validasiFile(file) {
        var ekstensi = (file.name.split(".").pop() || "").toLowerCase();
        if (EKSTENSI_DIIZINKAN.indexOf(ekstensi) === -1) {
            return "Jenis file tidak didukung. Hanya JPG, JPEG, PNG, atau PDF.";
        }
        if (file.size > 5 * 1024 * 1024) {
            return "Ukuran file maksimal 5MB.";
        }
        return null;
    }

    function formatUkuran(bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function htmlDropzoneKosong() {
        return (
            '<div class="ngx-dropzone-icon"><i data-lucide="upload-cloud" class="w-5 h-5"></i></div>' +
            '<p class="ngx-dropzone-text">Klik atau seret foto/PDF ke sini</p>' +
            '<p class="ngx-dropzone-subtext">JPG, JPEG, PNG, atau PDF &middot; maks 5MB</p>'
        );
    }

    function renderPreview() {

        if (!fileTerpilih) {
            dropzone.classList.remove("terisi");
            dropzone.innerHTML = htmlDropzoneKosong();
            if (window.lucide) lucide.createIcons();
            return;
        }

        dropzone.classList.add("terisi");

        var thumbHtml = fileTerpilih.isImage
            ? '<img src="' + fileTerpilih.dataUrl + '" class="ngx-file-preview-thumb">'
            : '<div class="ngx-file-preview-icon"><i data-lucide="file-text" class="w-6 h-6"></i></div>';

        dropzone.innerHTML =
            '<div class="ngx-file-preview">' +
                thumbHtml +
                '<div class="ngx-file-preview-info">' +
                    '<div class="ngx-file-preview-name">' + escapeHtml(fileTerpilih.nama) + '</div>' +
                    '<div class="ngx-file-preview-size">' + formatUkuran(fileTerpilih.size) + '</div>' +
                '</div>' +
                '<div class="ngx-file-remove" id="simpananHapusFile"><i data-lucide="x" class="w-4 h-4"></i></div>' +
            '</div>';

        if (window.lucide) lucide.createIcons();

        document.getElementById("simpananHapusFile").addEventListener("click", function (e) {
            e.stopPropagation();
            fileTerpilih = null;
            fileInput.value = "";
            renderPreview();
        });

    }

    function prosesFile(file) {

        var pesanError = validasiFile(file);

        if (pesanError) {
            formError.textContent = pesanError;
            formError.classList.remove("hidden");
            return;
        }
        formError.classList.add("hidden");

        var isImage = /^image\/(jpeg|png|jpg)/.test(file.type) || /\.(jpg|jpeg|png)$/i.test(file.name);

        var reader = new FileReader();
        reader.onload = function () {

            var hasil = reader.result;
            var base64 = hasil.split(",")[1];

            fileTerpilih = {
                base64: base64,
                mime: file.type || (isImage ? "image/jpeg" : "application/pdf"),
                nama: file.name,
                size: file.size,
                isImage: isImage,
                dataUrl: hasil
            };

            renderPreview();

        };
        reader.readAsDataURL(file);

    }

    if (dropzone && fileInput) {

        dropzone.innerHTML = htmlDropzoneKosong();
        if (window.lucide) lucide.createIcons();

        dropzone.addEventListener("click", function () { fileInput.click(); });

        dropzone.addEventListener("dragover", function (e) {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });
        dropzone.addEventListener("dragleave", function () {
            dropzone.classList.remove("dragover");
        });
        dropzone.addEventListener("drop", function (e) {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            var file = e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) prosesFile(file);
        });

        fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (file) prosesFile(file);
        });

    }

    /* ---- Submit form ---- */
    function setLoadingSubmit(isLoading) {
        submitBtn.disabled = isLoading;
        submitBtn.innerHTML = isLoading
            ? '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Mengirim...</span>'
            : '<i data-lucide="send" class="w-4 h-4"></i><span>Simpan</span>';
        if (window.lucide) lucide.createIcons();
    }

    function updateProgress(persen) {
        progressTrack.classList.remove("hidden");
        progressFill.style.width = persen + "%";
    }

    function tampilkanErrorForm(pesan) {
        formError.textContent = pesan;
        formError.classList.remove("hidden");
        setLoadingSubmit(false);
    }

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        formError.classList.add("hidden");

        var nama = namaInput.value.trim();
        var jenis = jenisSelect.value;
        var nominal = parseFloat(String(nominalInput.value).replace(/[^0-9.-]/g, ""));
        var metode = metodeSelect.value;

        if (!nama) return tampilkanErrorForm("Nama anggota tidak boleh kosong.");
        if (!jenis) return tampilkanErrorForm("Pilih jenis simpanan terlebih dahulu.");
        if (!nominal || nominal <= 0) return tampilkanErrorForm("Nominal simpanan tidak valid.");
        if (metode === "Transfer Bank" && !fileTerpilih) return tampilkanErrorForm("Bukti transfer wajib diupload untuk metode Transfer Bank.");

        var body = new URLSearchParams();
        body.append("action", "kirimSimpanan");
        body.append("nama", nama);
        body.append("jenisSimpanan", jenis);
        body.append("nominal", nominal);
        body.append("keterangan", keteranganInput.value.trim());
        body.append("noHp", noHpInput.value.trim());
        body.append("email", emailInput.value.trim());
        body.append("metodePembayaran", metode);

        if (metode === "Transfer Bank" && fileTerpilih) {
            body.append("fotoBase64", fileTerpilih.base64);
            body.append("fotoMime", fileTerpilih.mime);
            body.append("fotoNama", fileTerpilih.nama);
        }

        setLoadingSubmit(true);
        updateProgress(0);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", NGX_API_BASE_URL, true);
        xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");

        xhr.upload.onprogress = function (ev) {
            if (ev.lengthComputable) {
                updateProgress(Math.round((ev.loaded / ev.total) * 100));
            }
        };

        xhr.onload = function () {

            setLoadingSubmit(false);
            progressTrack.classList.add("hidden");

            var data;
            try { data = JSON.parse(xhr.responseText); } catch (err) { data = null; }

            if (!data || data.success !== true) {
                tampilkanErrorForm(data && data.message ? data.message : "Gagal mengirim data, coba lagi.");
                return;
            }

            form.reset();
            fileTerpilih = null;
            renderPreview();
            updateMetodeUI();

            if (window.Swal) {
                Swal.fire({
                    title: "Berhasil",
                    text: "Terima kasih. Data simpanan berhasil dikirim dan akan diverifikasi oleh Admin terlebih dahulu.",
                    icon: "success",
                    confirmButtonColor: "#0F766E"
                });
            } else {
                alert("Berhasil! Data simpanan berhasil dikirim dan akan diverifikasi oleh Admin terlebih dahulu.");
            }

        };

        xhr.onerror = function () {
            setLoadingSubmit(false);
            progressTrack.classList.add("hidden");
            tampilkanErrorForm("Gagal terhubung ke server, coba lagi.");
        };

        xhr.send(body.toString());

    });

})();

/* =========================================================
   SALIN NOMOR REKENING — halaman /pelunasan
   ========================================================= */
(function () {
    var btn = document.getElementById("btnCopyRekening");
    var nomorEl = document.getElementById("rekeningNomor");

    if (!btn || !nomorEl) return;

    btn.addEventListener("click", function () {
        var nomor = nomorEl.textContent.trim();

        var salin = function () {
            btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i><span>Tersalin!</span>';
            if (window.lucide) lucide.createIcons();
            setTimeout(function () {
                btn.innerHTML = '<i data-lucide="copy" class="w-3 h-3"></i><span>Salin</span>';
                if (window.lucide) lucide.createIcons();
            }, 1800);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(nomor).then(salin).catch(salin);
        } else {
            salin();
        }
    });
})();

/* =========================================================
   PELUNASAN — cari nasabah, tampilkan pinjaman aktif, proses bayar
   Hanya aktif kalau elemen #pelunasanForm ada di halaman (/pelunasan)
   ========================================================= */
(function () {
    var form = document.getElementById("pelunasanForm");
    var input = document.getElementById("pelunasanNama");
    var btn = document.getElementById("pelunasanBtn");
    var errorMsg = document.getElementById("pelunasanError");
    var errorText = document.getElementById("pelunasanErrorText");
    var resultBox = document.getElementById("pelunasanResult");
    var suggestBox = document.getElementById("pelunasanSuggest");

    if (!form || !input || !resultBox) return;

    var fotoTersimpan = {}; // { [rowNumber]: { base64, mime, nama } } — sementara sebelum dikirim

    /* ---- Autocomplete nama (pola sama seperti Cek Tagihan) ---- */
    var daftarNama = [];
    var daftarNamaSiap = false;
    var suggestActiveIndex = -1;
    var suggestItems = [];
    var debounceTimer = null;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function muatDaftarNama() {
        fetch(NGX_API_BASE_URL + "?action=daftarNama")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data && data.success && Array.isArray(data.daftarNama)) {
                    daftarNama = data.daftarNama;
                }
                daftarNamaSiap = true;
            })
            .catch(function () { daftarNamaSiap = true; });
    }
    muatDaftarNama();

    function highlightMatch(nama, query) {
        var idx = nama.toUpperCase().indexOf(query.toUpperCase());
        if (idx === -1) return escapeHtml(nama);
        return escapeHtml(nama.slice(0, idx)) + "<mark>" + escapeHtml(nama.slice(idx, idx + query.length)) + "</mark>" + escapeHtml(nama.slice(idx + query.length));
    }

    function closeSuggest() {
        suggestBox.classList.add("hidden");
        suggestBox.innerHTML = "";
        suggestItems = [];
        suggestActiveIndex = -1;
    }

    function setActiveSuggest(i) {
        suggestItems.forEach(function (el) { el.classList.remove("active"); });
        if (suggestItems[i]) {
            suggestItems[i].classList.add("active");
            suggestItems[i].scrollIntoView({ block: "nearest" });
        }
        suggestActiveIndex = i;
    }

    function pilihNama(nama) {
        input.value = nama;
        closeSuggest();
        hideError();
        input.focus();
    }

    function tampilkanSuggest(query) {
        if (!query) { closeSuggest(); return; }

        var hasil = daftarNama.filter(function (n) {
            return n.toUpperCase().indexOf(query.toUpperCase()) !== -1;
        }).slice(0, 8);

        if (hasil.length === 0) {
            suggestBox.innerHTML = daftarNamaSiap
                ? '<div class="ngx-suggest-empty">Nama tidak ditemukan</div>'
                : '<div class="ngx-suggest-empty">Memuat daftar nama...</div>';
            suggestBox.classList.remove("hidden");
            suggestItems = [];
            suggestActiveIndex = -1;
            return;
        }

        suggestBox.innerHTML = hasil.map(function (nama) {
            return '<div class="ngx-suggest-item" data-nama="' + escapeHtml(nama) + '">' +
                '<i data-lucide="user-round" class="w-3.5 h-3.5 text-kop-500 flex-shrink-0"></i>' +
                '<span>' + highlightMatch(nama, query) + '</span>' +
                '</div>';
        }).join("");

        suggestBox.classList.remove("hidden");
        if (window.lucide) lucide.createIcons();

        suggestItems = Array.prototype.slice.call(suggestBox.querySelectorAll(".ngx-suggest-item"));
        suggestActiveIndex = -1;

        suggestItems.forEach(function (el) {
            el.addEventListener("mousedown", function (e) {
                e.preventDefault();
                pilihNama(el.getAttribute("data-nama"));
            });
        });
    }

    input.addEventListener("input", function () {
        hideError();
        var query = input.value.trim();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { tampilkanSuggest(query); }, 120);
    });

    input.addEventListener("focus", function () {
        var query = input.value.trim();
        if (query) tampilkanSuggest(query);
    });

    input.addEventListener("keydown", function (e) {
        if (suggestBox.classList.contains("hidden") || suggestItems.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveSuggest(Math.min(suggestActiveIndex + 1, suggestItems.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveSuggest(Math.max(suggestActiveIndex - 1, 0));
        } else if (e.key === "Enter") {
            if (suggestActiveIndex >= 0 && suggestItems[suggestActiveIndex]) {
                e.preventDefault();
                pilihNama(suggestItems[suggestActiveIndex].getAttribute("data-nama"));
            }
        } else if (e.key === "Escape") {
            closeSuggest();
        }
    });

    document.addEventListener("click", function (e) {
        if (!suggestBox.contains(e.target) && e.target !== input) closeSuggest();
    });

    function showError(msg) {
        errorText.textContent = msg || "Nama tidak boleh kosong.";
        errorMsg.classList.remove("hidden");
    }
    function hideError() { errorMsg.classList.add("hidden"); }

    function setLoadingBtn(isLoading) {
        if (!btn) return;
        btn.disabled = isLoading;
        btn.innerHTML = isLoading
            ? '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Mencari...</span>'
            : '<i data-lucide="search-check" class="w-4 h-4"></i><span>Cari</span>';
        if (window.lucide) lucide.createIcons();
    }

    function renderLoading() {
        resultBox.innerHTML =
            '<div class="flex flex-col items-center justify-center gap-3 py-10">' +
                '<div class="ngx-spinner"></div>' +
                '<p class="text-sm text-gray-500">Mengambil data pinjaman...</p>' +
            '</div>';
    }

    function renderNetworkError() {
        resultBox.innerHTML =
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 text-center">' +
                '<i data-lucide="wifi-off" class="w-8 h-8 text-red-500 mx-auto mb-3"></i>' +
                '<p class="text-sm font-semibold text-gray-800 mb-1">Gagal terhubung ke server</p>' +
                '<p class="text-xs text-gray-500">Silakan coba lagi beberapa saat lagi.</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    }

    function renderKosong(nama) {
        resultBox.innerHTML =
            '<div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 text-center">' +
                '<i data-lucide="inbox" class="w-8 h-8 text-gray-300 mx-auto mb-3"></i>' +
                '<p class="text-sm font-semibold text-gray-800 mb-1">Tidak ada pinjaman aktif</p>' +
                '<p class="text-xs text-gray-500">"' + escapeHtml(nama) + '" tidak memiliki data pinjaman tercatat.</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
    }

    function kartuPinjaman(p, nama) {

        var isLunas = p.status === "LUNAS";
        var badgeClass = isLunas ? "ngx-badge-lunas" : "ngx-badge-belum";
        var badgeIcon = isLunas ? "check-circle-2" : "clock";

        var formBayar = isLunas ? "" : (
            '<div class="ngx-bayar-row">' +
                '<input type="text" inputmode="numeric" class="ngx-bayar-input ngx-bayar-input-nominal" value="' + p.sisa + '" data-row="' + p.rowNumber + '">' +
                '<button type="button" class="ngx-btn-bayar inline-flex items-center justify-center gap-2 bg-kop-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-kop-800 transition whitespace-nowrap" data-row="' + p.rowNumber + '">' +
                    '<i data-lucide="wallet" class="w-4 h-4"></i> Bayar Sekarang' +
                '</button>' +
            '</div>' +
            '<label class="ngx-upload-box mt-2.5" data-row="' + p.rowNumber + '">' +
                '<input type="file" accept="image/*" class="ngx-upload-input hidden" data-row="' + p.rowNumber + '">' +
                '<i data-lucide="image-plus" class="w-4 h-4 text-kop-600 flex-shrink-0 ngx-upload-icon"></i>' +
                '<span class="ngx-upload-text">Upload bukti transfer (foto/screenshot) &mdash; wajib</span>' +
            '</label>' +
            '<div class="ngx-bayar-confirm-slot" data-row="' + p.rowNumber + '"></div>'
        );

        return (
            '<div class="ngx-pinjaman-card' + (isLunas ? " lunas" : "") + '" data-row="' + p.rowNumber + '" data-nama="' + escapeHtml(nama) + '">' +
                '<div class="ngx-pinjaman-head">' +
                    '<div>' +
                        '<p class="text-sm font-bold text-gray-900">' + escapeHtml(p.timestampFormat) + '</p>' +
                        '<p class="text-xs text-gray-500 mt-0.5">' + escapeHtml(p.alasan) + '</p>' +
                    '</div>' +
                    '<span class="inline-flex items-center gap-1.5 ' + badgeClass + ' text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">' +
                        '<i data-lucide="' + badgeIcon + '" class="w-3.5 h-3.5"></i>' + p.status +
                    '</span>' +
                '</div>' +
                '<div class="ngx-pinjaman-grid">' +
                    '<div class="ngx-pinjaman-grid-item"><div class="ngx-pinjaman-grid-label">Pinjaman</div><div class="ngx-pinjaman-grid-value">' + p.nominalFormat + '</div></div>' +
                    '<div class="ngx-pinjaman-grid-item"><div class="ngx-pinjaman-grid-label">Sudah Dibayar</div><div class="ngx-pinjaman-grid-value pelunasan-value">' + p.pelunasanFormat + '</div></div>' +
                    '<div class="ngx-pinjaman-grid-item"><div class="ngx-pinjaman-grid-label">Sisa</div><div class="ngx-pinjaman-grid-value text-kop-800 sisa-value">' + p.sisaFormat + '</div></div>' +
                '</div>' +
                formBayar +
            '</div>'
        );
    }

    function renderHasil(data) {

        var nama = data.nama;

        var kartuHtml = data.pinjaman.map(function (p) { return kartuPinjaman(p, nama); }).join("");

        resultBox.innerHTML =
            '<div class="hasil-fade-in space-y-4">' +
                '<div class="flex items-center justify-between px-1">' +
                    '<p class="text-sm font-bold text-gray-900">' + escapeHtml(nama) + '</p>' +
                    '<span class="ngx-badge-count">' + data.jumlahPinjaman + ' pinjaman</span>' +
                '</div>' +
                kartuHtml +
            '</div>';

        if (window.lucide) lucide.createIcons();
        pasangEventBayar();
    }

    function pasangEventBayar() {

        // ---- Upload foto bukti transfer per kartu ----
        var inputFoto = resultBox.querySelectorAll(".ngx-upload-input");

        inputFoto.forEach(function (inp) {

            inp.addEventListener("change", function () {

                var rowNumber = inp.getAttribute("data-row");
                var box = resultBox.querySelector('.ngx-upload-box[data-row="' + rowNumber + '"]');
                var textEl = box.querySelector(".ngx-upload-text");
                var file = inp.files && inp.files[0];

                if (!file) return;

                if (file.size > 15 * 1024 * 1024) {
                    textEl.textContent = "Ukuran foto maksimal 15MB, pilih foto lain.";
                    delete fotoTersimpan[rowNumber];
                    box.classList.remove("terisi");
                    return;
                }

                var reader = new FileReader();
                reader.onload = function () {

                    var hasil = reader.result; // data:image/xxx;base64,AAAA...
                    var base64 = hasil.split(",")[1];

                    fotoTersimpan[rowNumber] = {
                        base64: base64,
                        mime: file.type || "image/jpeg",
                        nama: file.name || "bukti-transfer.jpg"
                    };

                    box.classList.add("terisi");

                    var thumbLama = box.querySelector(".ngx-upload-thumb");
                    if (thumbLama) thumbLama.remove();

                    var icon = box.querySelector(".ngx-upload-icon");
                    var thumb = document.createElement("img");
                    thumb.src = hasil;
                    thumb.className = "ngx-upload-thumb";
                    box.insertBefore(thumb, icon);
                    icon.classList.add("hidden");

                    textEl.textContent = file.name + " ✓ siap diupload";

                };
                reader.readAsDataURL(file);

            });

        });

        // ---- Tombol Bayar Sekarang ----
        var tombolBayar = resultBox.querySelectorAll(".ngx-btn-bayar");

        tombolBayar.forEach(function (tombol) {

            tombol.addEventListener("click", function () {

                var rowNumber = tombol.getAttribute("data-row");
                var card = resultBox.querySelector('.ngx-pinjaman-card[data-row="' + rowNumber + '"]');
                var inputNominal = card.querySelector(".ngx-bayar-input-nominal");
                var slot = card.querySelector('.ngx-bayar-confirm-slot[data-row="' + rowNumber + '"]');

                var jumlah = parseFloat(String(inputNominal.value).replace(/[^0-9.-]/g, ""));

                if (!jumlah || jumlah <= 0) {
                    slot.innerHTML = '<p class="text-xs text-red-600 mt-2">Masukkan jumlah pembayaran yang valid.</p>';
                    return;
                }

                if (!fotoTersimpan[rowNumber]) {
                    slot.innerHTML = '<p class="text-xs text-red-600 mt-2">Upload dulu foto bukti transfer sebelum konfirmasi.</p>';
                    return;
                }

                var namaFormat = jumlah.toLocaleString("id-ID");

                slot.innerHTML =
                    '<div class="ngx-bayar-confirm">' +
                        '<p class="text-xs text-gray-700 mb-2.5">Konfirmasi pembayaran sebesar <strong>Rp ' + namaFormat + '</strong> untuk pinjaman ini?</p>' +
                        '<div class="flex gap-2">' +
                            '<button type="button" class="ngx-btn-ya-bayar flex-1 bg-kop-700 text-white text-xs font-bold py-2 rounded-lg hover:bg-kop-800 transition">Ya, Konfirmasi</button>' +
                            '<button type="button" class="ngx-btn-batal-bayar flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition">Batal</button>' +
                        '</div>' +
                    '</div>';

                slot.querySelector(".ngx-btn-batal-bayar").addEventListener("click", function () {
                    slot.innerHTML = "";
                });

                slot.querySelector(".ngx-btn-ya-bayar").addEventListener("click", function () {
                    kirimPembayaran(card, rowNumber, jumlah, slot);
                });

            });

        });

    }

    function kirimPembayaran(card, rowNumber, jumlah, slot) {

        var nama = card.getAttribute("data-nama");
        var foto = fotoTersimpan[rowNumber];

        slot.innerHTML = '<div class="flex items-center gap-2 mt-2"><span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span class="text-xs text-gray-500">Mengupload bukti & memproses pembayaran...</span></div>';

        var body = new URLSearchParams();
        body.append("action", "bayarPelunasan");
        body.append("rowNumber", rowNumber);
        body.append("nama", nama);
        body.append("jumlah", jumlah);
        body.append("fotoBase64", foto.base64);
        body.append("fotoMime", foto.mime);
        body.append("fotoNama", foto.nama);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    slot.innerHTML = '<p class="text-xs text-red-600 mt-2">' + escapeHtml(data && data.message ? data.message : "Gagal memproses pembayaran.") + '</p>';
                    return;
                }

                // Update kartu secara langsung tanpa reload
                card.querySelector(".pelunasan-value").textContent = data.pelunasanFormat;
                card.querySelector(".sisa-value").textContent = data.sisaFormat;

                var pesanLebih = data.kelebihan > 0
                    ? ('<p class="text-[11px] text-amber-600 mt-1">Catatan: kelebihan bayar Rp ' + data.kelebihan.toLocaleString("id-ID") + ' tidak diproses karena melebihi sisa tagihan.</p>')
                    : '';

                if (data.status === "LUNAS") {

                    var badge = card.querySelector(".ngx-badge-belum, .ngx-badge-lunas");
                    if (badge) {
                        badge.className = "inline-flex items-center gap-1.5 ngx-badge-lunas text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap";
                        badge.innerHTML = '<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> LUNAS';
                    }

                    card.classList.add("lunas");

                    var bayarRow = card.querySelector(".ngx-bayar-row");
                    if (bayarRow) bayarRow.remove();

                    var uploadBox = card.querySelector(".ngx-upload-box");
                    if (uploadBox) uploadBox.remove();

                    slot.innerHTML = '<p class="text-xs text-emerald-700 font-semibold mt-2">✓ Pembayaran berhasil, pinjaman ini sudah lunas!</p>' + pesanLebih;

                } else {

                    delete fotoTersimpan[rowNumber];

                    var uploadBox2 = card.querySelector('.ngx-upload-box[data-row="' + rowNumber + '"]');
                    if (uploadBox2) {
                        uploadBox2.classList.remove("terisi");
                        var thumb2 = uploadBox2.querySelector(".ngx-upload-thumb");
                        if (thumb2) thumb2.remove();
                        var icon2 = uploadBox2.querySelector(".ngx-upload-icon");
                        if (icon2) icon2.classList.remove("hidden");
                        uploadBox2.querySelector(".ngx-upload-text").textContent = "Upload bukti transfer (foto/screenshot) — wajib";
                        uploadBox2.querySelector(".ngx-upload-input").value = "";
                    }

                    slot.innerHTML = '<p class="text-xs text-emerald-700 font-semibold mt-2">✓ Pembayaran Rp ' + data.jumlahDiterima.toLocaleString("id-ID") + ' berhasil dicatat.</p>' + pesanLebih;

                }

                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                slot.innerHTML = '<p class="text-xs text-red-600 mt-2">Gagal terhubung ke server, coba lagi.</p>';
            });

    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        closeSuggest();
        var nama = input.value.trim();

        if (!nama) {
            showError("Nama tidak boleh kosong.");
            input.focus();
            return;
        }
        hideError();

        setLoadingBtn(true);
        renderLoading();

        fetch(NGX_API_BASE_URL + "?action=pinjamanAktif&nama=" + encodeURIComponent(nama))
            .then(function (res) { return res.json(); })
            .then(function (data) {
                setLoadingBtn(false);

                if (!data || data.success !== true) {
                    showError(data && data.message ? data.message : "Terjadi kesalahan, coba lagi.");
                    resultBox.innerHTML = "";
                    return;
                }

                if (!data.pinjaman || data.pinjaman.length === 0) {
                    renderKosong(nama);
                    return;
                }

                renderHasil(data);
            })
            .catch(function () {
                setLoadingBtn(false);
                renderNetworkError();
            });
    });
})();
