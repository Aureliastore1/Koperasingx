// Ganti URL ini kalau nanti deploy ulang Apps Script (sama dengan script.js utama)
var NGX_API_BASE_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

if (window.lucide) lucide.createIcons();

/* =========================================================
   BOTTOM NAV MOBILE — otomatis disuntikkan di semua halaman
   admin (dideteksi dari adanya .ngx-admin-sidebar), supaya
   tidak perlu edit tiap file HTML satu-satu.
   ========================================================= */
(function () {

    var sidebar = document.querySelector(".ngx-admin-sidebar");
    if (!sidebar) return; // bukan halaman admin

    document.body.classList.add("ngx-has-bottomnav");

    var halamanSekarang = window.location.pathname;

    function aktifJika(path) {
        return halamanSekarang.indexOf(path) === 0 ? " aktif" : "";
    }

    var itemUtama = [
        { href: "/admin/dashboard/", icon: "layout-dashboard", label: "Dashboard" },
        { href: "/admin/pinjaman/", icon: "banknote", label: "Pinjaman" },
        { href: "/admin/simpanan/", icon: "piggy-bank", label: "Simpanan" },
        { href: "/admin/followup/", icon: "phone-call", label: "Follow Up" }
    ];

    var itemLainnya = [
        { href: "/admin/anggota/", icon: "users", label: "Data Anggota" },
        { href: "/admin/pengeluaran/", icon: "receipt", label: "Catatan Bulanan" },
        { href: "/admin/laporan/", icon: "file-bar-chart", label: "Laporan" },
        { href: "/admin/users/", icon: "shield", label: "Kelola Admin" },
        { href: "/admin/settings/", icon: "settings", label: "Settings" }
    ];

    var html = '<div class="ngx-admin-bottomnav">';

    itemUtama.forEach(function (it) {
        html += '<a href="' + it.href + '" class="ngx-admin-bottomnav-item' + aktifJika(it.href) + '">' +
            '<i data-lucide="' + it.icon + '" class="w-5 h-5"></i><span>' + it.label + '</span></a>';
    });

    html += '<div class="ngx-admin-bottomnav-item" id="ngxBottomNavMore">' +
        '<i data-lucide="menu" class="w-5 h-5"></i><span>Lainnya</span></div>';
    html += '</div>';

    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById("ngxBottomNavMore").addEventListener("click", function () {

        var sheetHtml = '<div class="ngx-admin-bottomnav-more-sheet" id="ngxMoreSheet"><div class="ngx-admin-bottomnav-more-box">' +
            '<p class="text-sm font-bold text-gray-800 mb-2">Menu Lainnya</p>';

        itemLainnya.forEach(function (it) {
            sheetHtml += '<a href="' + it.href + '" class="ngx-admin-bottomnav-more-link"><i data-lucide="' + it.icon + '" class="w-4 h-4 text-kop-700"></i>' + it.label + '</a>';
        });

        sheetHtml += '<button id="ngxMoreClose" class="w-full mt-4 bg-gray-100 text-gray-600 text-xs font-bold py-3 rounded-xl">Tutup</button>';
        sheetHtml += '</div></div>';

        document.body.insertAdjacentHTML("beforeend", sheetHtml);
        if (window.lucide) lucide.createIcons();

        var sheet = document.getElementById("ngxMoreSheet");

        document.getElementById("ngxMoreClose").addEventListener("click", function () { sheet.remove(); });
        sheet.addEventListener("click", function (e) { if (e.target === sheet) sheet.remove(); });

    });

    if (window.lucide) lucide.createIcons();

})();

/* =========================================================
   PROTEKSI HALAMAN — semua halaman admin (kecuali /admin/login)
   wajib punya sesi valid, kalau tidak otomatis dilempar ke login
   ========================================================= */
function ngxAdminGetToken() {
    return sessionStorage.getItem("ngxAdminToken");
}

function ngxAdminLogoutLokal() {
    sessionStorage.removeItem("ngxAdminToken");
    sessionStorage.removeItem("ngxAdminUser");
}

function ngxAdminCekSesi(callback) {

    var token = ngxAdminGetToken();

    if (!token) {
        window.location.href = "/admin/login/";
        return;
    }

    fetch(NGX_API_BASE_URL + "?action=adminVerifySession&token=" + encodeURIComponent(token))
        .then(function (res) { return res.json(); })
        .then(function (data) {

            if (!data || data.success !== true) {
                ngxAdminLogoutLokal();
                window.location.href = "/admin/login/";
                return;
            }

            // Tampilkan info user di topbar (kalau elemennya ada di halaman)
            var elNama = document.getElementById("userNama");
            var elRole = document.getElementById("userRole");
            var elAvatar = document.getElementById("userAvatar");

            if (elNama) elNama.textContent = data.user.nama;
            if (elRole) elRole.textContent = data.user.role;
            if (elAvatar) elAvatar.textContent = String(data.user.nama || "?").trim().charAt(0).toUpperCase();

            if (typeof callback === "function") callback(token, data.user);

        })
        .catch(function () {
            ngxAdminLogoutLokal();
            window.location.href = "/admin/login/";
        });

}

