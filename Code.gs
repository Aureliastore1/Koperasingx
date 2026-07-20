/*************************************************
 * KOPERASI SIMPAN PINJAM NGX
 *************************************************/

/*************************************************
 * ⚙️ KONFIGURASI — SESUAIKAN DI SINI
 *************************************************/
var SHEET_ID = "1hmnCD_qNuDnmVPMrbkSad1CSWKj-TBGH1Y1bye1Qsbs";
var SHEET_TAGIHAN = "DATA TAGIHAN"; // sheet pivot (rekap total per nasabah)
var SHEET_KAS = "KAS"; // sheet ringkasan kas (KAS, PENGELUARAN, PINJAMAN, SISA KAS)

// ⬇️ GANTI 6 BARIS INI sesuai sheet respons Form "Pinjam" kamu.
// Buka Google Sheet > cek nama tab sheet respons form, dan urutan kolomnya.
var SHEET_RIWAYAT = "DATA PEMINJAM";

var KOLOM_RIWAYAT_TIMESTAMP  = 0;   // A - Timestamp
var KOLOM_RIWAYAT_NAMA       = 1;   // B - Nama Nasabah
var KOLOM_RIWAYAT_ALASAN     = 2;   // C - Alasan Kebutuhan Meminjam
var KOLOM_RIWAYAT_JATUHTEMPO = 5;   // F - Jatuh Tempo
var KOLOM_RIWAYAT_NOMINAL    = 10;  // K - Nominal
var KOLOM_RIWAYAT_PELUNASAN  = 11;  // L - Pelunasan  (INI YANG SEBELUMNYA HILANG)


/*************************************************
 * EMAIL DANA CAIR
 *************************************************/
function kirimDanaCair() {

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  for (var i = 2; i <= lastRow; i++) {

    var nama = sheet.getRange(i, 13).getValue();   // M
    var email = sheet.getRange(i, 12).getValue();  // L
    var nominal = sheet.getRange(i, 10).getValue();// J
    var status = sheet.getRange(i, 17).getValue(); // Q

    if (status == "Dana Dicairkan") {

      var subject = "Konfirmasi Pencairan Dana";

      var body =
        "Yth. " + nama + ",\n\n" +
        "Kami informasikan bahwa dana pinjaman Anda sebesar Rp " +
        formatRupiah(nominal) +
        " telah berhasil dicairkan.\n\n" +
        "Silakan cek rekening Anda.\n\n" +
        "Terima kasih.\n\n" +
        "Koperasi Simpan Pinjam NGX";

      MailApp.sendEmail(email, subject, body);

      sheet.getRange(i, 17).setValue("Email Terkirim");
    }

  }

}


/*************************************************
 * WEB API
 *************************************************/
function doGet(e) {

  var action = (e.parameter.action || "").trim();

  // Endpoint khusus: daftar nama untuk autocomplete
  if (action == "daftarNama") {

    return jsonOutput({
      success: true,
      daftarNama: getDaftarNama()
    });

  }

  // Endpoint khusus: ringkasan Informasi Kas (real-time)
  if (action == "informasiKas") {

    return jsonOutput(getInformasiKas());

  }

  // Endpoint khusus: tabel iuran bulanan per anggota (dari sheet KAS)
  if (action == "iuranKas") {

    return jsonOutput(getIuranKas());

  }

  var nama = (e.parameter.nama || "").trim();

  var output;

  if (nama == "") {

    output = {
      success: false,
      message: "Nama kosong"
    };

  } else {

    output = {
      success: true,
      dashboard: getDashboard(),
      nasabah: getNasabahByNama(nama)
    };

  }

  return jsonOutput(output);

}


/*************************************************
 * HELPER: OUTPUT JSON
 *************************************************/
function jsonOutput(obj) {

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

}


/*************************************************
 * DAFTAR NAMA (UNTUK AUTOCOMPLETE)
 *************************************************/
function getDaftarNama() {

  var ss = SpreadsheetApp.openById(SHEET_ID);

  var sheet = ss.getSheetByName(SHEET_TAGIHAN);

  var data = sheet.getDataRange().getValues();

  var daftar = [];
  var sudahAda = {};

  for (var i = 1; i < data.length; i++) {

    var nama = String(data[i][0] || "").trim();

    if (nama == "") continue;

    var key = nama.toUpperCase();

    if (sudahAda[key]) continue;

    sudahAda[key] = true;
    daftar.push(nama);

  }

  daftar.sort();

  return daftar;

}


/*************************************************
 * FORMAT RUPIAH
 *************************************************/
function formatRupiah(angka) {

  angka = Number(angka) || 0;

  return "Rp " + angka.toLocaleString("id-ID");

}


/*************************************************
 * NORMALISASI NAMA
 *************************************************/
