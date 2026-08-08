(function () {
  const isLoggedIn = sessionStorage.getItem("surrey1837Authenticated") === "true";

  if (!isLoggedIn) {
    window.location.replace(`login.html?redirect=${encodeURIComponent(window.location.href)}`);
  }
})();
