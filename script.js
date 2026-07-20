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
