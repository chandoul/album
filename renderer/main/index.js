const ahk = window.chrome.webview.hostObjects.sync.ahk;

const container = document.getElementById("container");
const browser = document.getElementById("browser");
const selectFolder = document.getElementById("selectfolder");
const folder = document.getElementById("folder");
const browserBody = document.getElementById("browser-body");
const selected = document.getElementById("selected");
const returnToBrowser = document.getElementById("return-to-main");
const mainPage = document.getElementsByClassName("main-page-normal")[0];
const prev = document.getElementById("prev");
const pageNum = document.getElementById("page-num");
const next = document.getElementById("next");

let book = {};
let books = [];

selectFolder.innerText = "SELECT LOCATION";
returnToBrowser.innerText = "RETURN";
prev.innerText = "PREV";
next.innerText = "NEXT";

selectFolder.addEventListener("click", async () => {
    const jsonData = ahk.selectAlbum();

    if (!jsonData) return;
    const data = JSON.parse(jsonData);

    if (data.cover) {
        document.body.style.backgroundImage = `url('${data.cover}')`;
    }

    books = [];
    browserBody.innerHTML = "";
    folder.textContent = data.folder;
    for (const [i, value] of data.previews.entries()) {
        const container = document.createElement("div");
        container.classList.add("thumb-container");

        const opts = document.createElement("div");
        opts.classList.add("thumb-options");

        const sli = document.createElement("button");
        sli.classList.add("sli-option");
        sli.src = value.location;
        sli.addEventListener("click", (event) => {
            item = event.target;
            ahk.sliAlbum(item.src);
        });

        const rem = document.createElement("button");
        rem.classList.add("rem-option");
        rem.src = value.location;
        rem.addEventListener("click", (event) => {
            item = event.target;
            if (ahk.remAlbum(item.src)) {
                item.parentNode.parentNode.classList.add("hide-album");
            }
        });

        const img = document.createElement("img");
        img.classList.add("thumb");
        img.addEventListener("click", (event) => showAlbum(event.target));
        img.src = value.preview;

        const clr = document.createElement("button");
        clr.classList.add("clr-option");
        clr.src = value.location;
        clr.img = img;
        clr.addEventListener("click", (event) => {
            const item = event.target;
            const preview = ahk.clearAlbum(item.src);
            if (preview) {
                item.img.src = preview;
            }
        });

        const ope = document.createElement("button");
        ope.classList.add("ope-option");
        ope.src = value.location;
        ope.addEventListener("click", (event) => {
            const item = event.target;
            ahk.openAlbum(item.src)
        });

        opts.appendChild(ope);
        opts.appendChild(clr);
        opts.appendChild(sli);
        opts.appendChild(rem);

        container.appendChild(opts);
        container.appendChild(img);
        browserBody.appendChild(container);
        books.push(img);
    }
});

function remAlbum(item) {
    if (ahk.remAlbum(item.src)) {
        item.parentNode.classList.add("hide-album");
    }
}

function showAlbum(item) {
    localStorage.setItem("scrollPosition", window.scrollY);

    folder.style.display = "none";
    browser.style.display = "none";
    selected.style.display = "grid";
    selectFolder.style.display = "none";
    returnToBrowser.style.display = "block";

    //const zipPath = item.path;
    const jsonAlbum = ahk.loadAlbum(item.src);
    const album = JSON.parse(jsonAlbum);

    pageNum.innerHTML = "";
    for (const [i, name] of album.pages.entries()) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.innerHTML = i;
        pageNum.appendChild(opt);
    }
    pageNum.selectedIndex = 0;

    if (album.pages[0]) {
        mainPage.src = album.pages[0];
        window.scroll({
            top: 50,
            behavior: "smooth",
        });
    }

    book = {
        pages: album.pages,
        currentPage: 0,
        pagesCount: album.pages.length,
        pagesLastIndex: album.pages.length - 1,
    };
}

returnToBrowser.addEventListener("click", () => {
    folder.style.display = "block";
    browser.style.display = "grid";
    selected.style.display = "none";
    selectFolder.style.display = "block";
    returnToBrowser.style.display = "none";
    mainPage.src = "";
    const savedPosition = localStorage.getItem("scrollPosition");
    if (savedPosition) {
        window.scroll({
            top: parseInt(savedPosition),
        });
    }
    book = {};
});

next.addEventListener("click", async () => {
    if (!book.pagesCount) return;
    book.currentPage++;
    if (book.currentPage > book.pagesLastIndex) book.currentPage = 0;
    pageNum.selectedIndex = book.currentPage;
    mainPage.src = book.pages[book.currentPage];
    window.scroll({
        top: 50,
        behavior: "smooth",
    });
});

prev.addEventListener("click", async () => {
    if (!book.pagesCount) return;
    book.currentPage--;
    if (book.currentPage < 0) book.currentPage = book.pagesLastIndex;
    pageNum.selectedIndex = book.currentPage;
    mainPage.src = book.pages[book.currentPage];
    window.scroll({
        top: 50,
        behavior: "smooth",
    });
});

pageNum.addEventListener("change", async () => {
    if (!book.pagesCount) return;
    book.currentPage = pageNum.value;
    mainPage.src = book.pages[book.currentPage];
    window.scroll({
        top: 50,
        behavior: "smooth",
    });
});

var fullscreen = false;
mainPage.addEventListener("click", (e) => {
    if (e.ctrlKey) {
        fullscreen = !fullscreen;
        if (fullscreen) {
            enterFullscreen(e.target);
            mainPage.classList.remove("main-page-normal");
            mainPage.classList.add("main-page-fullscreen");
        } else {
            exitFullscreen(e.target);
            mainPage.classList.add("main-page-normal");
            mainPage.classList.remove("main-page-fullscreen");
        }
        return;
    }
    const rect = mainPage.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) prev.click();
    if (clickX > rect.width / 2) next.click();
});

function enterFullscreen(el) {
    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) {
        // older WebKit
        el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
        // old Edge
        el.msRequestFullscreen();
    }
}
function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

mainPage.addEventListener("mousemove", (e) => {
    const rect = mainPage.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (!mainPage.classList.contains("left") && clickX < rect.width / 2) {
        mainPage.classList.add("left");
        mainPage.classList.remove("right");
    }
    if (!mainPage.classList.contains("right") && clickX > rect.width / 2) {
        mainPage.classList.add("right");
        mainPage.classList.remove("left");
    }
});

function observeVisibility(element, callback, options = {}) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            callback(entry.isIntersecting, entry.target, entry);
        });
    }, options);

    observer.observe(element);
    return observer;
}

var showback = false;
document.body.addEventListener("click", (e) => {
    if (e.target.id != "container") return;
    showback = !showback;
    if (showback) {
        if (book.pages) {
            selected.style.display = "none";
            returnToBrowser.style.display = "none";
        } else {
            folder.style.display = "none";
            browser.style.display = "none";
            selectFolder.style.display = "none";
        }
    } else {
        if (book.pages) {
            selected.style.display = "grid";
            returnToBrowser.style.display = "block";
        } else {
            folder.style.display = "block";
            browser.style.display = "grid";
            selectFolder.style.display = "block";
        }
    }
});
