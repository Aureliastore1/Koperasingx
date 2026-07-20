function renderRiwayat(n) {

    var riwayat = Array.isArray(n.riwayat) ? n.riwayat : [];
    var jumlah = n.jumlahPinjam != null ? n.jumlahPinjam : riwayat.length;

    var isiList = "";

    if (riwayat.length === 0) {

        isiList = `
            <div class="text-center py-8">
                <i data-lucide="inbox" class="w-7 h-7 text-gray-300 mx-auto mb-2"></i>
                <p class="text-xs text-gray-400">
                    Belum ada riwayat pinjaman
                </p>
            </div>
        `;

    } else {

        isiList = riwayat.map(r => `

            <div class="ngx-riwayat-item">

                <div class="ngx-riwayat-dot"></div>

                <div class="flex-1">

                    <div class="flex justify-between items-start">

                        <div>

                            <h4 class="font-semibold text-gray-800">
                                ${r.alasan}
                            </h4>

                            <p class="text-xs text-gray-500 mt-1">
                                📅 ${r.tanggal}
                            </p>

                            <p class="text-xs text-gray-500">
                                ⏰ Jatuh Tempo :
                                ${r.jatuhTempo}
                            </p>

                            <p class="text-xs text-gray-500">
                                💵 Pelunasan :
                                ${r.pelunasanFormat}
                            </p>

                        </div>

                        <div class="text-right">

                            <div class="font-bold text-kop-800">

                                ${r.nominalFormat}

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `).join("");

    }

    return `

        <div class="ngx-hasil-card hasil-fade-in rounded-3xl p-6 sm:p-8 mt-4">

            <div class="flex items-center justify-between mb-5">

                <div class="flex items-center gap-2">

                    <i data-lucide="history"
                    class="w-5 h-5 text-kop-700"></i>

                    <h3 class="text-sm font-bold">

                        Riwayat Pinjaman

                    </h3>

                </div>

                <span class="ngx-badge-count">

                    ${jumlah}x Pinjam

                </span>

            </div>

            <div class="ngx-riwayat-list">

                ${isiList}

            </div>

        </div>

    `;

}