function normalisasiNama(teks){

  return String(teks)
    .toUpperCase()
    .trim()
    .replace(/\s+/g," ");

}


/*************************************************
 * DATA NASABAH
 *************************************************/
function getNasabahByNama(nama){

  var ss = SpreadsheetApp.openById(SHEET_ID);

  var sheet = ss.getSheetByName(SHEET_TAGIHAN);

  var data = sheet.getDataRange().getValues();

  nama = normalisasiNama(nama);

  for(var i=1;i<data.length;i++){

    var namaSheet = normalisasiNama(data[i][0]);

    if(namaSheet == nama){

      var pinjaman = Number(data[i][1]) || 0;
      var pelunasan = Number(data[i][2]) || 0;
      var sisa = Number(data[i][3]) || 0;
      var riwayat = getRiwayatTransaksi(data[i][0]);

      return {

        found:true,

        nama:data[i][0],

        pinjaman:pinjaman,
        pinjamanFormat:formatRupiah(pinjaman),

        pelunasan:pelunasan,
        pelunasanFormat:formatRupiah(pelunasan),

        sisa:sisa,
        sisaFormat:formatRupiah(sisa),

        status:sisa<=0 ? "LUNAS" : "BELUM LUNAS",

        persentase:
        pinjaman==0
        ?0
        :Math.round((pelunasan/pinjaman)*100),

        riwayat:riwayat,
        jumlahPinjam:riwayat.length

      };

    }

  }

  return{

    found:false,

    nama:nama,

    pinjaman:0,
    pinjamanFormat:"Rp 0",

    pelunasan:0,
    pelunasanFormat:"Rp 0",

    sisa:0,
    sisaFormat:"Rp 0",

    status:"DATA TIDAK DITEMUKAN",

    persentase:0,

    riwayat:[],
    jumlahPinjam:0

  };

}


/*************************************************
 * RIWAYAT TRANSAKSI PINJAMAN
 * Kolom yang dikirim ke frontend:
 *   timestampFormat  -> Timestamp
 *   nama             -> Nama Nasabah
 *   alasan           -> Alasan Kebutuhan Meminjam
 *   jatuhTempoFormat -> Jatuh Tempo
 *   nominalFormat    -> Nominal yang Diajukan
 *   pelunasanFormat  -> Pelunasan Nasabah
 *************************************************/
function getRiwayatTransaksi(nama) {

  try {

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_RIWAYAT);

    if (!sheet) return [];

    var data = sheet.getDataRange().getValues();

    var namaTarget = normalisasiNama(nama);

    var riwayat = [];

    for (var i = 1; i < data.length; i++) {

      var namaBaris = normalisasiNama(data[i][KOLOM_RIWAYAT_NAMA]);

      if (namaBaris !== namaTarget) continue;

      var ts = data[i][KOLOM_RIWAYAT_TIMESTAMP];
      var tanggal = (ts instanceof Date) ? ts : new Date(ts);
      var sortKey = (tanggal && !isNaN(tanggal.getTime())) ? tanggal.getTime() : 0;

      var nominal = Number(data[i][KOLOM_RIWAYAT_NOMINAL]) || 0;
      var pelunasan = Number(data[i][KOLOM_RIWAYAT_PELUNASAN]) || 0;

      var jatuhTempoRaw = data[i][KOLOM_RIWAYAT_JATUHTEMPO];

      riwayat.push({

        _sortKey: sortKey,

        timestampFormat: formatTanggal(tanggal),

        nama: data[i][KOLOM_RIWAYAT_NAMA] || "",

        alasan: data[i][KOLOM_RIWAYAT_ALASAN] || "-",

        jatuhTempoFormat: formatJatuhTempo(jatuhTempoRaw),

        nominal: nominal,
        nominalFormat: formatRupiah(nominal),

        pelunasan: pelunasan,
        pelunasanFormat: formatRupiah(pelunasan),

        sisaFormat: formatRupiah(Math.max(nominal - pelunasan, 0)),

        statusBaris: pelunasan >= nominal && nominal > 0 ? "LUNAS" : "BELUM LUNAS"

      });

    }

    // Urutkan dari yang terbaru berdasarkan timestamp asli (bukan string hasil format)
    riwayat.sort(function (a, b) {
      return b._sortKey - a._sortKey;
    });

    // Buang field internal sebelum dikirim ke frontend
    riwayat.forEach(function (r) {
      delete r._sortKey;
    });

    return riwayat;

  } catch (err) {

    Logger.log(err);

    return [];

  }

}


/*************************************************
 * FORMAT TANGGAL (Timestamp lengkap: tanggal + jam)
 *************************************************/
