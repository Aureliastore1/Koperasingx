(function () {

    var form = document.getElementById("formGantiPassword");
    var errorBox = document.getElementById("stError");
    var btnSimpan = document.getElementById("btnGantiPassword");

    function tampilkanError(pesan) {
        errorBox.textContent = pesan;
        errorBox.classList.remove("hidden");
    }

    function setLoading(isLoading) {
        btnSimpan.disabled = isLoading;
        btnSimpan.innerHTML = isLoading
            ? '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Menyimpan...</span>'
            : '<i data-lucide="key-round" class="w-4 h-4"></i><span>Ganti Password</span>';
        if (window.lucide) lucide.createIcons();
    }

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        errorBox.classList.add("hidden");

        var passwordLama = document.getElementById("stPasswordLama").value;
        var passwordBaru = document.getElementById("stPasswordBaru").value;
        var passwordKonfirmasi = document.getElementById("stPasswordKonfirmasi").value;

        if (!passwordLama) return tampilkanError("Password lama wajib diisi.");
        if (!passwordBaru || passwordBaru.length < 4) return tampilkanError("Password baru minimal 4 karakter.");
        if (passwordBaru !== passwordKonfirmasi) return tampilkanError("Konfirmasi password baru tidak cocok.");

        setLoading(true);

        var body = new URLSearchParams();
        body.append("action", "adminGantiPasswordSendiri");
        body.append("token", ngxAdminGetToken());
        body.append("passwordLama", passwordLama);
        body.append("passwordBaru", passwordBaru);

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                setLoading(false);

                if (!data || data.success !== true) {

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    tampilkanError(data && data.message ? data.message : "Gagal mengganti password.");
                    return;
                }

                form.reset();

                if (window.Swal) {
                    Swal.fire({ title: "Berhasil", text: "Password berhasil diganti.", icon: "success", confirmButtonColor: "#0F766E" });
                }

            })
            .catch(function () {
                setLoading(false);
                tampilkanError("Gagal terhubung ke server, coba lagi.");
            });

    });

    /* ===== Pengaturan Pinjaman ===== */
    var togglePinjaman = document.getElementById("togglePinjaman");
    var statusDot = document.getElementById("statusPinjamanDot");
    var statusText = document.getElementById("statusPinjamanText");
    var statusBox = document.getElementById("statusPinjamanBox");
    var saldoEl = document.getElementById("saldoPinjamanAdmin");
    var pesanTextarea = document.getElementById("pesanOffPinjaman");
    var btnSimpanPinjaman = document.getElementById("btnSimpanPengaturanPinjaman");
    var errPinjaman = document.getElementById("pesanPinjamanError");
    var suksesPinjaman = document.getElementById("pesanPinjamanSukses");

    function perbaruiTampilanStatus(nyala) {
        if (nyala) {
            statusBox.style.background = "#D1FAE5";
            statusDot.style.background = "#059669";
            statusText.textContent = "Pinjaman AKTIF — publik bisa mengajukan";
            statusText.style.color = "#047857";
        } else {
            statusBox.style.background = "#FEE2E2";
            statusDot.style.background = "#DC2626";
            statusText.textContent = "Pinjaman NONAKTIF — publik tidak bisa mengajukan";
            statusText.style.color = "#B91C1C";
        }
    }

    function muatPengaturanPinjaman() {

        fetch(NGX_API_BASE_URL + "?action=pengaturanPinjaman")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                if (!data || data.success !== true) {
                    statusText.textContent = "Gagal memuat status.";
                    return;
                }

                var nyala = data.status === "ON";
                togglePinjaman.checked = nyala;
                perbaruiTampilanStatus(nyala);
                saldoEl.textContent = data.saldoPinjamanFormat;
                pesanTextarea.value = data.pesanOff;

            })
            .catch(function () {
                statusText.textContent = "Gagal terhubung ke server.";
            });

    }

    if (togglePinjaman) {
        togglePinjaman.addEventListener("change", function () {
            perbaruiTampilanStatus(togglePinjaman.checked);
        });
    }

    if (btnSimpanPinjaman) {
        btnSimpanPinjaman.addEventListener("click", function () {

            errPinjaman.classList.add("hidden");
            suksesPinjaman.classList.add("hidden");

            var pesan = pesanTextarea.value.trim();
            if (!pesan) {
                errPinjaman.textContent = "Pesan tidak boleh kosong.";
                errPinjaman.classList.remove("hidden");
                return;
            }

            btnSimpanPinjaman.disabled = true;
            btnSimpanPinjaman.innerHTML = '<span class="ngx-spinner" style="width:16px;height:16px;border-width:2px;"></span><span>Menyimpan...</span>';

            var body = new URLSearchParams();
            body.append("action", "adminSetPengaturanPinjaman");
            body.append("token", ngxAdminGetToken());
            body.append("status", togglePinjaman.checked ? "ON" : "OFF");
            body.append("pesanOff", pesan);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    btnSimpanPinjaman.disabled = false;
                    btnSimpanPinjaman.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Simpan Pengaturan</span>';
                    if (window.lucide) lucide.createIcons();

                    if (!data || data.success !== true) {
                        if (data && data.authError) { ngxAdminLogoutLokal(); window.location.href = "/admin/login/"; return; }
                        errPinjaman.textContent = data && data.message ? data.message : "Gagal menyimpan pengaturan.";
                        errPinjaman.classList.remove("hidden");
                        return;
                    }

                    suksesPinjaman.classList.remove("hidden");
                    setTimeout(function () { suksesPinjaman.classList.add("hidden"); }, 3000);

                })
                .catch(function () {
                    btnSimpanPinjaman.disabled = false;
                    btnSimpanPinjaman.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i><span>Simpan Pengaturan</span>';
                    errPinjaman.textContent = "Gagal terhubung ke server.";
                    errPinjaman.classList.remove("hidden");
                });

        });
    }

    /* ===== Tampilan & Aksesibilitas ===== */

    var prefsA11y = ngxAdminBacaPrefsA11y();

    function nilaiDefault(pref) {
        var d = { navDesktop: "top", darkMode: "light", aksenWarna: "teal", ukuranTeks: "normal", ukuranTopnav: "normal", layoutCompact: false };
        return prefsA11y[pref] !== undefined ? prefsA11y[pref] : d[pref];
    }

    function perbaruiTampilanPill(kontainer) {
        var pref = kontainer.getAttribute("data-pref");
        var nilaiAktif = String(nilaiDefault(pref));
        kontainer.querySelectorAll("[data-val]").forEach(function (btn) {
            btn.classList.toggle("aktif", String(btn.getAttribute("data-val")) === nilaiAktif);
        });
    }

    document.querySelectorAll(".ngx-a11y-pill-group[data-pref]").forEach(function (kontainer) {

        perbaruiTampilanPill(kontainer);

        kontainer.querySelectorAll(".ngx-a11y-pill").forEach(function (btn) {
            btn.addEventListener("click", function () {

                var pref = kontainer.getAttribute("data-pref");
                var val = btn.getAttribute("data-val");
                prefsA11y[pref] = (val === "true") ? true : (val === "false" ? false : val);

                ngxAdminSimpanPrefsA11y(prefsA11y);
                ngxAdminTerapkanPrefsA11y(prefsA11y);
                perbaruiTampilanPill(kontainer);

            });
        });

    });

    var kontainerWarna = document.querySelector('[data-pref="aksenWarna"]');
    if (kontainerWarna) {

        function perbaruiWarnaDot() {
            var aktif = String(nilaiDefault("aksenWarna"));
            kontainerWarna.querySelectorAll("[data-val]").forEach(function (dot) {
                dot.classList.toggle("aktif", dot.getAttribute("data-val") === aktif);
            });
        }

        perbaruiWarnaDot();

        kontainerWarna.querySelectorAll(".ngx-a11y-color-dot").forEach(function (dot) {
            dot.addEventListener("click", function () {
                prefsA11y.aksenWarna = dot.getAttribute("data-val");
                ngxAdminSimpanPrefsA11y(prefsA11y);
                ngxAdminTerapkanPrefsA11y(prefsA11y);
                perbaruiWarnaDot();
            });
        });

    }

    function wireToggleA11y(id, pref) {
        var el = document.getElementById(id);
        if (!el) return;
        el.checked = !!prefsA11y[pref];
        el.addEventListener("change", function () {
            prefsA11y[pref] = el.checked;
            ngxAdminSimpanPrefsA11y(prefsA11y);
            ngxAdminTerapkanPrefsA11y(prefsA11y);
        });
    }

    wireToggleA11y("a11yHighContrast", "highContrast");
    wireToggleA11y("a11yReduceMotion", "reduceMotion");
    wireToggleA11y("a11yLogoIkon", "logoIkonSaja");

    ngxAdminCekSesi(function (token, user) {
        document.getElementById("infoNama").textContent = user.nama;
        document.getElementById("infoUsername").textContent = user.username;
        document.getElementById("infoRole").textContent = user.role;
        muatPengaturanPinjaman();
    });

})();
