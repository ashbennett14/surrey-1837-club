const loginForm = document.querySelector("#loginForm");
const loginError = document.querySelector("#loginError");
const validPasswords = ["SurreyLightBlue", 'S"urreyLightBlue'];

function getRedirectUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("redirect") || "index.html";
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = document.querySelector("#username").value.trim();
  const password = document.querySelector("#password").value;

  if (username === "1837Member" && validPasswords.includes(password)) {
    sessionStorage.setItem("surrey1837Authenticated", "true");
    window.location.href = getRedirectUrl();
    return;
  }

  loginError.textContent = "Please check the username and password.";
});
