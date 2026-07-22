(function () {

    var NGX_PIKET_API_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

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

    function renderAnggota(a) {

        var bulanTerisi = a.bulan.filter(function (b) { return b.isi !== ""; });

        var isiBulan = bulanTerisi.length === 0
            ? '<p class="text-xs text-gray-400 italic mt-2">Belum ada jadwal bulan tercatat</p>'
            : '<div class="flex flex-wrap gap-1.5 mt-2">' + bulanTerisi.map(function (b) {
                return '<span class="ngx-badge-mini ngx-badge-belum" style="display:inline-flex;">' + escapeHtml(b.label.slice(0, 3)) + ': ' + escapeHtml(b.isi) + '</span>';
            }).join('') + '</div>';

        return (
            '<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">' +
                '<div class="flex items-center gap-3">' +
                    '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-kop-500 to-kop-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">' + inisial(a.nama) + '</div>' +
                    '<span class="text-sm font-bold text-gray-800">' + escapeHtml(a.nama) + '</span>' +
                '</div>' +
                isiBulan +
            '</div>'
        );

    }

    function muatPiketBawah() {

        var loadingBox = document.getElementById("piketLoading");
        var errorBox = document.getElementById("piketError");
        var errorText = document.getElementById("piketErrorText");
        var content = document.getElementById("piketContent");

        fetch(NGX_PIKET_API_URL + "?action=piketBawah")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    errorText.textContent = (data && data.message) ? data.message : "Gagal memuat jadwal piket.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                if (data.subJudul) document.getElementById("pageSubJudul").textContent = data.subJudul;

                document.getElementById("piketJumlahAnggota").textContent = data.anggota.length + " anggota";
                document.getElementById("piketList").innerHTML = data.anggota.map(renderAnggota).join("");

                if (data.keterangan && data.keterangan.length > 0) {
                    document.getElementById("piketKeteranganList").innerHTML = data.keterangan.map(function (k) {
                        return '<li class="text-xs text-amber-700 flex items-start gap-1.5"><span>&bull;</span><span>' + escapeHtml(k) + '</span></li>';
                    }).join("");
                    document.getElementById("piketKeteranganBox").classList.remove("hidden");
                }

                content.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    muatPiketBawah();

})();
