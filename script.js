// Initialize Lucide Icons
lucide.createIcons();

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

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

/* =========================================================
   CEK TAGIHAN — fetch ke Apps Script API, render di halaman
   ========================================================= */
(function () {
    // Ganti URL ini kalau nanti deploy ulang Apps Script
    var CEK_TAGIHAN_BASE_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

    var form = document.getElementById("cekTagihanForm");
    var input = document.getElementById("cekTagihanNama");
    var btn = document.getElementById("cekTagihanBtn");
    var errorMsg = document.getElementById("cekTagihanError");
    var errorText = document.getElementById("cekTagihanErrorText");
    var resultBox = document.getElementById("cekTagihanResult");

    if (!form || !input || !resultBox) return;

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
                '<p class="text-xs text-gray-500">Nama "' + nama + '" tidak terdaftar. Periksa kembali ejaan nama Anda.</p>' +
            '</div>';
        if (window.lucide) lucide.createIcons();
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
                        '<p class="text-base font-bold text-gray-900 truncate">' + n.nama + '</p>' +
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
            '</div>';

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

    input.addEventListener("input", function () {
        hideError();
    });
})();
