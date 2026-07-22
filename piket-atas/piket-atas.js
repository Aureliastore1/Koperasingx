(function () {

    var NGX_PIKET_API_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

    var NAMA_BULAN_SEKARANG = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function renderHari(h, iniBulanSekarang, tglSekarang) {

        var isHariIni = iniBulanSekarang && h.tanggal === tglSekarang;

        var badgeHariIni = isHariIni
            ? '<span class="ngx-badge-lunas text-[10px] font-bold px-2 py-1 rounded-full ml-2">HARI INI</span>'
            : '';

        var isiKartu;

        if (h.wcSaja) {
            isiKartu =
                '<div class="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 flex items-center gap-2">' +
                    '<i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"></i>' +
                    '<span class="text-xs font-semibold text-emerald-700">Gak Pakai Piket, WC Saja</span>' +
                '</div>';
        } else {
            isiKartu = '<div class="mt-2 space-y-1.5">' + h.keterangan.map(function (k) {
                return '<div class="flex items-center justify-between gap-3 text-xs bg-gray-50 rounded-lg px-3 py-2">' +
                    '<span class="text-gray-500">' + escapeHtml(k.label) + '</span>' +
                    '<span class="font-bold text-gray-800">' + (k.nama ? escapeHtml(k.nama) : '-') + '</span>' +
                '</div>';
            }).join('') + '</div>';
        }

        return (
            '<div class="bg-white rounded-2xl border ' + (isHariIni ? 'border-kop-300 ring-2 ring-kop-100' : 'border-gray-100') + ' shadow-sm p-4">' +
                '<div class="flex items-center justify-between">' +
                    '<div class="flex items-center gap-2.5">' +
                        '<div class="w-10 h-10 bg-kop-700 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">' + h.tanggal + '</div>' +
                        '<span class="text-sm font-bold text-gray-800">' + escapeHtml(h.hari) + '</span>' +
                    '</div>' +
                    badgeHariIni +
                '</div>' +
                isiKartu +
            '</div>'
        );

    }

    function muatPiketAtas() {

        var loadingBox = document.getElementById("piketLoading");
        var errorBox = document.getElementById("piketError");
        var errorText = document.getElementById("piketErrorText");
        var content = document.getElementById("piketContent");

        fetch(NGX_PIKET_API_URL + "?action=piketAtas")
            .then(function (res) { return res.json(); })
            .then(function (data) {

                loadingBox.classList.add("hidden");

                if (!data || data.success !== true) {
                    errorText.textContent = (data && data.message) ? data.message : "Gagal memuat jadwal piket.";
                    errorBox.classList.remove("hidden");
                    return;
                }

                if (data.judul) document.getElementById("pageJudul").textContent = "Piket Atas";
                if (data.subJudul) document.getElementById("pageSubJudul").textContent = data.subJudul;

                document.getElementById("piketBulan").textContent = data.bulan ? data.bulan : "-";
                document.getElementById("piketJumlahHari").textContent = data.hari.length + " hari";

                if (data.legend) {
                    document.getElementById("piketLegendText").textContent = data.legend;
                    document.getElementById("piketLegend").classList.remove("hidden");
                }

                var sekarang = new Date();
                var bulanSekarangText = NAMA_BULAN_SEKARANG[sekarang.getMonth()];
                var iniBulanSekarang = data.bulan && data.bulan.trim().toUpperCase() === bulanSekarangText;
                var tglSekarang = sekarang.getDate();

                document.getElementById("piketList").innerHTML = data.hari.map(function (h) {
                    return renderHari(h, iniBulanSekarang, tglSekarang);
                }).join("");

                content.classList.remove("hidden");
                if (window.lucide) lucide.createIcons();

            })
            .catch(function () {
                loadingBox.classList.add("hidden");
                errorText.textContent = "Gagal terhubung ke server.";
                errorBox.classList.remove("hidden");
            });

    }

    muatPiketAtas();

})();
