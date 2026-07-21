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

    ngxAdminCekSesi(function (token, user) {
        document.getElementById("infoNama").textContent = user.nama;
        document.getElementById("infoUsername").textContent = user.username;
        document.getElementById("infoRole").textContent = user.role;
    });

})();
