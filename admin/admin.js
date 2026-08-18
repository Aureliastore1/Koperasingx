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

function ngxAdminIsiInfoUser(user) {

    var elNama = document.getElementById("userNama");
    var elRole = document.getElementById("userRole");
    var elAvatar = document.getElementById("userAvatar");

    if (elNama) elNama.textContent = user.nama;
    if (elRole) elRole.textContent = user.role;
    if (elAvatar) elAvatar.textContent = String(user.nama || "?").trim().charAt(0).toUpperCase();

    var elNamaSb = document.getElementById("sidebarUserNama");
    var elRoleSb = document.getElementById("sidebarUserRole");
    var elAvatarSb = document.getElementById("sidebarUserAvatar");

    if (elNamaSb) elNamaSb.textContent = user.nama;
    if (elRoleSb) elRoleSb.textContent = user.role;
    if (elAvatarSb) elAvatarSb.textContent = String(user.nama || "?").trim().charAt(0).toUpperCase();

}

function ngxAdminCekSesi(callback) {

    var token = ngxAdminGetToken();

    if (token) {

        fetch(NGX_API_BASE_URL + "?action=adminVerifySession&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) { ngxAdminCobaRememberToken(callback); return; }

                ngxAdminIsiInfoUser(data.user);
                if (typeof callback === "function") callback(token, data.user);

            })
            .catch(function () { ngxAdminCobaRememberToken(callback); });

        return;

    }

    ngxAdminCobaRememberToken(callback);

}

/*************************************************
 * "INGAT SAYA" — kalau sesi biasa (sessionStorage, 6 jam) sudah
 * habis, coba tukar token "Ingat Saya" (localStorage, 30 hari)
 * dengan sesi baru secara diam-diam, TANPA minta login ulang.
 * Hanya kalau token ini juga tidak ada/tidak valid, baru dilempar
 * ke halaman login.
 *************************************************/
function ngxAdminCobaRememberToken(callback) {

    var rememberToken = localStorage.getItem("ngxAdminRememberToken");

    if (!rememberToken) {
        window.location.href = "/admin/login/";
        return;
    }

    var body = new URLSearchParams();
    body.append("action", "adminLoginDenganRememberToken");
    body.append("rememberToken", rememberToken);

    fetch(NGX_API_BASE_URL, { method: "POST", body: body })
        .then(function (res) { return res.json(); })
        .then(function (data) {

            if (!data || data.success !== true) {
                localStorage.removeItem("ngxAdminRememberToken");
                window.location.href = "/admin/login/";
                return;
            }

            sessionStorage.setItem("ngxAdminToken", data.token);
            sessionStorage.setItem("ngxAdminUser", JSON.stringify(data.user));

            ngxAdminIsiInfoUser(data.user);
            if (typeof callback === "function") callback(data.token, data.user);

        })
        .catch(function () {
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
        var rememberToken = localStorage.getItem("ngxAdminRememberToken");

        var body = new URLSearchParams();
        body.append("action", "adminLogout");
        body.append("token", token || "");
        if (rememberToken) body.append("rememberToken", rememberToken);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .finally(function () {
                ngxAdminLogoutLokal();
                localStorage.removeItem("ngxAdminRememberToken");
                window.location.href = "/admin/login/";
            });
    }
})();

/* =========================================================
   NOTIFIKASI ADMIN — bel disuntikkan otomatis di SEMUA halaman
   admin (dicari lewat #btnLogout sebagai jangkar posisi), supaya
   admin selalu tahu ada perubahan data terbaru di sistem.
   ========================================================= */
