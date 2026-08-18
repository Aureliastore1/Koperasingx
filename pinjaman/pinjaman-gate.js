(function () {

    var NGX_PINJ_API_URL = "https://script.google.com/macros/s/AKfycbwTetWJfA0huK9CkSgx27TEjbovKO46dQepkwQ0nlXJ39f17MmAjTvw3ZQ8je9T7BTH/exec";

    var loadingBox = document.getElementById("pinjLoading");
    var errorBox = document.getElementById("pinjError");
    var boxOn = document.getElementById("pinjOn");
    var boxOff = document.getElementById("pinjOff");

    fetch(NGX_PINJ_API_URL + "?action=pengaturanPinjaman")
        .then(function (res) { return res.json(); })
        .then(function (data) {

            loadingBox.classList.add("hidden");

            if (!data || data.success !== true) {
                errorBox.classList.remove("hidden");
                return;
            }

            if (data.status === "OFF") {

                document.getElementById("pesanOffText").textContent = data.pesanOff;
                document.getElementById("saldoPinjamanText").textContent = data.saldoPinjamanFormat;
                boxOff.classList.remove("hidden");

            } else {

                document.getElementById("linkGoogleForm").setAttribute("href", data.linkGoogleForm);
                boxOn.classList.remove("hidden");

            }

            if (window.lucide) lucide.createIcons();

        })
        .catch(function () {
            loadingBox.classList.add("hidden");
            errorBox.classList.remove("hidden");
        });

})();