// Tombol logout (ada di semua halaman admin)
(function () {
    var btnLogout = document.getElementById("btnLogout");
    if (!btnLogout) return;

    btnLogout.addEventListener("click", function () {

        if (window.Swal) {
            Swal.fire({
                title: "Keluar dari Admin Panel?",
                text: "Anda perlu login ulang untuk mengakses dashboard.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Ya, Keluar",
                cancelButtonText: "Batal",
                confirmButtonColor: "#0F766E"
            }).then(function (result) {
                if (result.isConfirmed) prosesLogout();
            });
        } else {
            if (confirm("Keluar dari Admin Panel?")) prosesLogout();
        }

    });

    function prosesLogout() {
        var token = ngxAdminGetToken();
        var body = new URLSearchParams();
        body.append("action", "adminLogout");
        body.append("token", token || "");

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .finally(function () {
                ngxAdminLogoutLokal();
                window.location.href = "/admin/login/";
            });
    }
})();

/* =========================================================
   DASHBOARD — statistik + grafik (hanya aktif di /admin/dashboard)
   ========================================================= */
(function () {
    var loadingBox = document.getElementById("dashLoading");
    var errorBox = document.getElementById("dashError");
    var errorText = document.getElementById("dashErrorText");
    var content = document.getElementById("dashContent");

    if (!content) return; // bukan halaman dashboard

    var topbarTanggal = document.getElementById("topbarTanggal");
    if (topbarTanggal) {
        topbarTanggal.textContent = new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric"
        }).format(new Date());
    }

    var paletteWarna = ["#0F766E", "#2DD4BF", "#FBBF24", "#F87171", "#818CF8", "#F472B6", "#34D399", "#FB923C", "#60A5FA", "#A78BFA", "#4ADE80", "#FCD34D"];

    var chartInstances = {};

    function hancurkanChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    function renderChartGaris(canvasId, labels, values, warna) {
        hancurkanChart(canvasId);
        var ctx = document.getElementById(canvasId).getContext("2d");
        chartInstances[canvasId] = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    borderColor: warna,
                    backgroundColor: warna + "22",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3,
                    pointBackgroundColor: warna
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return "Rp " + v.toLocaleString("id-ID"); } } } }
            }
        });
    }

    function renderChartBatang(canvasId, labels, values, warna) {
        hancurkanChart(canvasId);
        var ctx = document.getElementById(canvasId).getContext("2d");
        chartInstances[canvasId] = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{ data: values, backgroundColor: warna, borderRadius: 6 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: function (v) { return "Rp " + v.toLocaleString("id-ID"); } } } }
            }
        });
    }

    function renderChartDonut(canvasId, labels, values) {
        hancurkanChart(canvasId);
        var ctx = document.getElementById(canvasId).getContext("2d");
        chartInstances[canvasId] = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{ data: values, backgroundColor: paletteWarna, borderWidth: 0 }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }
            }
        });
    }

    function muatDashboard(token) {

        loadingBox.classList.remove("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        fetch(NGX_API_BASE_URL + "?action=adminDashboardStats&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    errorText.textContent = (data && data.message) ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                document.getElementById("statAnggota").textContent = data.totalAnggota;
                document.getElementById("statPinjaman").textContent = data.totalPinjamanFormat;
                document.getElementById("statPelunasan").textContent = data.totalPelunasanFormat;
                document.getElementById("statSimpanan").textContent = data.totalSimpananFormat;
                document.getElementById("statBeredar").textContent = data.totalDanaBeredarFormat;
                document.getElementById("statMasuk").textContent = data.totalDanaMasukFormat;
                document.getElementById("statKeluar").textContent = data.totalDanaKeluarFormat;
                document.getElementById("statAktif").textContent = data.pinjamanAktif;
                document.getElementById("statLunas").textContent = data.pinjamanLunas;

                var bulanan = data.grafikBulanan || [];
                renderChartGaris("chartBulanan", bulanan.map(function (b) { return b.label; }), bulanan.map(function (b) { return b.value; }), "#0F766E");

                var tahunan = data.grafikTahunan || [];
                renderChartBatang("chartTahunan", tahunan.map(function (t) { return t.label; }), tahunan.map(function (t) { return t.value; }), "#2DD4BF");

                var pengeluaran = data.diagramPengeluaran || [];
                renderChartDonut("chartPengeluaran", pengeluaran.map(function (p) { return p.label; }), pengeluaran.map(function (p) { return p.value; }));

                var pemasukan = data.diagramPemasukan || [];
                renderChartBatang("chartPemasukan", pemasukan.map(function (p) { return p.label; }), pemasukan.map(function (p) { return p.value; }), "#FBBF24");

                content.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    ngxAdminCekSesi(function (token) {
        muatDashboard(token);

        var btnRetry = document.getElementById("dashRetryBtn");
        if (btnRetry) btnRetry.addEventListener("click", function () { muatDashboard(token); });
    });

})();
