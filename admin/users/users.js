(function () {

    var tabel = null;
    var dataUsersSaatIni = [];
    var currentUsername = "";

    var modal = document.getElementById("modalUser");
    var modalTitle = document.getElementById("modalUserTitle");
    var modalError = document.getElementById("modalUserError");
    var form = document.getElementById("formUser");
    var btnTambah = document.getElementById("btnTambahUser");
    var btnBatal = document.getElementById("btnBatalUser");
    var btnClose = document.getElementById("modalUserClose");
    var btnSimpan = document.getElementById("btnSimpanUser");

    var fUsernameAsli = document.getElementById("usUsernameAsli");
    var fNama = document.getElementById("usNama");
    var fUsername = document.getElementById("usUsername");
    var fPassword = document.getElementById("usPassword");
    var fPasswordHint = document.getElementById("usPasswordHint");
    var fRole = document.getElementById("usRole");
    var fStatus = document.getElementById("usStatus");

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function bukaModal(mode, data) {

        modalError.classList.add("hidden");
        form.reset();

        if (mode === "edit" && data) {
            modalTitle.textContent = "Edit Admin";
            fUsernameAsli.value = data.username;
            fNama.value = data.nama;
            fUsername.value = data.username;
            fUsername.disabled = true;
            fPassword.required = false;
            fPasswordHint.textContent = "Kosongkan kalau tidak ingin ganti password.";
            fRole.value = data.role;
            fStatus.value = data.statusAktif;
        } else {
            modalTitle.textContent = "Tambah Admin";
            fUsernameAsli.value = "";
            fUsername.disabled = false;
            fPassword.required = true;
            fPasswordHint.textContent = "Minimal 4 karakter.";
            fRole.value = "Admin";
            fStatus.value = "Aktif";
        }

        modal.classList.remove("hidden");

    }

    function tutupModal() { modal.classList.add("hidden"); }

    btnTambah.addEventListener("click", function () { bukaModal("tambah"); });
    btnBatal.addEventListener("click", tutupModal);
    btnClose.addEventListener("click", tutupModal);

    form.addEventListener("submit", function (e) {

        e.preventDefault();
        modalError.classList.add("hidden");

        var isEdit = !!fUsernameAsli.value;
        var nama = fNama.value.trim();
        var username = fUsername.value.trim();
        var password = fPassword.value;

        if (!nama) {
            modalError.textContent = "Nama wajib diisi.";
            modalError.classList.remove("hidden");
            return;
        }
        if (!isEdit && (!username || !password || password.length < 4)) {
            modalError.textContent = "Username wajib diisi & password minimal 4 karakter.";
            modalError.classList.remove("hidden");
            return;
        }
        if (isEdit && password && password.length < 4) {
            modalError.textContent = "Password baru minimal 4 karakter.";
            modalError.classList.remove("hidden");
            return;
        }

        btnSimpan.disabled = true;
        btnSimpan.textContent = "Menyimpan...";

        var body = new URLSearchParams();
        body.append("token", ngxAdminGetToken());
        body.append("nama", nama);
        body.append("role", fRole.value);
        body.append("statusAktif", fStatus.value);

        if (isEdit) {
            body.append("action", "adminUpdateUser");
            body.append("usernameAsli", fUsernameAsli.value);
            if (password) body.append("password", password);
        } else {
            body.append("action", "adminCreateUser");
            body.append("username", username);
            body.append("password", password);
        }

        fetch(NGX_API_BASE_URL, { method: "POST", body: body })
            .then(function (res) { return res.json(); })
            .then(function (data) {

                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";

                if (!data || data.success !== true) {
                    modalError.textContent = data && data.message ? data.message : "Gagal menyimpan.";
                    modalError.classList.remove("hidden");
                    return;
                }

                tutupModal();
                muatDataUsers();

                if (window.Swal) Swal.fire({ title: "Berhasil", icon: "success", confirmButtonColor: "#0F766E", timer: 1600, showConfirmButton: false });

            })
            .catch(function () {
                btnSimpan.disabled = false;
                btnSimpan.textContent = "Simpan";
                modalError.textContent = "Gagal terhubung ke server.";
                modalError.classList.remove("hidden");
            });

    });

    function hapusUser(username, nama) {

        var lanjutkan = function () {

            var body = new URLSearchParams();
            body.append("action", "adminDeleteUser");
            body.append("token", ngxAdminGetToken());
            body.append("username", username);

            fetch(NGX_API_BASE_URL, { method: "POST", body: body })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data || data.success !== true) {
                        if (window.Swal) Swal.fire("Gagal", data && data.message ? data.message : "Gagal menghapus.", "error");
                        return;
                    }

                    muatDataUsers();
                    if (window.Swal) Swal.fire({ title: "Terhapus", icon: "success", confirmButtonColor: "#0F766E", timer: 1500, showConfirmButton: false });

                })
                .catch(function () {
                    if (window.Swal) Swal.fire("Gagal", "Gagal terhubung ke server.", "error");
                });

        };

        if (window.Swal) {
            Swal.fire({
                title: "Hapus akun " + nama + "?",
                text: "Akun ini tidak akan bisa login lagi setelah dihapus.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, Hapus",
                cancelButtonText: "Batal",
                confirmButtonColor: "#DC2626"
            }).then(function (result) { if (result.isConfirmed) lanjutkan(); });
        } else if (confirm("Hapus akun " + nama + "?")) {
            lanjutkan();
        }

    }

    function badgeRole(role) {
        if (role === "Super Admin") return "ngx-badge-jt-besok";
        if (role === "Asisten Bendahara") return "ngx-badge-belum";
        return "ngx-badge-lunas";
    }

    function renderTabel(daftar) {

        if (tabel) tabel.destroy();

        var tbody = document.querySelector("#tabelUsers tbody");

        tbody.innerHTML = daftar.map(function (u) {

            var iniSayaSendiri = u.username.toLowerCase() === currentUsername.toLowerCase();
            var badgeStatus = u.statusAktif === "Aktif" ? "ngx-badge-lunas" : "ngx-badge-belum";

            var tombolHapus = iniSayaSendiri
                ? "<span class='text-[10px] text-gray-300 italic'>Akun Anda</span>"
                : "<button class='ngx-admin-btn ngx-admin-btn-danger ngx-admin-btn-sm btn-hapus-user' data-username='" + escapeHtml(u.username) + "' data-nama='" + escapeHtml(u.nama) + "'><i data-lucide='trash-2' class='w-3 h-3'></i></button>";

            return (
                "<tr>" +
                    "<td class='font-semibold'>" + escapeHtml(u.nama) + "</td>" +
                    "<td>" + escapeHtml(u.username) + "</td>" +
                    "<td><span class='" + badgeRole(u.role) + " text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap'>" + escapeHtml(u.role) + "</span></td>" +
                    "<td>" + escapeHtml(u.tanggalDibuat) + "</td>" +
                    "<td><span class='" + badgeStatus + " text-[10px] font-bold px-2 py-1 rounded-full'>" + escapeHtml(u.statusAktif) + "</span></td>" +
                    "<td>" +
                        "<div class='flex gap-1.5 items-center'>" +
                            "<button class='ngx-admin-btn ngx-admin-btn-outline ngx-admin-btn-sm btn-edit-user' data-username='" + escapeHtml(u.username) + "'><i data-lucide='pencil' class='w-3 h-3'></i></button>" +
                            tombolHapus +
                        "</div>" +
                    "</td>" +
                "</tr>"
            );

        }).join("");

        tabel = $("#tabelUsers").DataTable({
            pageLength: 10,
            language: {
                search: "Cari:", lengthMenu: "Tampilkan _MENU_ data", info: "_START_-_END_ dari _TOTAL_ data",
                paginate: { previous: "\u2039", next: "\u203a" }, zeroRecords: "Tidak ada data ditemukan", emptyTable: "Belum ada akun admin"
            }
        });

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll(".btn-edit-user").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var username = btn.getAttribute("data-username");
                var data = null;
                for (var i = 0; i < dataUsersSaatIni.length; i++) {
                    if (dataUsersSaatIni[i].username === username) { data = dataUsersSaatIni[i]; break; }
                }
                if (data) bukaModal("edit", data);
            });
        });

        document.querySelectorAll(".btn-hapus-user").forEach(function (btn) {
            btn.addEventListener("click", function () {
                hapusUser(btn.getAttribute("data-username"), btn.getAttribute("data-nama"));
            });
        });

    }

    function muatDataUsers() {

        var loadingBox = document.getElementById("pageLoading");
        var forbiddenBox = document.getElementById("pageForbidden");
        var errorBox = document.getElementById("pageError");
        var errorText = document.getElementById("pageErrorText");
        var content = document.getElementById("pageContent");

        loadingBox.classList.remove("hidden");
        forbiddenBox.classList.add("hidden");
        errorBox.classList.add("hidden");
        content.classList.add("hidden");

        var token = ngxAdminGetToken();

        fetch(NGX_API_BASE_URL + "?action=adminGetUsersList&token=" + encodeURIComponent(token))
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {

                    if (data && data.authError) {
                        ngxAdminLogoutLokal();
                        window.location.href = "/admin/login/";
                        return;
                    }

                    if (data && data.message && data.message.indexOf("Super Admin") !== -1) {
                        forbiddenBox.classList.remove("hidden");
                        return;
                    }

                    errorText.textContent = data && data.message ? data.message : "Gagal memuat data.";
                    errorBox.classList.remove("hidden");
                    return;

                }

                dataUsersSaatIni = data.users;
                currentUsername = data.currentUsername || "";
                renderTabel(dataUsersSaatIni);

                content.classList.remove("hidden");

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    document.getElementById("pageRetryBtn").addEventListener("click", muatDataUsers);

    ngxAdminCekSesi(function () {
        muatDataUsers();
    });

})();