(function () {

    var btnLogout = document.getElementById("btnLogout");
    if (!btnLogout) return; // bukan halaman admin

    var kontainerKanan = btnLogout.parentElement;
    if (!kontainerKanan) return;

    var htmlBel =
        '<div class="ngx-notif-btn" id="ngxNotifWrap" style="position:relative;">' +
            '<button id="ngxBtnNotif" class="ngx-notif-btn" title="Notifikasi"><i data-lucide="bell" class="w-4 h-4"></i>' +
                '<span class="ngx-notif-badge hidden" id="ngxNotifBadge">0</span>' +
            '</button>' +
        '</div>';

    kontainerKanan.insertAdjacentHTML("afterbegin", htmlBel);
    if (window.lucide) lucide.createIcons();

    function escapeHtmlNotif(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function ikonJenis(jenisTransaksi) {
        var peta = { "Pinjaman": "banknote", "Simpanan": "piggy-bank", "Pengeluaran": "receipt", "Anggota": "users", "Saldo": "wallet" };
        return peta[jenisTransaksi] || "activity";
    }

    function waktuRelatif(waktuFormat) {
        return waktuFormat; // format tanggal lengkap, cukup jelas tanpa perlu hitung "X menit lalu"
    }

    function linkTujuan(n) {
        if (n.jenisTransaksi === "Pinjaman" && n.idTransaksi) return "/admin/pinjaman/detail/?row=" + n.idTransaksi;
        if (n.jenisTransaksi === "Simpanan") return "/admin/simpanan/";
        if (n.jenisTransaksi === "Anggota") return "/admin/anggota/";
        if (n.jenisTransaksi === "Pengeluaran") return "/admin/pengeluaran/";
        return "/admin/log-aktivitas/";
    }

    function renderDropdown(data) {

        var existing = document.getElementById("ngxNotifDropdown");
        if (existing) existing.remove();

        var listHtml = (!data.notifikasi || data.notifikasi.length === 0)
            ? "<p class='text-xs text-gray-400 text-center py-8'>Belum ada notifikasi.</p>"
            : data.notifikasi.map(function (n) {
                return "<div class='ngx-notif-item" + (n.statusDibaca !== "Sudah" ? " belum-dibaca" : "") + "' data-id='" + escapeHtmlNotif(n.idAktivitas) + "' data-href='" + linkTujuan(n) + "'>" +
                    "<div class='ngx-notif-dot " + n.prioritas + "'></div>" +
                    "<div class='flex-1 min-w-0'>" +
                        "<p class='text-xs font-bold text-gray-800'>" + escapeHtmlNotif(n.jenisAktivitas) + " &middot; " + escapeHtmlNotif(n.jenisTransaksi) + "</p>" +
                        "<p class='text-[11px] text-gray-500 mt-0.5'>" + escapeHtmlNotif(n.keterangan) + "</p>" +
                        "<p class='text-[10px] text-gray-400 mt-1'>" + escapeHtmlNotif(waktuRelatif(n.waktuFormat)) + "</p>" +
                    "</div>" +
                "</div>";
            }).join("");

        var html =
            "<div class='ngx-notif-dropdown' id='ngxNotifDropdown'>" +
                "<div class='ngx-notif-header'>" +
                    "<p class='text-sm font-bold text-gray-800'>Notifikasi</p>" +
                    "<button id='ngxBtnTandaiSemua' class='text-[11px] font-semibold text-kop-700 hover:underline'>Tandai semua dibaca</button>" +
                "</div>" +
                "<div class='ngx-notif-list'>" + listHtml + "</div>" +
                "<a href='/admin/log-aktivitas/' class='block text-center text-xs font-semibold text-kop-700 py-3 border-t border-gray-100 hover:bg-gray-50'>Lihat semua log aktivitas</a>" +
            "</div>";

        document.getElementById("ngxNotifWrap").insertAdjacentHTML("beforeend", html);
        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".ngx-notif-item").forEach(function (item) {
            item.addEventListener("click", function () {
                var id = item.getAttribute("data-id");
                var href = item.getAttribute("data-href");
                tandaiNotifDibaca(id, function () { window.location.href = href; });
            });
        });

        var btnTandaiSemua = document.getElementById("ngxBtnTandaiSemua");
        if (btnTandaiSemua) {
            btnTandaiSemua.addEventListener("click", function (e) {
                e.stopPropagation();
                tandaiNotifDibaca("semua", function () { muatNotifikasi(); });
            });
        }

    }

    function tandaiNotifDibaca(idAktivitas, callback) {
        var body = new URLSearchParams();
        body.append("action", "adminTandaiNotifikasiDibaca");
        body.append("token", ngxAdminGetToken());
        body.append("idAktivitas", idAktivitas);
        fetch(NGX_API_BASE_URL, { method: "POST", body: body }).finally(function () { if (callback) callback(); });
    }

    function muatNotifikasi() {

        var token = ngxAdminGetToken();
        if (!token) return;

        fetch(NGX_API_BASE_URL + "?action=adminGetNotifikasi&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) return;

                var badge = document.getElementById("ngxNotifBadge");
                if (data.jumlahBelumDibaca > 0) {
                    badge.textContent = data.jumlahBelumDibaca > 9 ? "9+" : data.jumlahBelumDibaca;
                    badge.classList.remove("hidden");
                } else {
                    badge.classList.add("hidden");
                }

                window._ngxNotifTerakhir = data;

                var dropdownTerbuka = document.getElementById("ngxNotifDropdown");
                if (dropdownTerbuka) renderDropdown(data);

            })
            .catch(function () {});

    }

    document.getElementById("ngxBtnNotif").addEventListener("click", function (e) {

        e.stopPropagation();

        var existing = document.getElementById("ngxNotifDropdown");
        if (existing) { existing.remove(); return; }

        if (window._ngxNotifTerakhir) renderDropdown(window._ngxNotifTerakhir);
        else renderDropdown({ notifikasi: [] });

        muatNotifikasi();

    });

    document.addEventListener("click", function (e) {
        var dropdown = document.getElementById("ngxNotifDropdown");
        var wrap = document.getElementById("ngxNotifWrap");
        if (dropdown && wrap && !wrap.contains(e.target)) dropdown.remove();
    });

    muatNotifikasi();
    setInterval(muatNotifikasi, 60000); // polling tiap 60 detik, cara paling praktis buat "hampir real-time" tanpa server khusus

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

    function escapeHtmlDash(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    var kalenderOffset = 0; // 0 = bulan ini, -1 = bulan lalu, +1 = bulan depan, dst

    function renderKalender() {

        var sekarang = new Date();
        var acuan = new Date(sekarang.getFullYear(), sekarang.getMonth() + kalenderOffset, 1);
        var tahun = acuan.getFullYear();
        var bulan = acuan.getMonth();

        var namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        var labelEl = document.getElementById("kalenderBulanLabel");
        if (labelEl) labelEl.textContent = namaBulan[bulan] + " " + tahun;

        var hariPertama = new Date(tahun, bulan, 1).getDay(); // 0=Minggu
        var jumlahHari = new Date(tahun, bulan + 1, 0).getDate();

        var html = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"].map(function (h) {
            return "<div class='ngx-dash-calendar-hari'>" + h + "</div>";
        }).join("");

        for (var i = 0; i < hariPertama; i++) html += "<div></div>";

        for (var d = 1; d <= jumlahHari; d++) {
            var iniHariIni = (kalenderOffset === 0 && d === sekarang.getDate());
            var kelas = "ngx-dash-calendar-tgl" + (iniHariIni ? " hari-ini" : "");
            html += "<div class='" + kelas + "'>" + d + "</div>";
        }

        var grid = document.getElementById("kalenderGrid");
        if (grid) grid.innerHTML = html;

    }

    var btnBulanSebelumnya = document.getElementById("btnBulanSebelumnya");
    var btnBulanBerikutnya = document.getElementById("btnBulanBerikutnya");
    if (btnBulanSebelumnya) btnBulanSebelumnya.addEventListener("click", function () { kalenderOffset--; renderKalender(); });
    if (btnBulanBerikutnya) btnBulanBerikutnya.addEventListener("click", function () { kalenderOffset++; renderKalender(); });

    function renderRasioKas(danaBeredar, sudahLunas) {

        var total = danaBeredar + sudahLunas;
        var persenBeredar = total > 0 ? Math.round((danaBeredar / total) * 100) : 0;
        var persenLunas = total > 0 ? 100 - persenBeredar : 0;

        var elBeredarPersen = document.getElementById("rasioBeredarPersen");
        var elLunasPersen = document.getElementById("rasioLunasPersen");
        var elBeredarBar = document.getElementById("rasioBeredarBar");
        var elLunasBar = document.getElementById("rasioLunasBar");

        if (elBeredarPersen) elBeredarPersen.textContent = persenBeredar + "%";
        if (elLunasPersen) elLunasPersen.textContent = persenLunas + "%";
        if (elBeredarBar) elBeredarBar.style.width = persenBeredar + "%";
        if (elLunasBar) elLunasBar.style.width = persenLunas + "%";

        var canvasRasio = document.getElementById("chartRasioKas");
        if (!canvasRasio) return;

        hancurkanChart("chartRasioKas");
        var ctx = canvasRasio.getContext("2d");
        chartInstances["chartRasioKas"] = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Dana Beredar", "Sudah Lunas"],
                datasets: [{ data: [danaBeredar, sudahLunas], backgroundColor: ["#0F766E", "#F59E0B"], borderWidth: 0 }]
            },
            options: { responsive: true, cutout: "68%", plugins: { legend: { display: false } } }
        });

    }

    function ikonAktivitas(jenis) {
        if (jenis === "WhatsApp") return "message-circle";
        if (jenis === "Email") return "mail";
        if (jenis === "Dokumen") return "paperclip";
        if (jenis === "Dana Cair") return "banknote";
        if (jenis === "Verifikasi") return "check-circle";
        if (jenis === "Lunas") return "party-popper";
        if (jenis === "Pembayaran") return "wallet";
        if (jenis === "Pengajuan") return "file-plus";
        return "activity";
    }

    function inisialNama(nama) {
        var kata = String(nama || "?").trim().split(/\s+/);
        var a = kata[0] ? kata[0][0] : "?";
        var b = kata[1] ? kata[1][0] : "";
        return (a + b).toUpperCase();
    }

    function warnaAvatar(nama) {
        var palet = ["#0F766E", "#D97706", "#7C3AED", "#DB2777", "#2563EB", "#059669"];
        var kode = String(nama || "").split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
        return palet[kode % palet.length];
    }

    function badgeJenisAktivitas(jenis) {
        var peta = {
            "Pengajuan": "background:#FEF3C7;color:#92400E;", "Verifikasi": "background:#DBEAFE;color:#1D4ED8;",
            "Dana Cair": "background:#D1FAE5;color:#047857;", "Lunas": "background:#D1FAE5;color:#047857;",
            "Pembayaran": "background:#F0FDFA;color:#0F766E;", "Email": "background:#F3F4F6;color:#4B5563;",
            "WhatsApp": "background:#DCFCE7;color:#166534;", "Dokumen": "background:#EDE9FE;color:#6D28D9;",
            "Catatan": "background:#F3F4F6;color:#4B5563;", "Edit": "background:#F3F4F6;color:#4B5563;"
        };
        return peta[jenis] || "background:#F3F4F6;color:#4B5563;";
    }

    function ekstrakNominal(teks) {
        var m = String(teks || "").match(/Rp\s?[\d.,]+/);
        return m ? m[0] : "-";
    }

    function muatAktivitasTerbaru(token) {

        var tbody = document.getElementById("aktivitasTableBody");
        if (!tbody) return;

        fetch(NGX_API_BASE_URL + "?action=adminGetRecentActivity&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true || !data.aktivitas || data.aktivitas.length === 0) {
                    tbody.innerHTML = "<tr><td colspan='4' class='text-xs text-gray-400 py-6 text-center'>Belum ada aktivitas tercatat.</td></tr>";
                    return;
                }

                tbody.innerHTML = data.aktivitas.map(function (a) {
                    return "<tr class='border-b border-gray-50'>" +
                        "<td class='py-2.5'><div class='flex items-center gap-2'>" +
                            "<div class='w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0' style='background:" + warnaAvatar(a.nama) + ";'>" + inisialNama(a.nama) + "</div>" +
                            "<span class='text-xs font-semibold text-gray-800'>" + escapeHtmlDash(a.nama) + "</span>" +
                        "</div></td>" +
                        "<td class='py-2.5'><span class='text-[10px] font-bold px-2 py-1 rounded-full' style='" + badgeJenisAktivitas(a.jenis) + "'>" + escapeHtmlDash(a.jenis) + "</span></td>" +
                        "<td class='py-2.5 text-xs font-semibold text-gray-700'>" + escapeHtmlDash(ekstrakNominal(a.keterangan)) + "</td>" +
                        "<td class='py-2.5 text-[11px] text-gray-400'>" + escapeHtmlDash(a.waktuFormat) + "</td>" +
                    "</tr>";
                }).join("");

                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                tbody.innerHTML = "<tr><td colspan='4' class='text-xs text-gray-400 py-6 text-center'>Gagal memuat aktivitas.</td></tr>";
            });

    }

    function badgeJatuhTempoDash(status) {
        if (status === "LEWAT JATUH TEMPO") return { bg: "#FEE2E2", warna: "#B91C1C" };
        if (status === "JATUH TEMPO HARI INI" || status === "JATUH TEMPO BESOK") return { bg: "#FEF3C7", warna: "#B45309" };
        return { bg: "#F0FDFA", warna: "#0F766E" };
    }

    function muatJatuhTempoMendatang(token) {

        var box = document.getElementById("jatuhTempoList");
        if (!box) return;

        fetch(NGX_API_BASE_URL + "?action=adminGetFollowUpList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true || !data.followup || data.followup.length === 0) {
                    box.innerHTML = "<p class='text-xs text-gray-400 py-6 text-center'>Tidak ada jatuh tempo mendatang 🎉</p>";
                    return;
                }

                box.innerHTML = data.followup.slice(0, 5).map(function (f) {
                    var warna = badgeJatuhTempoDash(f.statusJatuhTempo);
                    return "<div class='ngx-dash-event-item'>" +
                        "<div class='ngx-dash-event-icon' style='background:" + warna.bg + ";color:" + warna.warna + ";'><i data-lucide='calendar-clock' class='w-4 h-4'></i></div>" +
                        "<div class='flex-1 min-w-0'>" +
                            "<p class='text-xs font-bold text-gray-800 truncate'>" + escapeHtmlDash(f.nama) + "</p>" +
                            "<p class='text-[11px]' style='color:" + warna.warna + ";'>" + escapeHtmlDash(f.jatuhTempoFormat) + "</p>" +
                        "</div>" +
                    "</div>";
                }).join("");

                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                box.innerHTML = "<p class='text-xs text-gray-400 py-6 text-center'>Gagal memuat data.</p>";
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

                var trendEl = document.getElementById("trendPinjaman");
                if (trendEl) {
                    if (data.trendPinjaman) {
                        trendEl.className = "ngx-dash-trend " + data.trendPinjaman.arah;
                        trendEl.innerHTML = "<i data-lucide='" + (data.trendPinjaman.arah === "naik" ? "trending-up" : "trending-down") + "' class='w-3 h-3'></i> " + data.trendPinjaman.persen + "% dari bulan lalu";
                    } else {
                        trendEl.innerHTML = "";
                    }
                }

                var bulanan = data.grafikBulanan || [];
                renderChartGaris("chartBulanan", bulanan.map(function (b) { return b.label; }), bulanan.map(function (b) { return b.value; }), "#0F766E");

                var tahunan = data.grafikTahunan || [];
                renderChartBatang("chartTahunan", tahunan.map(function (t) { return t.label; }), tahunan.map(function (t) { return t.value; }), "#2DD4BF");

                var pengeluaran = data.diagramPengeluaran || [];
                renderChartDonut("chartPengeluaran", pengeluaran.map(function (p) { return p.label; }), pengeluaran.map(function (p) { return p.value; }));

                var pemasukan = data.diagramPemasukan || [];
                renderChartBatang("chartPemasukan", pemasukan.map(function (p) { return p.label; }), pemasukan.map(function (p) { return p.value; }), "#FBBF24");

                renderKalender();
                renderRasioKas(data.totalDanaBeredar, data.totalPelunasan);
                muatAktivitasTerbaru(token);
                muatJatuhTempoMendatang(token);

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