function formatTanggal(tgl){

  try {

    if (!(tgl instanceof Date) || isNaN(tgl.getTime())) return "-";

    return Utilities.formatDate(tgl, Session.getScriptTimeZone(), "dd MMM yyyy, HH:mm");

  } catch (err) {

    return "-";

  }

}


/*************************************************
 * FORMAT JATUH TEMPO (bisa berupa Date atau teks biasa)
 *************************************************/
function formatJatuhTempo(val){

  try {

    if (val instanceof Date) {

      if (isNaN(val.getTime())) return "-";

      return Utilities.formatDate(val, Session.getScriptTimeZone(), "dd MMM yyyy");

    }

    if (val === null || val === undefined || val === "") return "-";

    return String(val);

  } catch (err) {

    return "-";

  }

}


/*************************************************
 * DASHBOARD
 *************************************************/
function getDashboard(){

  var ss = SpreadsheetApp.openById(SHEET_ID);

  var sheet = ss.getSheetByName(SHEET_TAGIHAN);

  var data = sheet.getDataRange().getValues();

  var totalNasabah = 0;
  var totalPinjaman = 0;
  var totalPelunasan = 0;
  var totalSisa = 0;
  var lunas = 0;
  var belumLunas = 0;

  for(var i=1;i<data.length;i++){

    if(data[i][0]=="") continue;

    totalNasabah++;

    totalPinjaman += Number(data[i][1]) || 0;
    totalPelunasan += Number(data[i][2]) || 0;
    totalSisa += Number(data[i][3]) || 0;

    if((Number(data[i][3])||0)<=0){

      lunas++;

    }else{

      belumLunas++;

    }

  }

  return{

    totalNasabah:totalNasabah,

    totalPinjaman:totalPinjaman,
    totalPinjamanFormat:formatRupiah(totalPinjaman),

    totalPelunasan:totalPelunasan,
    totalPelunasanFormat:formatRupiah(totalPelunasan),

    totalSisa:totalSisa,
    totalSisaFormat:formatRupiah(totalSisa),

    lunas:lunas,

    belumLunas:belumLunas

  };

}

function testRiwayat(){

  var hasil = getRiwayatTransaksi("MUHAMMAD BEJA PRASETYA");
  Logger.log(JSON.stringify(hasil, null, 2));

}


/*************************************************
 * INFORMASI KAS (REAL-TIME)
 * Membaca blok ringkasan di sheet "KAS":
 *   KAS
 *   PENGELUARAN   <- label ini dipakai sebagai jangkar
 *   PINJAMAN
 *   SISA KAS
 * Pencarian berbasis TEKS label (bukan nomor baris tetap),
 * jadi tetap aman walau baris di sheet nanti bergeser.
 *************************************************/
function getInformasiKas() {

  try {

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_KAS);

    if (!sheet) {
      return { success: false, message: "Sheet '" + SHEET_KAS + "' tidak ditemukan" };
    }

    var data = sheet.getDataRange().getValues();

    var rowPengeluaran = -1;
    var colLabel = -1;

    // Cari cell berisi label "PENGELUARAN" sebagai jangkar posisi
    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].length; j++) {

        var cell = String(data[i][j] || "").trim().toUpperCase();

        if (cell === "PENGELUARAN") {
          rowPengeluaran = i;
          colLabel = j;
          break;
        }

      }
      if (rowPengeluaran !== -1) break;
    }

    if (rowPengeluaran === -1) {
      return { success: false, message: "Label 'PENGELUARAN' tidak ditemukan di sheet KAS" };
    }

    function ambilAngkaBaris(rowIdx) {

      if (rowIdx < 0 || rowIdx >= data.length) return 0;

      var row = data[rowIdx];

      for (var k = colLabel + 1; k < row.length; k++) {

        var val = row[k];

        if (typeof val === "number") return val;

        var bersih = String(val || "").replace(/[^0-9.-]/g, "");

        if (bersih !== "") {
          var num = parseFloat(bersih);
          if (!isNaN(num)) return num;
        }

      }

      return 0;

    }

    var kas = ambilAngkaBaris(rowPengeluaran - 1);        // baris "KAS"
    var pengeluaran = ambilAngkaBaris(rowPengeluaran);     // baris "PENGELUARAN"
    var pinjaman = ambilAngkaBaris(rowPengeluaran + 1);    // baris "PINJAMAN"
    var sisaKas = ambilAngkaBaris(rowPengeluaran + 2);     // baris "SISA KAS"

    return {

      success: true,

      kas: kas,
      kasFormat: formatRupiah(kas),

      pengeluaran: pengeluaran,
      pengeluaranFormat: formatRupiah(pengeluaran),

      pinjaman: pinjaman,
      pinjamanFormat: formatRupiah(pinjaman),

      sisaKas: sisaKas,
      sisaKasFormat: formatRupiah(sisaKas),

      updatedAt: new Date().toISOString()

    };

  } catch (err) {

    Logger.log(err);

    return { success: false, message: "Terjadi kesalahan saat membaca data kas" };

  }

}

function testInformasiKas(){

  Logger.log(JSON.stringify(getInformasiKas(), null, 2));

}


/*************************************************
 * TABEL IURAN BULANAN PER ANGGOTA (REAL-TIME)
 * Membaca tabel utama di sheet "KAS":
 *   Header: NAMA | JANUARI | FEBRUARI | ... | DESEMBER | TOTAL
 * Pencarian berbasis TEKS header (bukan nomor kolom/baris tetap),
 * jadi tetap aman walau kolom/baris di sheet nanti bergeser.
 * Baris "AWARD GROUP" dipisah sebagai rekap kelompok (kelompok),
 * bukan dimasukkan ke daftar anggota.
 *************************************************/
function getIuranKas() {

  try {

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_KAS);

    if (!sheet) {
      return { success: false, message: "Sheet '" + SHEET_KAS + "' tidak ditemukan" };
    }

    var data = sheet.getDataRange().getValues();

    // ===== Cari baris & kolom header "NAMA" =====
    var headerRow = -1;
    var colNama = -1;

    for (var i = 0; i < data.length; i++) {
      for (var j = 0; j < data[i].length; j++) {

        var cell = String(data[i][j] || "").trim().toUpperCase();

        if (cell === "NAMA") {
          headerRow = i;
          colNama = j;
          break;
        }

      }
      if (headerRow !== -1) break;
    }

    if (headerRow === -1) {
      return { success: false, message: "Header 'NAMA' tidak ditemukan di sheet KAS" };
    }

    // ===== Cari kolom tiap bulan & kolom TOTAL berdasarkan label header =====
    var namaBulan = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];

    var kolomBulan = [];
    var colTotal = -1;

    var headerRowData = data[headerRow];

    for (var j2 = colNama + 1; j2 < headerRowData.length; j2++) {

      var label = String(headerRowData[j2] || "").trim().toUpperCase();

      if (namaBulan.indexOf(label) !== -1) {
        kolomBulan.push({ label: headerRowData[j2], index: j2 });
      } else if (label === "TOTAL") {
        colTotal = j2;
      }

    }

    function ambilAngka(val) {
      if (typeof val === "number") return val;
      var bersih = String(val || "").replace(/[^0-9.-]/g, "");
      if (bersih === "") return 0;
      var num = parseFloat(bersih);
      return isNaN(num) ? 0 : num;
    }

    // ===== Baca baris anggota di bawah header =====
    // Baris kosong di tengah (mis. sebelum baris AWARD GROUP) dilewati saja,
    // bukan dijadikan tanda berhenti — supaya tidak salah potong tabel.
    // Yang jadi penanda akhir tabel adalah label blok berikutnya di sheet
    // (BRI, BJ, CASH FAJAR, KAS MASUK, KAS, PENGELUARAN, PINJAMAN, SISA KAS).
    var LABEL_BERHENTI = ["BRI", "BJ", "CASH FAJAR", "KAS MASUK", "KAS", "PENGELUARAN", "PINJAMAN", "SISA KAS"];

    var anggota = [];
    var kelompok = null;

    for (var r = headerRow + 1; r < data.length; r++) {

      var row = data[r];
      var namaCell = String(row[colNama] || "").trim();

      if (namaCell === "") continue; // baris kosong di tengah, lewati saja

      var namaUpper = namaCell.toUpperCase();

      if (LABEL_BERHENTI.indexOf(namaUpper) !== -1) break; // masuk blok berikutnya, berhenti

      var bulanValues = kolomBulan.map(function (b) {
        var num = ambilAngka(row[b.index]);
        return {
          label: b.label,
          nominal: num,
          nominalFormat: num > 0 ? formatRupiah(num) : "-"
        };
      });

      var total = colTotal !== -1
        ? ambilAngka(row[colTotal])
        : bulanValues.reduce(function (s, b) { return s + b.nominal; }, 0);

      var entry = {
        nama: namaCell,
        bulan: bulanValues,
        total: total,
        totalFormat: formatRupiah(total)
      };

      if (namaUpper.indexOf("AWARD") !== -1) {
        kelompok = entry;
      } else {
        anggota.push(entry);
      }

    }

    return {
      success: true,
      labelBulan: kolomBulan.map(function (b) { return b.label; }),
      anggota: anggota,
      kelompok: kelompok,
      jumlahAnggota: anggota.length
    };

  } catch (err) {

    Logger.log(err);

    return { success: false, message: "Terjadi kesalahan saat membaca tabel iuran kas" };

  }

}

function testIuranKas(){

  Logger.log(JSON.stringify(getIuranKas(), null, 2));

}
